"""Test fixtures. Settings are pinned through the environment *before* the app is imported so the tests
never touch a real database, the developer's .env file, or the Groq API."""

import os

os.environ.update(
    ENVIRONMENT="test",
    DATABASE_URL=os.environ.get("TEST_DATABASE_URL", "sqlite://"),  # CI also runs the suite on PostgreSQL
    SECRET_KEY="test-secret-key-that-is-long-enough-0123456789",
    BCRYPT_ROUNDS="4",  # fast hashing for tests
    GROQ_API_KEY="",
    BOOTSTRAP_ADMIN_EMAIL="",
    BOOTSTRAP_ADMIN_PASSWORD="",
    ALLOW_SIGNUP="true",
    RATE_LIMIT_ENABLED="false",
)

from dataclasses import dataclass  # noqa: E402
from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Project, Task, User, UserRole  # noqa: E402
from app.ratelimit import reset_rate_limits  # noqa: E402
from app.routers.ai import get_ai_client  # noqa: E402
from app.security import create_access_token, hash_password  # noqa: E402

PASSWORD = "correct-horse-battery"


@dataclass
class Actor:
    id: int
    email: str
    headers: dict


@pytest.fixture(autouse=True)
def _clean_state():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    reset_rate_limits()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def settings():
    """The live settings object; tests may tweak fields via monkeypatch.setattr."""
    return get_settings()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_user(settings):
    def _make(
        role: UserRole = UserRole.developer, email: str | None = None, name: str | None = None, active: bool = True
    ) -> Actor:
        with SessionLocal() as db:
            n = db.query(User).count() + 1
            user = User(
                name=name or f"{role.value.title()} {n}",
                email=email or f"{role.value}{n}@example.com",
                role=role,
                hashed_password=hash_password(PASSWORD, 4),
                is_active=active,
            )
            db.add(user)
            db.commit()
            token = create_access_token(user.id, settings)
            return Actor(user.id, user.email, {"Authorization": f"Bearer {token}"})

    return _make


@pytest.fixture
def admin(make_user):
    return make_user(UserRole.admin)


@pytest.fixture
def manager(make_user):
    return make_user(UserRole.manager)


@pytest.fixture
def dev(make_user):
    return make_user(UserRole.developer)


@pytest.fixture
def make_project():
    def _make(owner: Actor | None = None, title: str = "Apollo") -> int:
        with SessionLocal() as db:
            project = Project(title=title, owner_id=owner.id if owner else None)
            db.add(project)
            db.commit()
            return project.id

    return _make


@pytest.fixture
def make_task():
    def _make(project_id: int, assignee: Actor | None = None, **fields) -> int:
        with SessionLocal() as db:
            task = Task(
                project_id=project_id,
                assignee_id=assignee.id if assignee else None,
                **{"title": "Write docs", **fields},
            )
            db.add(task)
            db.commit()
            return task.id

    return _make


class FakeGroq:
    """Stands in for the Groq client; records calls and returns/raises whatever the test configures."""

    def __init__(self, content: str | None = None, error: Exception | None = None):
        self.calls: list[dict] = []
        self._content, self._error = content, error
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=self._content))])


@pytest.fixture
def fake_ai():
    def _install(content: str | None = None, error: Exception | None = None) -> FakeGroq:
        fake = FakeGroq(content, error)
        app.dependency_overrides[get_ai_client] = lambda: fake
        return fake

    return _install
