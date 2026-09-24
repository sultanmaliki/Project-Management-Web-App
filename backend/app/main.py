import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .database import Base, SessionLocal, engine
from .models import User, UserRole
from .routers import ai, auth, projects, tasks, users
from .security import hash_password

logger = logging.getLogger("projectflow")

CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)
DOC_PATHS = ("/docs", "/redoc", "/openapi.json")


def ensure_bootstrap_admin(settings: Settings) -> None:
    """Create the first administrator from BOOTSTRAP_ADMIN_* if the database has no admin yet."""
    if not (settings.bootstrap_admin_email and settings.bootstrap_admin_password):
        return
    with SessionLocal() as db:
        if db.scalar(select(func.count(User.id)).where(User.role == UserRole.admin)):
            return
        email = settings.bootstrap_admin_email.strip().lower()
        if db.scalar(select(User).where(User.email == email)):
            logger.warning("BOOTSTRAP_ADMIN_EMAIL belongs to an existing non-admin user; not creating an admin.")
            return
        db.add(
            User(
                name=settings.bootstrap_admin_name,
                email=email,
                role=UserRole.admin,
                hashed_password=hash_password(settings.bootstrap_admin_password, settings.bcrypt_rounds),
            )
        )
        db.commit()
        logger.info("Created bootstrap administrator %s", email)


class SPAStaticFiles(StaticFiles):
    """Serve the built frontend, falling back to index.html so client-side routes survive a refresh."""

    async def get_response(self, path: str, scope):
        # `path` is OS-normalised (backslashes on Windows), so decide using the URL path instead.
        url_path = scope.get("path", "")
        is_api = url_path == "/api" or url_path.startswith("/api/")
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404 or is_api:
                raise
            return await super().get_response("index.html", scope)
        if response.status_code == 404 and not is_api:
            return await super().get_response("index.html", scope)
        return response


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.auto_create_tables:
            Base.metadata.create_all(bind=engine)
        ensure_bootstrap_admin(settings)
        yield

    app = FastAPI(
        title="ProjectFlow API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # auth uses a bearer header, not cookies
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if not request.url.path.startswith(DOC_PATHS):  # Swagger/ReDoc load scripts from a CDN
            response.headers.setdefault("Content-Security-Policy", CSP)
        if request.url.path.startswith("/api"):
            response.headers.setdefault("Cache-Control", "no-store")
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)

    @app.get("/health", tags=["Meta"])
    def health():
        return {"status": "ok"}

    for router in (auth.router, users.router, projects.router, tasks.router, tasks.dashboard_router, ai.router):
        app.include_router(router)

    static_dir = Path(settings.static_dir) if settings.static_dir else None
    if static_dir and static_dir.is_dir():
        app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="frontend")

    return app


app = create_app()
