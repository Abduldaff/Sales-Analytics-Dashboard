from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EXECUTIVE = "EXECUTIVE"
    SALES_MANAGER = "SALES_MANAGER"
    ANALYST = "ANALYST"
    SALES_REP = "SALES_REP"


class ApplicationUser(Base):
    __tablename__ = "app_user"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole, name="app_user_role", create_constraint=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
