"""Shared FastAPI dependencies: authentication and role-based access control."""

from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import get_db
from .models import Project, Task, User, UserRole
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

MANAGERS = (UserRole.admin, UserRole.manager)

# Primary keys are 32-bit ints; anything outside that range can never exist (and would overflow the driver).
MAX_ID = 2_147_483_647
PathId = Annotated[int, Path(ge=1, le=MAX_ID)]


def _unauthorized() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    """Resolve the bearer token to an active user. The DB is consulted on every request so that
    deactivated/deleted users and role changes take effect immediately."""
    if credentials is None:
        raise _unauthorized()
    user_id = decode_access_token(credentials.credentials, settings)
    if user_id is None:
        raise _unauthorized()
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized()
    return user


def require_roles(*roles: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to do that")
        return user

    return dependency


require_admin = require_roles(UserRole.admin)
require_manager = require_roles(*MANAGERS)


def can_view_project(user: User, project: Project) -> bool:
    """Admins and managers see every project; developers only those with a task assigned to them."""
    if user.role in MANAGERS:
        return True
    return any(task.assignee_id == user.id for task in project.tasks)


def get_visible_project(db: Session, user: User, project_id: int) -> Project:
    """Load a project the user may see, or raise 404 (also for hidden ones, to avoid leaking existence)."""
    project = db.get(Project, project_id)
    if project is None or not can_view_project(user, project):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def get_visible_task(db: Session, user: User, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None or not can_view_project(user, task.project):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task
