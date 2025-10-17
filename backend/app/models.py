from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
import enum

from .database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    developer = "developer"

class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in-progress"
    done = "done"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    role = Column(SQLAlchemyEnum(UserRole))
    hashed_password = Column(String)
    tasks = relationship("Task", back_populates="assignee")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(TaskStatus), default=TaskStatus.todo)
    deadline = Column(Date)
    project_id = Column(Integer, ForeignKey("projects.id"))
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")