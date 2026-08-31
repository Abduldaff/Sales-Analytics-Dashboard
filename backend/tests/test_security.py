from app.core.security import create_access_token, decode_access_token
from app.db.models import UserRole


def test_access_token_contains_subject_and_role() -> None:
    token = create_access_token("analyst@example.test", UserRole.ANALYST)
    claims = decode_access_token(token)
    assert claims["sub"] == "analyst@example.test"
    assert claims["role"] == "ANALYST"
