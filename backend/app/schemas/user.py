
from pydantic import BaseModel, Field, field_validator


class UserRegister(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50,
    )
    email: str = Field(
        min_length=5,
        max_length=255,
    )
    password: str = Field(
        min_length=12,
        max_length=128,
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()

        if not value.replace("_", "").isalnum():
            raise ValueError(
                "Username may contain only letters, numbers, and underscores."
            )

        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()

        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")

        return value


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    model_config = {"from_attributes": True}

class UserLogin(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50,
    )

    password: str = Field(
        min_length=1,
    )

    remember_me: bool = False
