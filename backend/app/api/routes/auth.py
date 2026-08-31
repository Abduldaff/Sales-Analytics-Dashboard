from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, verify_password
from app.db.models import ApplicationUser
from app.db.session import get_db
from app.schemas.auth import AccessToken, CurrentUser

router = APIRouter(prefix="/auth")


@router.post("/token", response_model=AccessToken, summary="Create a JWT access token")
def login(form: OAuth2PasswordRequestForm = Depends(), database: Session = Depends(get_db)) -> AccessToken:
    user = database.query(ApplicationUser).filter(ApplicationUser.email == form.username.lower()).one_or_none()
    if user is None or not user.is_active or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return AccessToken(access_token=create_access_token(user.email, user.role))


@router.get("/me", response_model=CurrentUser, summary="Get the authenticated user")
def current_user(user: ApplicationUser = Depends(get_current_user)) -> CurrentUser:
    return CurrentUser(email=user.email, full_name=user.full_name, role=user.role, is_active=user.is_active, created_at=user.created_at)
