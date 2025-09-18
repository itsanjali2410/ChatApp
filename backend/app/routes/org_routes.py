from fastapi import APIRouter, Depends, HTTPException
from ..models.org_model import Organization
from ..services import org_service
from ..dependencies.auth import get_current_user, get_current_admin
from ..services import user_service
from bson import ObjectId
router = APIRouter(prefix="/organization", tags=["Organization"])

@router.post("/create_org")
def create_org(org: Organization, current_user=Depends(get_current_user)):
    # Create org by logged-in user and upgrade them to admin
    org_data = org.dict()
    org_data["admin_id"] = current_user.get("sub")
    result = org_service.set_org(org_data)

    # Link org to user and set role to admin
    update = {
        "organization_id": str(result.inserted_id),
        "role": "admin",
    }
    user = user_service.get_user_by_email(current_user.get("sub"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_service.update_user(current_user.get("sub"), update)

    return {"message": "Organization created successfully", "org_id": str(result.inserted_id)}
#return all organizations
@router.get("/")
def get_org_details():
    org = org_service.get_all_orgs()
    return org

@router.post("/invite")
def generate_invite(org_id: str, current_admin=Depends(get_current_admin)):
    # Ensure current admin belongs to org
    token, expiry = org_service.create_invite(org_id)
    return {"invite_token": token, "expires_at": expiry.isoformat()}
