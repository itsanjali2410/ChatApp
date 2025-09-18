# UNUSED CODE - FLAG FOR REMOVAL
# This file is not included in main.py and functionality is replaced by /auth/register_admin_with_org
# TODO: DELETE THIS FILE

from fastapi import APIRouter
from ..models.admin_model import Admin
from ..models.org_model import Organization
from ..services import admin_service
from werkzeug.security import generate_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/create")
def create_admin(admin: Admin, org: Organization):
    # Ensure password is hashed if not already
    admin_payload = admin.dict()
    if admin_payload.get("password") and not admin_payload["password"].startswith("pbkdf2:"):
        admin_payload["password"] = generate_password_hash(admin_payload["password"])
    admin_result, org_result = admin_service.create_admin(admin_payload, org.dict())
    return {
        "admin_id": str(admin_result.inserted_id),
        "org_id": str(org_result.inserted_id),
        "message": "Admin and Organization created successfully"
    }
