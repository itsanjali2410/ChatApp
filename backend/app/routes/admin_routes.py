from fastapi import APIRouter, HTTPException, Depends
from ..models.admin_model import Admin
from ..models.org_model import Organization
from ..services import admin_service
from ..dependencies.auth import get_current_admin
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

# Get admin profile
@router.get("/profile")
def get_admin_profile(current_admin=Depends(get_current_admin)):
    """Get current admin profile"""
    from ..services.admin_service import get_admin_by_email
    admin = get_admin_by_email(current_admin.get("sub"))
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Convert ObjectId to string and remove sensitive data
    admin["_id"] = str(admin["_id"])
    admin.pop("password", None)  # Remove password from response
    return admin

# Update admin profile
@router.put("/profile")
def update_admin_profile(updates: dict, current_admin=Depends(get_current_admin)):
    """Update current admin profile"""
    from ..services.admin_service import get_admin_by_email, update_admin
    from bson import ObjectId
    
    admin = get_admin_by_email(current_admin.get("sub"))
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Filter allowed fields for admin updates
    allowed_fields = ["username", "first_name", "last_name", "bio", "phone"]
    
    # Only update allowed fields
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update admin profile
    result = update_admin(str(admin["_id"]), filtered_updates)
    if not result:
        raise HTTPException(status_code=404, detail="Admin not found or not updated")
    
    # Return updated admin profile
    updated_admin = get_admin_by_email(current_admin.get("sub"))
    updated_admin["_id"] = str(updated_admin["_id"])
    updated_admin.pop("password", None)  # Remove password from response
    return updated_admin
