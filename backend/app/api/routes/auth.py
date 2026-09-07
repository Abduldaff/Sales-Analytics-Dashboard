from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.models import ApplicationUser, UserRole
from app.db.session import get_db
from app.schemas.auth import AccessToken, CurrentUser, UserRegistration

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=AccessToken, status_code=status.HTTP_201_CREATED, summary="Register an analyst account")
def register(payload: UserRegistration, database: Session = Depends(get_db)) -> AccessToken:
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    if "@" not in email or len(email) > 255:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid email address")
    if len(full_name) < 2 or len(full_name) > 255:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter your full name")
    if len(payload.password) < 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must contain at least 12 characters")
    user = ApplicationUser(email=email, full_name=full_name, hashed_password=hash_password(payload.password), role=UserRole.ANALYST)
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists") from error
    return AccessToken(access_token=create_access_token(user.email, user.role))


@router.post("/token", response_model=AccessToken, summary="Create a JWT access token")
def login(form: OAuth2PasswordRequestForm = Depends(), database: Session = Depends(get_db)) -> AccessToken:
    user = database.query(ApplicationUser).filter(ApplicationUser.email == form.username.lower()).one_or_none()
    if user is None or not user.is_active or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return AccessToken(access_token=create_access_token(user.email, user.role))


@router.get("/me", response_model=CurrentUser, summary="Get the authenticated user")
def current_user(user: ApplicationUser = Depends(get_current_user)) -> CurrentUser:
    return CurrentUser(email=user.email, full_name=user.full_name, role=user.role, is_active=user.is_active, created_at=user.created_at)
