import datetime
import secrets
import smtplib
from email.message import EmailMessage
from typing import Optional

from pydantic import BaseModel

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


# ---------------------------------------------------------------------------
# Microsoft OAuth 2.0 — Authorization Code Flow with PKCE (Option B)
# ---------------------------------------------------------------------------

@auth_router.get("/microsoft/login")
async def microsoft_login():
    """
    Step 1 — Generate PKCE pair, encrypt state, return Microsoft auth URL.
    Frontend redirects the browser to the returned auth_url.
    """
    from app.auth.microsoft_sso import (
        generate_pkce_pair,
        encrypt_state,
        build_authorization_url,
    )

    code_verifier, code_challenge = generate_pkce_pair()
    encrypted_state = encrypt_state({"code_verifier": code_verifier})
    auth_url = build_authorization_url(code_challenge, encrypted_state)

    return {"auth_url": auth_url}


class MicrosoftFinishRequest(BaseModel):
    code: str
    state: str


@auth_router.post("/microsoft/finish")
async def microsoft_finish(
    body: MicrosoftFinishRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Step 2 — Frontend POSTs { code, state } received from Microsoft redirect.
    Backend:
      1. Decrypts state → extracts code_verifier
      2. Exchanges code for Microsoft access token
      3. Calls Microsoft Graph /v1.0/me to verify identity
      4. Checks if user exists. If not, returns sso_status="new_user" with user info.
      5. If exists, returns local JWT + user info.
    """
    from app.auth.microsoft_sso import (
        decrypt_state,
        exchange_code_for_token,
        get_graph_user,
        extract_service_number,
    )

    # 1. Decrypt & validate state
    state_payload = decrypt_state(body.state)
    code_verifier = state_payload.get("code_verifier")

    if not code_verifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed OAuth state — missing code_verifier.",
        )

    # 2. Exchange authorization code for Microsoft access token
    token_response = await exchange_code_for_token(body.code, code_verifier)
    ms_access_token = token_response.get("access_token")
    if not ms_access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No access token returned from Microsoft.",
        )

    # 3. Fetch identity from Microsoft Graph
    graph_user = await get_graph_user(ms_access_token)
    microsoft_id = graph_user["microsoft_id"]
    display_name = graph_user["display_name"]
    email = (graph_user["mail"] or graph_user["upn"]).lower()
    upn = graph_user["upn"]
    service_number = extract_service_number(upn)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Microsoft account has no email address.",
        )

    # 4. Check if user exists
    user = (
        db.query(User).filter(User.microsoft_id == microsoft_id).first()
        if microsoft_id
        else None
    )
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        is_first = db.query(User).count() == 0
        if is_first:
            # Auto-approve the very first user as Admin immediately
            user = User(
                full_name=display_name or email,
                email=email,
                password_hash="",
                auth_provider="microsoft",
                microsoft_id=microsoft_id,
                service_number=service_number,
                role="Admin",
                status="Approved",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            log_audit(
                db=db,
                action="Microsoft SSO Registration",
                module="Auth",
                description=f"First system user registered as Admin via Microsoft: {user.email}",
                user_id=user.id,
                user_name=user.full_name,
                request=request,
            )
        else:
            # If not first user, return new_user info so frontend can prompt for role selection
            return {
                "access_token": "",
                "token_type": "bearer",
                "sso_status": "new_user",
                "user": {
                    "microsoft_id": microsoft_id,
                    "email": email,
                    "full_name": display_name or email,
                    "service_number": service_number,
                }
            }
    else:
        # Update microsoft_id and service_number if missing
        changed = False
        if not user.microsoft_id and microsoft_id:
            user.microsoft_id = microsoft_id
            changed = True
        if not user.service_number and service_number:
            user.service_number = service_number
            changed = True
        if user.auth_provider == "local" and not user.password_hash:
            user.auth_provider = "microsoft"
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    # 5. Check approval status
    if user.status == "Pending":
        log_audit(
            db=db,
            action="Microsoft SSO Login — Pending",
            module="Auth",
            description=f"SSO login blocked (Pending). Email: {user.email}",
            user_id=user.id,
            user_name=user.full_name,
            request=request,
        )
        return {
            "access_token": "",
            "token_type": "bearer",
            "sso_status": "pending",
            "user": None,
        }

    if user.status == "Rejected":
        return {
            "access_token": "",
            "token_type": "bearer",
            "sso_status": "rejected",
            "user": None,
        }

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account has been deactivated.",
        )

    # 6. Issue local JWT
    access_token = create_access_token(data={"sub": user.email})

    log_audit(
        db=db,
        action="Microsoft SSO Login",
        module="Auth",
        description=f"User logged in via Microsoft SSO. Email: {user.email}",
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "sso_status": "approved",
        "user": UserResponse.model_validate(user),
    }


class MicrosoftRegisterRequest(BaseModel):
    microsoft_id: str
    email: str
    full_name: str
    service_number: str
    role: str


@auth_router.post("/microsoft/register")
async def microsoft_register(
    body: MicrosoftRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Step 3 — Register new SSO user with the role selected in the UI.
    """
    if body.role not in {"Admin", "User"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected."
        )

    # Verify if user exists
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    user = User(
        full_name=body.full_name,
        email=body.email.lower(),
        password_hash="",
        auth_provider="microsoft",
        microsoft_id=body.microsoft_id,
        service_number=body.service_number,
        role=body.role,
        status="Pending",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(
        db=db,
        action="Microsoft SSO Registration",
        module="Auth",
        description=(
            f"New Microsoft SSO user registered. "
            f"Name: {user.full_name}, Email: {user.email}, "
            f"ServiceNo: {user.service_number}, Role: {user.role}, Status: {user.status}"
        ),
        user_id=user.id,
        user_name=user.full_name,
        request=request,
    )

    return {"status": "success", "message": "Access request submitted successfully."}
