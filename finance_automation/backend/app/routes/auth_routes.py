from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user_and_log import User
from app.schemas.auth_schemas import UserRegister, UserLogin, UserResponse, Token
from app.auth.jwt_handler import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.services.audit_logger import log_audit

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

@auth_router.post("/register", response_model=UserResponse)
async def register(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Auto-approve the very first user as Admin (bootstrapping)
    is_first = db.query(User).count() == 0
    role = "Admin" if is_first else "User"
    status_val = "Approved" if is_first else "Pending"
    
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=role,
        status=status_val,
        is_active=True
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
        request=request
    )
    
    return new_user

@auth_router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
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
            request=request
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
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval."
        )
        
    if user.status == "Rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration has been rejected by an administrator."
        )
        
    # Check active status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
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
        request=request
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@auth_router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    log_audit(
        db=db,
        action="Logout",
        module="Auth",
        description=f"User logged out. Email: {current_user.email}",
        user_id=current_user.id,
        user_name=current_user.full_name,
        request=request
    )
    return {"status": "success", "message": "Logged out successfully"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
