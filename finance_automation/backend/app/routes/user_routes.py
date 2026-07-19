import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user_and_log import User
from app.schemas.auth_schemas import UserResponse, UserCreate, UserUpdate, PasswordResetRequest, RoleChangeRequest
from app.auth.jwt_handler import get_admin_user, get_current_active_user, get_password_hash
from app.services.audit_logger import log_audit

user_router = APIRouter(prefix="/api/users", tags=["users"])

@user_router.get("", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    return db.query(User).all()

@user_router.get("/{id}", response_model=UserResponse)
async def get_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Admin can view anyone, normal users can only view themselves
    if current_user.role != "Admin" and current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user profile"
        )
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@user_router.post("", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role,
        status=user_in.status,
        is_active=True,
        created_by=admin.id
    )
    if user_in.status == "Approved":
        new_user.approved_by = admin.id
        new_user.approved_at = datetime.datetime.utcnow()
        
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_audit(
        db=db,
        action="User Creation",
        module="User Management",
        description=f"Admin created a user. Email: {new_user.email}, Role: {new_user.role}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return new_user

@user_router.put("/{id}", response_model=UserResponse)
async def update_user(
    id: int,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Admin can update anyone. Normal users can only update themselves (limited to name and email)
    if current_user.role != "Admin" and current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
        
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Check duplicate email
    if user_in.email and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
            
    # Apply updates
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None:
        user.email = user_in.email
        
    # Admin only updates
    if current_user.role == "Admin":
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.role is not None:
            user.role = user_in.role
        if user_in.status is not None:
            user.status = user_in.status
            if user_in.status == "Approved" and not user.approved_at:
                user.approved_by = current_user.id
                user.approved_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(user)
    
    action = "Profile Update" if current_user.id == id else "User Update"
    log_audit(
        db=db,
        action=action,
        module="User Management" if current_user.role == "Admin" else "Auth",
        description=f"Updated user ID {user.id}. Fields modified by {current_user.full_name}",
        user_id=current_user.id,
        user_name=current_user.full_name,
        request=request
    )
    return user

@user_router.delete("/{id}")
async def delete_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    if admin.id == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    email = user.email
    db.delete(user)
    db.commit()
    
    log_audit(
        db=db,
        action="User Deletion",
        module="User Management",
        description=f"Deleted user with email: {email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return {"status": "success", "message": "User deleted successfully"}

@user_router.patch("/{id}/approve", response_model=UserResponse)
async def approve_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = "Approved"
    user.approved_by = admin.id
    user.approved_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="User Approval",
        module="User Management",
        description=f"Approved registration for user: {user.email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user

@user_router.patch("/{id}/reject", response_model=UserResponse)
async def reject_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = "Rejected"
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="User Rejection",
        module="User Management",
        description=f"Rejected registration for user: {user.email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user

@user_router.patch("/{id}/activate", response_model=UserResponse)
async def activate_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="User Activation",
        module="User Management",
        description=f"Activated user: {user.email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user

@user_router.patch("/{id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    if admin.id == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own admin account"
        )
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="User Deactivation",
        module="User Management",
        description=f"Deactivated user: {user.email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user

@user_router.patch("/{id}/role", response_model=UserResponse)
async def change_role(
    id: int,
    role_in: RoleChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if role_in.role not in ["Admin", "User"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user.role = role_in.role
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="Role Change",
        module="User Management",
        description=f"Changed role of {user.email} to {user.role}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user

@user_router.patch("/{id}/reset-password", response_model=UserResponse)
async def reset_password(
    id: int,
    reset_in: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.password_hash = get_password_hash(reset_in.new_password)
    db.commit()
    db.refresh(user)
    
    log_audit(
        db=db,
        action="Password Reset",
        module="User Management",
        description=f"Reset password of user: {user.email}",
        user_id=admin.id,
        user_name=admin.full_name,
        request=request
    )
    return user
