from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas
from ..config import Settings, get_settings
from ..database import get_db
from ..deps import PathId, require_admin, require_manager
from ..models import Task, User, UserRole
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _other_active_admins(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.admin, User.is_active.is_(True), User.id != user.id)
    )


def _ensure_not_last_admin(db: Session, user: User) -> None:
    if user.role == UserRole.admin and user.is_active and _other_active_admins(db, user) == 0:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="There must be at least one active administrator")


@router.get("", response_model=list[schemas.UserListItem])
def list_users(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    """List users with their workload (needed to assign tasks). Admins and managers only."""
    counts = (
        select(
            Task.assignee_id.label("uid"),
            func.count(Task.id).label("tasks"),
            func.count(func.distinct(Task.project_id)).label("projects"),
        )
        .where(Task.assignee_id.is_not(None))
        .group_by(Task.assignee_id)
        .subquery()
    )
    rows = db.execute(
        select(User, counts.c.tasks, counts.c.projects)
        .outerjoin(counts, counts.c.uid == User.id)
        .order_by(User.name, User.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return [
        schemas.UserListItem(
            **schemas.UserOut.model_validate(user).model_dump(), task_count=tasks or 0, project_count=projects or 0
        )
        for user, tasks, projects in rows
    ]


@router.post("", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _: User = Depends(require_admin),
):
    user = User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        hashed_password=hash_password(payload.password, settings.bcrypt_rounds),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered") from None
    return user


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: PathId, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _get_user_or_404(db, user_id)


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: PathId,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    admin: User = Depends(require_admin),
):
    user = _get_user_or_404(db, user_id)
    changes = payload.model_dump(exclude_unset=True)

    demoting = ("role" in changes and changes["role"] != UserRole.admin) or changes.get("is_active") is False
    if demoting:
        _ensure_not_last_admin(db, user)
    if user.id == admin.id and demoting:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You cannot demote or deactivate your own account")

    if "password" in changes:
        user.hashed_password = hash_password(changes.pop("password"), settings.bcrypt_rounds)
    for field, value in changes.items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered") from None
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: PathId, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Delete a user. Their tasks become unassigned; projects they owned keep existing without an owner."""
    user = _get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You cannot delete your own account")
    _ensure_not_last_admin(db, user)
    db.delete(user)
    db.commit()
