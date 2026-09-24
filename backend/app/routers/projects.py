from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..database import get_db
from ..deps import MANAGERS, PathId, get_current_user, get_visible_project, require_manager
from ..models import Project, Task, TaskStatus, User, UserRole

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def summarize(project: Project) -> dict:
    """Derived fields shared by the list and detail responses."""
    tasks = project.tasks
    done = sum(1 for t in tasks if t.status == TaskStatus.done)
    team = {t.assignee.id: t.assignee for t in tasks if t.assignee is not None}
    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "task_count": len(tasks),
        "done_count": done,
        "progress": round(done * 100 / len(tasks)) if tasks else 0,
        "team": sorted(team.values(), key=lambda u: (u.name.lower(), u.id)),
    }


def validate_assignee(db: Session, assignee_id: int | None) -> None:
    if assignee_id is None:
        return
    assignee = db.get(User, assignee_id)
    if assignee is None or not assignee.is_active:
        raise HTTPException(422, detail="Assignee does not exist or is inactive")


def _load_options():
    return selectinload(Project.tasks).selectinload(Task.assignee)


@router.get("", response_model=list[schemas.ProjectSummary])
def list_projects(
    q: str | None = Query(None, max_length=100, description="Filter by title"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Project).options(_load_options()).order_by(Project.id.desc()).limit(limit).offset(offset)
    if user.role not in MANAGERS:
        stmt = stmt.where(Project.tasks.any(Task.assignee_id == user.id))
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
        stmt = stmt.where(Project.title.ilike(f"%{escaped}%", escape="\\"))
    return [summarize(p) for p in db.scalars(stmt)]


@router.post("", response_model=schemas.ProjectSummary, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate, db: Session = Depends(get_db), user: User = Depends(require_manager)
):
    project = Project(title=payload.title, description=payload.description or None, owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return summarize(project)


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def get_project(project_id: PathId, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = get_visible_project(db, user, project_id)
    return {**summarize(project), "tasks": project.tasks}


@router.patch("/{project_id}", response_model=schemas.ProjectSummary)
def update_project(
    project_id: PathId,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_manager),
):
    project = get_visible_project(db, user, project_id)
    changes = payload.model_dump(exclude_unset=True)
    if "description" in changes:
        changes["description"] = changes["description"] or None
    for field, value in changes.items():
        setattr(project, field, value)
    db.commit()
    return summarize(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: PathId, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    """Admins can delete any project; managers only the ones they own."""
    project = get_visible_project(db, user, project_id)
    if user.role != UserRole.admin and project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the project owner or an admin can delete it")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: PathId,
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_manager),
):
    project = get_visible_project(db, user, project_id)
    validate_assignee(db, payload.assignee_id)
    task = Task(**payload.model_dump(), project_id=project.id)
    task.description = task.description or None
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
