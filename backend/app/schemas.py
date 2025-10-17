from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from .models import UserRole, TaskStatus

class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: date
    status: TaskStatus = TaskStatus.todo

class TaskCreate(TaskBase):
    assignee_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[int] = None

class Task(TaskBase):
    id: int
    project_id: int
    assignee: Optional[User] = None
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    tasks: List[Task] = []
    class Config:
        from_attributes = True