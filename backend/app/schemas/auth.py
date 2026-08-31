from datetime import datetime

from pydantic import BaseModel

from app.db.models import UserRole


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
