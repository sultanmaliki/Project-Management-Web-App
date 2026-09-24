import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.database import SessionLocal
from app.main import create_app, ensure_bootstrap_admin
from app.models import User, UserRole


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_security_headers(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert "strict-transport-security" not in r.headers  # only in production


def test_api_responses_are_not_cacheable(client, dev):
    assert client.get("/api/auth/me", headers=dev.headers).headers["cache-control"] == "no-store"


def test_unknown_api_route_is_json_404(client):
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404 and r.json() == {"detail": "Not Found"}


def test_unhandled_errors_do_not_leak_details(dev):
    app = create_app()

    @app.get("/boom")
    def boom():
        raise RuntimeError("secret internal detail")

    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/boom")
    assert r.status_code == 500 and r.json() == {"detail": "Internal server error"}
    assert "secret" not in r.text


def test_openapi_documents_bearer_auth_on_protected_routes(client):
    spec = client.get("/openapi.json").json()
    assert "HTTPBearer" in spec["components"]["securitySchemes"]
    assert spec["paths"]["/api/projects"]["get"]["security"]


# ------------------------------------------------------------------ CORS
def test_cors_allows_configured_origin_only(client):
    ok = client.options(
        "/api/projects", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"}
    )
    assert ok.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-credentials" not in ok.headers
    evil = client.options(
        "/api/projects", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"}
    )
    assert "access-control-allow-origin" not in evil.headers


def test_cors_rejects_unlisted_methods(client):
    r = client.options(
        "/api/projects", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT"}
    )
    assert r.status_code == 400


# ------------------------------------------------------------------ static frontend
@pytest.fixture
def spa_client(tmp_path):
    (tmp_path / "index.html").write_text("<html>SPA</html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    app = create_app(Settings(_env_file=None, environment="test", secret_key="k" * 40, static_dir=str(tmp_path)))
    with TestClient(app) as c:
        yield c


def test_spa_serves_index_assets_and_client_routes(spa_client):
    assert "SPA" in spa_client.get("/").text
    assert "console.log" in spa_client.get("/assets/app.js").text
    deep = spa_client.get("/projects/42")
    assert deep.status_code == 200 and "SPA" in deep.text  # client-side route survives a refresh


def test_spa_fallback_never_swallows_api_or_health(spa_client):
    r = spa_client.get("/api/nope")
    assert r.status_code == 404 and r.headers["content-type"] == "application/json"
    assert spa_client.get("/health").json() == {"status": "ok"}


def test_static_serving_blocks_path_traversal(spa_client):
    r = spa_client.get("/..%2f..%2fetc/passwd")
    assert "root:" not in r.text
    assert "SPA" in r.text or r.status_code in (400, 404)


# ------------------------------------------------------------------ bootstrap admin
def bootstrap_settings(**kw):
    return Settings(
        _env_file=None,
        environment="test",
        secret_key="k" * 40,
        bcrypt_rounds=4,
        bootstrap_admin_email="Root@Example.com",
        bootstrap_admin_password="a-strong-secret",
        **kw,
    )


def test_bootstrap_admin_is_created_once_and_can_log_in(client):
    settings = bootstrap_settings()
    ensure_bootstrap_admin(settings)
    ensure_bootstrap_admin(settings)  # idempotent
    with SessionLocal() as db:
        admins = db.query(User).filter(User.role == UserRole.admin).all()
    assert [a.email for a in admins] == ["root@example.com"]
    assert (
        client.post("/api/auth/login", json={"email": "root@example.com", "password": "a-strong-secret"}).status_code
        == 200
    )


def test_bootstrap_admin_skipped_when_an_admin_exists(admin):
    ensure_bootstrap_admin(bootstrap_settings())
    with SessionLocal() as db:
        assert db.query(User).count() == 1


def test_bootstrap_admin_does_not_hijack_an_existing_account(dev):
    with SessionLocal() as db:
        db.get(User, dev.id).email = "root@example.com"
        db.commit()
    ensure_bootstrap_admin(bootstrap_settings())
    with SessionLocal() as db:
        assert db.query(User).one().role == UserRole.developer


def test_bootstrap_requires_both_email_and_password(client):
    ensure_bootstrap_admin(
        Settings(_env_file=None, environment="test", secret_key="k" * 40, bootstrap_admin_email="a@example.com")
    )
    with SessionLocal() as db:
        assert db.query(User).count() == 0


# ------------------------------------------------------------------ configuration safety
def test_production_requires_a_strong_secret():
    with pytest.raises(ValidationError, match="SECRET_KEY must be set"):
        Settings(_env_file=None, environment="production", secret_key="")
    with pytest.raises(ValidationError, match="at least 32"):
        Settings(_env_file=None, environment="production", secret_key="short")
    ok = Settings(_env_file=None, environment="production", secret_key="s" * 32)
    assert ok.is_production and ok.enable_docs is False and ok.auto_create_tables is False


def test_development_gets_an_ephemeral_secret():
    a, b = Settings(_env_file=None, secret_key=""), Settings(_env_file=None, secret_key="")
    assert len(a.secret_key) >= 32 and a.secret_key != b.secret_key


@pytest.mark.parametrize(
    "given,expected",
    [
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgres://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///x.db", "sqlite:///x.db"),
    ],
)
def test_database_url_is_normalized_to_psycopg3(given, expected):
    assert Settings(_env_file=None, database_url=given).database_url == expected


def test_production_disables_docs_and_adds_hsts():
    app = create_app(Settings(_env_file=None, environment="production", secret_key="s" * 40))
    with TestClient(app) as c:
        assert c.get("/docs").status_code == 404 and c.get("/openapi.json").status_code == 404
        assert "max-age" in c.get("/health").headers["strict-transport-security"]
