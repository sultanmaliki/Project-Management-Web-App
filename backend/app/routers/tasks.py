from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..database import get_db
from ..deps import MANAGERS, PathId, get_current_user, get_visible_task, require_manager
from ..models import Project, Task, TaskStatus, User
from .projects import validate_assignee

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/mine", response_model=list[schemas.MyTaskOut])
def my_tasks(
    status_filter: TaskStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Tasks assigned to the current user, soonest deadline first."""
    stmt = (
        select(Task)
        .options(joinedload(Task.assignee), joinedload(Task.project))
        .where(Task.assignee_id == user.id)
        .order_by(Task.deadline.is_(None), Task.deadline, Task.id)
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    return [
        schemas.MyTaskOut(**schemas.TaskOut.model_validate(t).model_dump(), project_title=t.project.title)
        for t in db.scalars(stmt)
    ]


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: PathId, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_visible_task(db, user, task_id)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: PathId,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Managers/admins may edit any field. A developer may only change the *status* of their own tasks."""
    task = get_visible_task(db, user, task_id)
    changes = payload.model_dump(exclude_unset=True)

    if user.role not in MANAGERS:
        if task.assignee_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only update tasks assigned to you")
        if set(changes) - {"status"}:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only change the status of your tasks")

    if "assignee_id" in changes:
        validate_assignee(db, changes["assignee_id"])
    if "description" in changes:
        changes["description"] = changes["description"] or None
    for field, value in changes.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: PathId, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    task = get_visible_task(db, user, task_id)
    db.delete(task)
    db.commit()


@dashboard_router.get("", response_model=schemas.DashboardStats)
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Headline numbers. Managers/admins see everything; developers see their own tasks."""
    is_manager = user.role in MANAGERS
    scope = [] if is_manager else [Task.assignee_id == user.id]

    by_status = dict(db.execute(select(Task.status, func.count(Task.id)).where(*scope).group_by(Task.status)).all())
    overdue = db.scalar(
        select(func.count(Task.id)).where(*scope, Task.status != TaskStatus.done, Task.deadline < date.today())
    )
    if is_manager:
        project_count = db.scalar(select(func.count(Project.id)))
    else:
        project_count = db.scalar(select(func.count(func.distinct(Task.project_id))).where(*scope))

    return schemas.DashboardStats(
        project_count=project_count or 0,
        total_tasks=sum(by_status.values()),
        todo=by_status.get(TaskStatus.todo, 0),
        in_progress=by_status.get(TaskStatus.in_progress, 0),
        done=by_status.get(TaskStatus.done, 0),
        overdue=overdue or 0,
    )
