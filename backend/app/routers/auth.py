from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas
from ..config import Settings, get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User, UserRole
from ..ratelimit import rate_limit_by_ip
from ..security import (
    create_access_token,
    hash_password,
    verify_password,
    verify_password_dummy,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _token_response(user: User, settings: Settings) -> schemas.TokenOut:
    return schemas.TokenOut(
        access_token=create_access_token(user.id, settings), user=schemas.UserOut.model_validate(user)
    )


@router.get("/config", response_model=schemas.AuthConfig)
def auth_config(settings: Settings = Depends(get_settings)):
    """Public flags the login screen needs (e.g. whether to show the sign-up link)."""
    return schemas.AuthConfig(allow_signup=settings.allow_signup)


@router.post(
    "/signup",
    response_model=schemas.TokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_by_ip("signup", limit=5, window_seconds=3600))],
)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Self-service registration. New accounts are always developers; only an admin can grant more."""
    if not settings.allow_signup:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Sign-up is disabled")
    user = User(
        name=payload.name,
        email=payload.email,
        role=UserRole.developer,
        hashed_password=hash_password(payload.password, settings.bcrypt_rounds),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered") from None
    return _token_response(user, settings)


@router.post(
    "/login",
    response_model=schemas.TokenOut,
    dependencies=[Depends(rate_limit_by_ip("login", limit=10, window_seconds=60))],
)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        verify_password_dummy(payload.password)
    if user is None or not verify_password(payload.password, user.hashed_password) or not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_response(user, settings)


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip("change-password", limit=10, window_seconds=60))],
)
def change_password(
    payload: schemas.ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password, settings.bcrypt_rounds)
    db.commit()
