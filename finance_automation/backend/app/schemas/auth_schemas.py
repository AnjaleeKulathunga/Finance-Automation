import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str
    role: str = "User"

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("role")
    @classmethod
    def role_is_allowed(cls, v: str):
        if v not in {"Admin", "User"}:
            raise ValueError("Role must be Admin or User")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    status: str
    is_active: bool
    created_by: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "User"
    status: str = "Approved"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    status: Optional[str] = None


class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ForgotPasswordReset(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def reset_passwords_match(cls, v: str, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class AzureLoginRequest(BaseModel):
    id_token: str


class RoleChangeRequest(BaseModel):
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    module: str
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class PaginatedAuditLogs(BaseModel):
    total: int
    logs: List[AuditLogResponse]
