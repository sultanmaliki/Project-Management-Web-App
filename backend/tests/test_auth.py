from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.database import SessionLocal
from app.models import User, UserRole
from app.security import ALGORITHM
from tests.conftest import PASSWORD

SIGNUP = {"name": "Ada Lovelace", "email": "ada@example.com", "password": "analytical-engine"}


def login(client, email, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


# ------------------------------------------------------------------ signup
def test_signup_creates_developer_and_returns_working_token(client):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "developer" and body["token_type"] == "bearer"
    assert "password" not in body["user"] and "hashed_password" not in body["user"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == "ada@example.com"


@pytest.mark.parametrize("role", ["admin", "manager"])
def test_signup_cannot_self_assign_a_privileged_role(client, role):
    r = client.post("/api/auth/signup", json={**SIGNUP, "role": role})
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "developer"
    with SessionLocal() as db:
        assert db.query(User).one().role == UserRole.developer


def test_signup_stores_a_hash_not_the_password(client):
    client.post("/api/auth/signup", json=SIGNUP)
    with SessionLocal() as db:
        stored = db.query(User).one().hashed_password
    assert stored != SIGNUP["password"] and stored.startswith("$2")


def test_signup_email_is_normalized_and_unique_case_insensitively(client):
    assert client.post("/api/auth/signup", json={**SIGNUP, "email": "  Ada@Example.COM "}).status_code == 201
    dup = client.post("/api/auth/signup", json={**SIGNUP, "email": "ADA@example.com"})
    assert dup.status_code == 409
    with SessionLocal() as db:
        assert db.query(User).one().email == "ada@example.com"


@pytest.mark.parametrize(
    "patch",
    [
        {"password": "short"},  # < 8 chars
        {"password": "x" * 73},  # bcrypt limit
        {"password": "é" * 40},  # 80 bytes though only 40 chars
        {"password": " " * 10},  # blank
        {"email": "not-an-email"},
        {"email": ""},
        {"name": ""},
        {"name": "   "},
        {"name": "n" * 101},
    ],
)
def test_signup_rejects_invalid_input(client, patch):
    assert client.post("/api/auth/signup", json={**SIGNUP, **patch}).status_code == 422


def test_signup_can_be_disabled(client, monkeypatch, settings):
    monkeypatch.setattr(settings, "allow_signup", False)
    assert client.get("/api/auth/config").json() == {"allow_signup": False}
    assert client.post("/api/auth/signup", json=SIGNUP).status_code == 403


def test_signup_is_rate_limited(client, monkeypatch, settings):
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    codes = [
        client.post("/api/auth/signup", json={**SIGNUP, "email": f"u{i}@example.com"}).status_code for i in range(7)
    ]
    assert codes[:5] == [201] * 5 and codes[5:] == [429, 429]


# ------------------------------------------------------------------ login
def test_login_success(client, dev):
    r = login(client, dev.email)
    assert r.status_code == 200
    assert r.json()["user"]["id"] == dev.id and r.json()["access_token"]


def test_login_email_is_case_insensitive(client, dev):
    assert login(client, dev.email.upper()).status_code == 200


def test_login_failures_are_indistinguishable(client, dev):
    wrong_password = login(client, dev.email, "wrong-password")
    unknown_user = login(client, "nobody@example.com")
    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json()
    assert wrong_password.headers["www-authenticate"] == "Bearer"


def test_inactive_user_cannot_log_in(client, make_user):
    ghost = make_user(active=False)
    assert login(client, ghost.email).status_code == 401


def test_overlong_password_is_a_401_not_a_500(client, dev):
    assert login(client, dev.email, "p" * 200).status_code == 401


@pytest.mark.parametrize("body", [{}, {"email": "a@b.co"}, {"password": "x"}, {"email": "", "password": ""}])
def test_login_validates_payload(client, body):
    assert client.post("/api/auth/login", json=body).status_code == 422


@pytest.mark.parametrize("payload", ["' OR '1'='1", "admin@example.com' --", '"; DROP TABLE users; --'])
def test_login_is_not_sql_injectable(client, dev, payload):
    assert login(client, payload, payload).status_code == 401
    assert login(client, dev.email).status_code == 200  # table still intact


def test_login_is_rate_limited(client, dev, monkeypatch, settings):
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    codes = [login(client, dev.email, "wrong-password").status_code for _ in range(12)]
    assert codes[:10] == [401] * 10
    assert codes[10:] == [429, 429]
    blocked = login(client, dev.email)  # even the right password is refused while limited
    assert blocked.status_code == 429 and int(blocked.headers["retry-after"]) >= 1


# ------------------------------------------------------------------ token handling
def test_protected_routes_require_a_token(client):
    for path in ("/api/auth/me", "/api/projects", "/api/users", "/api/tasks/mine", "/api/dashboard"):
        r = client.get(path)
        assert r.status_code == 401, path
        assert r.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("header", ["Bearer garbage", "Bearer ", "Basic abc", "token"])
def test_bad_authorization_headers_are_rejected(client, header):
    assert client.get("/api/auth/me", headers={"Authorization": header}).status_code == 401


def test_expired_token_is_rejected(client, dev, settings):
    past = datetime.now(UTC) - timedelta(hours=1)
    token = jwt.encode(
        {"sub": str(dev.id), "iat": past, "exp": past + timedelta(minutes=5)}, settings.secret_key, algorithm=ALGORITHM
    )
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_token_of_deleted_user_stops_working(client, dev):
    assert client.get("/api/auth/me", headers=dev.headers).status_code == 200
    with SessionLocal() as db:
        db.delete(db.get(User, dev.id))
        db.commit()
    assert client.get("/api/auth/me", headers=dev.headers).status_code == 401


def test_token_of_deactivated_user_stops_working(client, dev):
    with SessionLocal() as db:
        db.get(User, dev.id).is_active = False
        db.commit()
    assert client.get("/api/auth/me", headers=dev.headers).status_code == 401


def test_role_change_takes_effect_immediately_without_new_token(client, dev):
    assert client.get("/api/users", headers=dev.headers).status_code == 403
    with SessionLocal() as db:
        db.get(User, dev.id).role = UserRole.manager
        db.commit()
    assert client.get("/api/users", headers=dev.headers).status_code == 200


# ------------------------------------------------------------------ change password
def test_change_password(client, dev):
    r = client.post(
        "/api/auth/change-password",
        headers=dev.headers,
        json={"current_password": PASSWORD, "new_password": "a-brand-new-pass"},
    )
    assert r.status_code == 204
    assert login(client, dev.email, PASSWORD).status_code == 401
    assert login(client, dev.email, "a-brand-new-pass").status_code == 200


def test_change_password_requires_current_password(client, dev):
    r = client.post(
        "/api/auth/change-password",
        headers=dev.headers,
        json={"current_password": "wrong", "new_password": "a-brand-new-pass"},
    )
    assert r.status_code == 400
    assert login(client, dev.email, PASSWORD).status_code == 200


def test_change_password_enforces_policy_and_auth(client, dev):
    weak = client.post(
        "/api/auth/change-password", headers=dev.headers, json={"current_password": PASSWORD, "new_password": "short"}
    )
    assert weak.status_code == 422
    anon = client.post(
        "/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "a-brand-new-pass"}
    )
    assert anon.status_code == 401
