
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Create a secure Argon2 hash for a password."""
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a password against its stored hash."""
    try:
        return password_hasher.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError):
        return False
