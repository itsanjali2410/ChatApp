from fastapi import APIRouter, HTTPException, Depends
from werkzeug.security import generate_password_hash
from ..models.user_model import User
from ..services import user_service
from ..services import org_service
from ..dependencies.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Users"])

# Create a new user
@router.post("/create_user")
def add_user(user: User):
    existing_user =  user_service.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    # Hash the password before saving
    user_dict = user.dict()
    user_dict["password"] = generate_password_hash(user_dict["password"]) 
    result =  user_service.create_user(user_dict)
    return {"message": "User created", "user_id": str(result.inserted_id)}

# Get all users
@router.get("/")
def list_all_users():
    users =  user_service.list_users()
    return users

# Get current user profile (requires auth)
@router.get("/profile/me")
def get_current_user_profile(current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    user = user_service.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string and remove sensitive data
    user["_id"] = str(user["_id"])
    user.pop("password", None)  # Remove password from response
    return user

# Update current user profile (requires auth)
@router.put("/profile/me")
def update_current_user_profile(updates: dict, current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    # Get current user
    user = user_service.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Filter allowed fields for profile updates
    allowed_fields = [
        "first_name", "last_name", "bio", "linkedin_url", "instagram_url", 
        "phone", "department", "position"
    ]
    
    # Only update allowed fields
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update user profile
    result = user_service.update_user(user_email, filtered_updates)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found or not updated")
    
    # Return updated user profile
    updated_user = user_service.get_user_by_email(user_email)
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password", None)  # Remove password from response
    return updated_user

# Update user online status
@router.post("/status/online")
def set_user_online(current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    result = user_service.update_user(user_email, {"is_online": True})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User set to online"}

# Update user offline status
@router.post("/status/offline")
def set_user_offline(current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    result = user_service.update_user(user_email, {"is_online": False})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User set to offline"}

# Users in same organization (requires auth) 
@router.get("/by_org")
def list_users_by_org(current_user=Depends(get_current_user)):
    org_id = current_user.get("org_id")
    all_users = user_service.list_users()
    return [u for u in all_users if u.get("organization_id") == org_id]

# Admin-only list by org_id
@router.get("/admin/by_org")
def admin_list_users_by_org(org_id: str, current_admin=Depends(get_current_admin)):
    all_users = user_service.list_users()
    return [u for u in all_users if u.get("organization_id") == org_id]

# Get user by email
@router.get("/{email}")
def get_user(email: str):
    user =  user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])  # Convert ObjectId to str
    return user

# Update user by email
@router.put("/{email}")
def update_user(email: str, user: User):
    result =  user_service.update_user(email, user.dict())
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

# Delete user
@router.delete("/{email}")
def remove_user(email: str):
    result =  user_service.delete_user(email)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# Invite-based signup
@router.post("/signup_with_invite")
def signup_with_invite(user: User, org_id: str, token: str):
    # verify invite
    if not org_service.consume_invite(org_id, token):
        raise HTTPException(status_code=400, detail="Invalid or expired invite")
    existing_user =  user_service.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    user_dict = user.dict()
    user_dict["organization_id"] = org_id
    result =  user_service.create_user(user_dict)
    return {"message": "User created via invite", "user_id": str(result.inserted_id)}

# ---------------- Admin user management (scoped to admin's organization) ----------------
from fastapi import Depends
from werkzeug.security import generate_password_hash

@router.post("/admin/create")
def admin_create_user(payload: dict, current_admin=Depends(get_current_admin)):
    required = ["username", "email", "password"]
    if not all(k in payload and payload[k] for k in required):
        raise HTTPException(status_code=400, detail="username, email and password are required")
    existing = user_service.get_user_by_email(payload["email"])
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    to_create = {
        "username": payload["username"],
        "email": payload["email"],
        "password": generate_password_hash(payload["password"]),
        "role": "user",
        "organization_id": current_admin.get("org_id"),
    }
    result = user_service.create_user(to_create)
    return {"message": "User created", "user_id": str(result.inserted_id)}

@router.put("/admin/{email}")
def admin_update_user(email: str, updates: dict, current_admin=Depends(get_current_admin)):
    user = user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("organization_id") != current_admin.get("org_id"):
        raise HTTPException(status_code=403, detail="Not allowed")
    updates = {k: v for k, v in updates.items() if k in ["username", "password"]}
    if "password" in updates and updates["password"]:
        updates["password"] = generate_password_hash(updates["password"])
    result = user_service.update_user(email, updates)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

@router.delete("/admin/{email}")
def admin_delete_user(email: str, current_admin=Depends(get_current_admin)):
    user = user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("organization_id") != current_admin.get("org_id"):
        raise HTTPException(status_code=403, detail="Not allowed")
    result = user_service.delete_user(email)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
