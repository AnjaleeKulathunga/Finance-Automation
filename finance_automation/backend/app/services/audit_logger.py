from fastapi import Request
from sqlalchemy.orm import Session
from app.models.user_and_log import AuditLog

def log_audit(
    db: Session,
    action: str,
    module: str,
    description: str,
    user_id: int = None,
    user_name: str = None,
    request: Request = None
):
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
    
    db_log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        module=module,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
