import datetime
import secrets
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from config import settings
from app.database.connection import get_db
from app.models.user_and_log import PasswordResetOTP, User
from app.schemas.auth_schemas import (
    AzureLoginRequest,
    ForgotPasswordRequest,
    ForgotPasswordReset,
    UserRegister,
    UserLogin,
    UserResponse,
    Token,
    VerifyOTPRequest,
)
from app.auth.jwt_handler import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.services.audit_logger import log_audit

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_password_reset_email(email: str, otp: str):
    if not settings.EMAIL_USER or not settings.EMAIL_PASS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset email is not configured",
        )

    message = EmailMessage()
    message["Subject"] = "Finance Portal Password Reset OTP"
    message["From"] = settings.EMAIL_USER
    message["To"] = email
    message.set_content(
        f"Your Finance Portal password reset OTP is {otp}.\n\n"
        f"This code expires in {settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} minutes.\n"
        "If you did not request this, please ignore this email."
    )
    message.add_alternative(
        f"""
        <!doctype html>
        <html>
          <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
            <div style="max-width:520px;margin:0 auto;padding:32px 18px;">
              <div style="background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e2e8f0;">
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:#071427;">
                  Password Reset OTP
                </h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">
                  Use this verification code to reset your Finance Portal password.
                </p>
                <div style="margin:0 0 22px;padding:22px;border-radius:16px;background:#e0f2fe;border:2px solid #38bdf8;text-align:center;">
                  <div style="font-size:13px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#0369a1;margin-bottom:8px;">
                    Your OTP Code
                  </div>
                  <div style="font-size:44px;line-height:1;font-weight:900;letter-spacing:8px;color:#075985;">
                    {otp}
                  </div>
                </div>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                  This code expires in {settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} minutes.
                  If you did not request this, please ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
        """,
        subtype="html",
    )

    email_password = settings.EMAIL_PASS.replace(" ", "")
    try:
        with smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT) as smtp:
            smtp.login(settings.EMAIL_USER, email_password)
            smtp.send_message(message)
    except smtplib.SMTPException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send password reset email",
        )


def _get_valid_reset_otp(db: Session, email: str, otp: str) -> PasswordResetOTP:
    reset_otp = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.email == email,
            PasswordResetOTP.is_used == False,  # noqa: E712
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    now = datetime.datetime.utcnow()
    if not reset_otp or reset_otp.expires_at < now or reset_otp.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP"
        )

    if not verify_password(otp, reset_otp.otp_hash):
        reset_otp.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP"
        )

    return reset_otp


@auth_router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserRegister, request: Request, db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Auto-approve the very first user as Admin (bootstrapping)
    is_first = db.query(User).count() == 0
    role = "Admin" if is_first else user_in.role
    status_val = "Approved" if is_first else "Pending"

    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=role,
        status=status_val,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(
        db=db,
        action="Registration",
        module="Auth",
        description=f"User registered. Name: {new_user.full_name}, Email: {new_user.email}, Role: {new_user.role}, Status: {new_user.status}",
        user_id=new_user.id,
        user_name=new_user.full_name,
        request=request,
    )

    return new_user


@auth_router.post("/forgot-password/request-otp")
async def request_password_reset_otp(
    reset_in: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == reset_in.email).first()
    if not user:
        return {
            "status": "success",
            "message": "If the email is registered, an OTP has been sent.",
        }

    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    otp = _generate_otp()
    reset_otp = PasswordResetOTP(
        user_id=user.id,
        email=user.email,
        otp_hash=get_password_hash(otp),
        expires_at=datetime.datetime.utcnow()
        + datetime.timedelta(minutes=settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES),
    )
    db.add(reset_otp)
    db.commit()

    _send_password_reset_email(user.email, otp)

    log_audit(
        db=db,
        action="Password Reset OTP Request",
        module="Auth",
        description=f"Password reset OTP requested for email: {user.email}",
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {
        "status": "success",
        "message": "If the email is registered, an OTP has been sent.",
    }


@auth_router.post("/forgot-password/verify-otp")
async def verify_password_reset_otp(
    verify_in: VerifyOTPRequest, db: Session = Depends(get_db)
):
    _get_valid_reset_otp(db, verify_in.email, verify_in.otp)
    return {"status": "success", "message": "OTP verified successfully."}


@auth_router.post("/forgot-password/reset")
async def reset_forgotten_password(
    reset_in: ForgotPasswordReset, request: Request, db: Session = Depends(get_db)
):
    reset_otp = _get_valid_reset_otp(db, reset_in.email, reset_in.otp)
    user = db.query(User).filter(User.id == reset_otp.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.password_hash = get_password_hash(reset_in.new_password)
    reset_otp.is_used = True
    db.commit()
    db.refresh(user)

    log_audit(
        db=db,
        action="Forgot Password Reset",
        module="Auth",
        description=f"Password reset completed for email: {user.email}",
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {"status": "success", "message": "Password reset successfully."}


@auth_router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin, request: Request, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == credentials.email).first()

    # Check existence & password
    if not user or not verify_password(credentials.password, user.password_hash):
        # Log failed login
        log_audit(
            db=db,
            action="Failed Login",
            module="Auth",
            description=f"Failed login attempt for email: {credentials.email}",
            user_name=credentials.email,
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check approved status
    if user.status == "Pending":
        log_audit(
            db=db,
            action="Failed Login",
            module="Auth",
            description=f"Failed login due to Pending Approval status. Email: {user.email}",
            user_id=user.id,
            user_name=user.full_name,
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval.",
        )

    if user.status == "Rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration has been rejected by an administrator.",
        )

    # Check active status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account"
        )

    # Login success
    access_token = create_access_token(data={"sub": user.email})

    log_audit(
        db=db,
        action="Login",
        module="Auth",
        description=f"User logged in successfully. Email: {user.email}",
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user}


@auth_router.post("/azure-login", response_model=Token)
async def azure_login(
    body: AzureLoginRequest, request: Request, db: Session = Depends(get_db)
):
    from app.auth.azure_handler import get_azure_user_info

    azure_user = get_azure_user_info(body.id_token)
    email = azure_user["email"]
    name = azure_user["name"]

    user = db.query(User).filter(User.email == email).first()

    if not user:
        is_first = db.query(User).count() == 0
        user = User(
            full_name=name,
            email=email,
            password_hash="",
            auth_provider="azure_ad",
            role="Admin" if is_first else "User",
            status="Approved" if is_first else "Pending",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        log_audit(
            db=db,
            action="Azure AD Registration",
            module="Auth",
            description=f"New Azure AD user registered. Name: {user.full_name}, Email: {user.email}, Role: {user.role}, Status: {user.status}",
            user_id=user.id,
            user_name=user.full_name,
            request=request,
        )

    if user.status == "Pending":
        log_audit(
            db=db,
            action="Failed Login",
            module="Auth",
            description=f"Failed login (Pending). Email: {user.email}",
            user_id=user.id,
            user_name=user.full_name,
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval.",
        )

    if user.status == "Rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration has been rejected by an administrator.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(data={"sub": user.email})

    log_audit(
        db=db,
        action="Azure AD Login",
        module="Auth",
        description=f"User logged in via Azure AD. Email: {user.email}",
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@auth_router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    log_audit(
        db=db,
        action="Logout",
        module="Auth",
        description=f"User logged out. Email: {current_user.email}",
        user_id=current_user.id,
        user_name=current_user.full_name,
        request=request,
    )
    return {"status": "success", "message": "Logged out successfully"}


@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
