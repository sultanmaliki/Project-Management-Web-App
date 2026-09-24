from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.config import Settings
from app.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_roundtrip():
    hashed = hash_password("s3cret-pass", rounds=4)
    assert hashed != "s3cret-pass"
    assert verify_password("s3cret-pass", hashed)
    assert not verify_password("S3cret-pass", hashed)


def test_hashes_are_salted():
    assert hash_password("same-password", 4) != hash_password("same-password", 4)


def test_verify_rejects_overlong_password_instead_of_raising():
    hashed = hash_password("x" * 72, rounds=4)
    assert verify_password("x" * 72, hashed)
    assert not verify_password("x" * 73, hashed)


def test_verify_handles_malformed_hash():
    assert not verify_password("anything", "not-a-bcrypt-hash")


def test_token_roundtrip(settings):
    token = create_access_token(42, settings)
    assert decode_access_token(token, settings) == 42


def test_token_signed_with_other_key_is_rejected(settings):
    other = Settings(_env_file=None, secret_key="a-completely-different-secret-key-0123456789")
    assert decode_access_token(create_access_token(1, other), settings) is None


def test_expired_token_is_rejected(settings):
    past = datetime.now(UTC) - timedelta(hours=2)
    token = jwt.encode(
        {"sub": "1", "iat": past, "exp": past + timedelta(minutes=1)}, settings.secret_key, algorithm=ALGORITHM
    )
    assert decode_access_token(token, settings) is None


def test_unsigned_alg_none_token_is_rejected(settings):
    token = jwt.encode({"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)}, key=None, algorithm="none")
    assert decode_access_token(token, settings) is None


@pytest.mark.parametrize("claims", [{"exp": 9999999999}, {"sub": "1"}, {"sub": "abc", "exp": 9999999999}])
def test_token_missing_or_bad_claims_is_rejected(settings, claims):
    token = jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM)
    assert decode_access_token(token, settings) is None


@pytest.mark.parametrize("garbage", ["", "abc", "a.b.c", "Bearer x"])
def test_garbage_tokens_are_rejected(settings, garbage):
    assert decode_access_token(garbage, settings) is None
