"""Populate a database with demo users, a project and tasks so the UI has something to show.

    python -m app.seed

DEVELOPMENT ONLY: it creates accounts with well-known passwords, so it refuses to run when
ENVIRONMENT=production. Running it twice is safe (existing demo users are left alone).
"""

import sys
from datetime import date, timedelta

from sqlalchemy import select

from .config import get_settings
from .database import Base, SessionLocal, engine
from .models import Project, Task, TaskPriority, TaskStatus, User, UserRole
from .security import hash_password

DEMO_PASSWORD = "demo-password-1"
USERS = [
    ("Ada Admin", "admin@demo.projectflow.dev", UserRole.admin),
    ("Mona Manager", "manager@demo.projectflow.dev", UserRole.manager),
    ("Dev Dana", "dana@demo.projectflow.dev", UserRole.developer),
    ("Dev Sam", "sam@demo.projectflow.dev", UserRole.developer),
]


def seed() -> None:
    settings = get_settings()
    if settings.is_production:
        sys.exit("Refusing to seed demo data with ENVIRONMENT=production.")
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        users: dict[str, User] = {}
        for name, email, role in USERS:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    name=name,
                    email=email,
                    role=role,
                    hashed_password=hash_password(DEMO_PASSWORD, settings.bcrypt_rounds),
                )
                db.add(user)
            users[email] = user
        db.flush()

        if db.scalar(select(Project).where(Project.title == "Website Redesign")) is None:
            manager, dana, sam = (
                users[e]
                for e in ("manager@demo.projectflow.dev", "dana@demo.projectflow.dev", "sam@demo.projectflow.dev")
            )
            today = date.today()
            project = Project(title="Website Redesign", description="Refresh the marketing site.", owner_id=manager.id)
            project.tasks = [
                Task(
                    title="Audit current pages",
                    status=TaskStatus.done,
                    priority=TaskPriority.low,
                    assignee_id=dana.id,
                    deadline=today - timedelta(days=3),
                ),
                Task(
                    title="Design new landing page",
                    status=TaskStatus.in_progress,
                    priority=TaskPriority.high,
                    assignee_id=dana.id,
                    deadline=today + timedelta(days=4),
                ),
                Task(
                    title="Set up CI for the site",
                    status=TaskStatus.todo,
                    priority=TaskPriority.medium,
                    assignee_id=sam.id,
                    deadline=today - timedelta(days=1),
                ),
                Task(title="Write launch announcement", status=TaskStatus.todo, priority=TaskPriority.low),
            ]
            db.add(project)
        db.commit()

    print(f"Seeded demo data. Log in with any of these emails and password '{DEMO_PASSWORD}':")
    for _, email, role in USERS:
        print(f"  {role.value:<9} {email}")


if __name__ == "__main__":
    seed()
