import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ApplicationUser, UserRole
from app.db.session import get_db

password_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class InvalidTokenError(ValueError):
    """Raised when a compact JWT fails signature or claims validation."""


def _encode_part(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_part(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def create_access_token(subject: str, role: UserRole) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    header = _encode_part(json.dumps({"alg": settings.jwt_algorithm, "typ": "JWT"}, separators=(",", ":")).encode())
    payload: Dict[str, Any] = {"sub": subject, "role": role.value, "exp": int(expires_at.timestamp())}
    body = _encode_part(json.dumps(payload, separators=(",", ":")).encode())
    signed_value = f"{header}.{body}".encode("ascii")
    signature = _encode_part(hmac.new(settings.jwt_secret_key.encode(), signed_value, hashlib.sha256).digest())
    return f"{header}.{body}.{signature}"


def decode_access_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    try:
        header, payload, signature = token.split(".")
        metadata = json.loads(_decode_part(header))
        if metadata.get("alg") != settings.jwt_algorithm or settings.jwt_algorithm != "HS256":
            raise InvalidTokenError("Unexpected signing algorithm")
        signed_value = f"{header}.{payload}".encode("ascii")
        expected = _encode_part(hmac.new(settings.jwt_secret_key.encode(), signed_value, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise InvalidTokenError("Invalid signature")
        claims = json.loads(_decode_part(payload))
        if not isinstance(claims.get("exp"), int) or claims["exp"] <= int(datetime.now(timezone.utc).timestamp()):
            raise InvalidTokenError("Expired token")
        return claims
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise InvalidTokenError("Malformed token") from error


def get_current_user(token: str = Depends(oauth2_scheme), database: Session = Depends(get_db)) -> ApplicationUser:
    settings = get_settings()
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        subject = decode_access_token(token).get("sub")
    except InvalidTokenError as error:
        raise credentials_error from error
    if not subject:
        raise credentials_error
    user = database.query(ApplicationUser).filter(ApplicationUser.email == subject).one_or_none()
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_roles(*roles: UserRole):
    def dependency(user: ApplicationUser = Depends(get_current_user)) -> ApplicationUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return dependency
