"""Create an application user without exposing a password on the command line."""
from __future__ import annotations

import argparse
import getpass

from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.db.models import ApplicationUser, UserRole
from app.db.session import get_session_factory


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Sales Analytics application user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--role", required=True, choices=[role.value for role in UserRole])
    args = parser.parse_args()
    password = getpass.getpass("Password: ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    with get_session_factory()() as database:
        database.add(ApplicationUser(email=args.email.lower(), full_name=args.name, hashed_password=hash_password(password), role=UserRole(args.role)))
        try:
            database.commit()
        except IntegrityError as error:
            database.rollback()
            raise SystemExit("A user with this email already exists") from error
    print("User created")
