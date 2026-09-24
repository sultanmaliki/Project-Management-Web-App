from datetime import date, datetime
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

from .deps import MAX_ID
from .models import TaskPriority, TaskStatus, UserRole
from .security import MAX_PASSWORD_BYTES


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _check_password(value: str) -> str:
    if len(value.encode()) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes")
    if not value.strip():
        raise ValueError("Password must not be blank")
    return value


Email = Annotated[EmailStr, AfterValidator(_normalize_email)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Password = Annotated[str, Field(min_length=8, max_length=MAX_PASSWORD_BYTES), AfterValidator(_check_password)]
AssigneeId = Annotated[int, Field(ge=1, le=MAX_ID)]
OptionalText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- users / auth
class UserOut(_ORM):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool


class UserBrief(_ORM):
    id: int
    name: str


class UserListItem(UserOut):
    project_count: int = 0
    task_count: int = 0


class UserCreate(BaseModel):
    name: PersonName
    email: Email
    password: Password
    role: UserRole = UserRole.developer


class UserUpdate(BaseModel):
    name: PersonName | None = None
    email: Email | None = None
    password: Password | None = None
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("name", "email", "role", "is_active")
    @classmethod
    def _not_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class SignupRequest(BaseModel):
    name: PersonName
    email: Email
    password: Password


class LoginRequest(BaseModel):
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=254)]
    password: Annotated[str, Field(min_length=1, max_length=256)]


class ChangePasswordRequest(BaseModel):
    current_password: Annotated[str, Field(min_length=1, max_length=256)]
    new_password: Password


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token type, not a secret
    user: UserOut


class AuthConfig(BaseModel):
    allow_signup: bool


# ---------------------------------------------------------------- tasks
TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class TaskCreate(BaseModel):
    title: TaskTitle
    description: OptionalText | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    deadline: date | None = None
    assignee_id: AssigneeId | None = None


class TaskUpdate(BaseModel):
    """Partial update: only fields present in the request body are changed (explicit null clears)."""

    title: TaskTitle | None = None
    description: OptionalText | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    deadline: date | None = None
    assignee_id: AssigneeId | None = None

    @field_validator("title", "status", "priority")
    @classmethod
    def _not_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class TaskOut(_ORM):
    id: int
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    deadline: date | None
    project_id: int
    assignee: UserBrief | None
    created_at: datetime


class MyTaskOut(TaskOut):
    project_title: str


# ---------------------------------------------------------------- projects
ProjectTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
ProjectDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class ProjectCreate(BaseModel):
    title: ProjectTitle
    description: ProjectDescription | None = None


class ProjectUpdate(BaseModel):
    title: ProjectTitle | None = None
    description: ProjectDescription | None = None

    @field_validator("title")
    @classmethod
    def _not_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class ProjectSummary(_ORM):
    id: int
    title: str
    description: str | None
    owner_id: int | None
    created_at: datetime
    task_count: int
    done_count: int
    progress: int = Field(ge=0, le=100)
    team: list[UserBrief]


class ProjectDetail(ProjectSummary):
    tasks: list[TaskOut]


class DashboardStats(BaseModel):
    project_count: int
    total_tasks: int
    todo: int
    in_progress: int
    done: int
    overdue: int


# ---------------------------------------------------------------- AI
class UserStoryRequest(BaseModel):
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=4000)]


class UserStory(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    priority: TaskPriority = TaskPriority.medium


class UserStoriesResponse(BaseModel):
    stories: list[UserStory]
