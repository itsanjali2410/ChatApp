from fastapi import APIRouter, HTTPException, Depends
from werkzeug.security import generate_password_hash
from ..models.user_model import User, FCMTokenUpdate, ThemePreferenceUpdate
from bson import ObjectId, Code

from datetime import datetime
from ..services.user_service import users_collection
from ..services import user_service
from ..services import org_service
from ..dependencies.auth import get_current_user, get_current_admin

def _serialize_user(user: dict) -> dict:
    """Normalize user/admin payloads for frontend consumption."""
    if not user:
        return {}
    serialized = {**user}
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])
    serialized.pop("password", None)
    preferences = serialized.get("preferences") or {}
    theme_preference = preferences.get("theme") or serialized.get("theme_preference") or "light"
    serialized["preferences"] = {**preferences, "theme": theme_preference}
    serialized["theme_preference"] = theme_preference
    return serialized

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

# Update current user profile (requires auth)
@router.get("/profile/me")
def get_my_profile(current_user=Depends(get_current_user)):
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email

    user_email = current_user.get("sub")
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _serialize_user(user)

@router.put("/profile/me")
def update_my_profile(updates: dict, current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email missing")

    allowed_fields = {
        "username",
        "first_name",
        "last_name",
        "bio",
        "phone",
        "department",
        "position",
        "linkedin_url",
        "instagram_url",
    }
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    role = current_user.get("role", "user")

    if role == "admin":
        from ..services.admin_service import get_admin_by_email, update_admin

        admin = get_admin_by_email(user_email)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        updated = update_admin(str(admin["_id"]), filtered_updates)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update admin profile")

        refreshed = get_admin_by_email(user_email)
        return _serialize_user(refreshed)

    result = user_service.update_user(user_email, filtered_updates)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    refreshed_user = user_service.get_user_by_email(user_email)
    return _serialize_user(refreshed_user)

@router.put("/preferences/theme")
def update_theme_preference(payload: ThemePreferenceUpdate, current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email missing")

    role = current_user.get("role", "user")
    theme_updates = {
        "preferences.theme": payload.theme,
        "theme_preference": payload.theme
    }

    if role == "admin":
        from ..services.admin_service import get_admin_by_email, update_admin

        admin = get_admin_by_email(user_email)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        updated = update_admin(str(admin["_id"]), theme_updates)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update theme preference")
        refreshed = get_admin_by_email(user_email)
    else:
        result = user_service.update_user(user_email, theme_updates)
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        refreshed = user_service.get_user_by_email(user_email)

    return {
        "success": True,
        "theme": payload.theme,
        "profile": _serialize_user(refreshed)
    }


# Update user online status
@router.post("/status/online")
def set_user_online(current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    user_role = current_user.get("role")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    if user_role == "admin":
        from ..services.admin_service import get_admin_by_email, update_admin
        admin = get_admin_by_email(user_email)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        update_admin(str(admin["_id"]), {"is_online": True})
    else:
        result = user_service.update_user(user_email, {"is_online": True})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User set to online"}

# Update user offline status
@router.post("/status/offline")
def set_user_offline(current_user=Depends(get_current_user)):
    user_email = current_user.get("sub")  # JWT stores email in 'sub' field
    user_role = current_user.get("role")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    if user_role == "admin":
        from ..services.admin_service import get_admin_by_email, update_admin
        admin = get_admin_by_email(user_email)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        update_admin(str(admin["_id"]), {"is_online": False})
    else:
        result = user_service.update_user(user_email, {"is_online": False})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User set to offline"}

# Users in same organization (requires auth) 
@router.get("/by_org")
def list_users_by_org(current_user=Depends(get_current_user)):
    org_id = current_user.get("org_id")
    current_user_id = current_user.get("user_id")
    
    # Get all users from users collection
    all_users = user_service.list_users()
    org_users = []
    for u in all_users:
        if u.get("organization_id") == org_id:
            # Add role field to distinguish from admins
            u["role"] = u.get("role", "user")
            org_users.append(u)
    
    # Get all admins from admins collection for the same organization
    from ..services.admin_service import get_admins_by_org
    org_admins = get_admins_by_org(org_id)
    
    # Combine users and admins, ensuring no duplicates
    all_org_members = org_users + org_admins
    
    # Remove duplicates based on _id
    seen_ids = set()
    unique_members = []
    for member in all_org_members:
        member_id = str(member.get("_id"))
        if member_id not in seen_ids:
            seen_ids.add(member_id)
            unique_members.append(member)
    
    # Sort users by most recent message timestamp
    def get_last_message_timestamp(user_id):
        from ..services.message_service import messages_collection
        from ..services.chat_service import chats_collection
        
        # Find direct chat between current user and this user
        chat = chats_collection.find_one({
            "type": "direct",
            "participants": {"$all": [current_user_id, user_id]},
            "organization_id": org_id
        })
        
        if not chat:
            return 0
        
        # Get the most recent message in this chat
        last_message = messages_collection.find_one(
            {"chat_id": str(chat["_id"])},
            sort=[("timestamp", -1)]
        )
        
        if last_message and last_message.get("timestamp"):
            # Handle both datetime objects and ISO strings
            timestamp = last_message["timestamp"]
            if hasattr(timestamp, 'timestamp'):
                return timestamp.timestamp()
            else:
                try:
                    from datetime import datetime
                    if isinstance(timestamp, str):
                        # Parse ISO string
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        return dt.timestamp()
                    else:
                        return 0
                except:
                    return 0
        return 0
    
    # Sort by last message timestamp (most recent first)
    unique_members.sort(key=lambda user: get_last_message_timestamp(str(user["_id"])), reverse=True)
    
    return unique_members

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
def signup_with_invite(user_data: dict):
    """
    Signup with invite code. Expects:
    {
        "username": str,
        "email": str,
        "password": str,
        "organization_id": str,
        "token": str
    }
    """
    org_id = user_data.get("organization_id") or user_data.get("org_id")
    token = user_data.get("token")
    
    if not org_id or not token:
        raise HTTPException(status_code=400, detail="organization_id and token are required")
    
    # verify invite
    if not org_service.consume_invite(org_id, token):
        raise HTTPException(status_code=400, detail="Invalid or expired invite")
    
    existing_user = user_service.get_user_by_email(user_data.get("email"))
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user with organization_id
    user_dict = {
        "username": user_data.get("username"),
        "email": user_data.get("email"),
        "password": user_data.get("password"),
        "organization_id": org_id,
        "role": "user"
    }
    
    # Hash the password before saving
    user_dict["password"] = generate_password_hash(user_dict["password"])
    result = user_service.create_user(user_dict)
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

@router.post("/fcm-token")  # ← Changed path to match frontend
async def save_fcm_token(
    token_data: FCMTokenUpdate,  # ← Changed to use Pydantic model
    current_user=Depends(get_current_user)
):
    """
    Save FCM token for push notifications.
    Called from frontend when user grants notification permission.
    """
    try:
        user_email = current_user.get("sub")
        user_role = current_user.get("role", "user")
        user_id = current_user.get("user_id")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        # Prepare update data
        update_data = {
            "fcm_token": token_data.fcm_token,
            "fcm_token_updated_at": datetime.utcnow()
        }
        
        # Update based on role
        if user_role == "admin":
            from ..services.admin_service import get_admin_by_email, update_admin, admin_collection
            admin = get_admin_by_email(user_email)
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            result = admin_collection.update_one(
                {"_id": ObjectId(str(admin["_id"]))},
                {"$set": update_data}
            )
        else:
            result = users_collection.update_one(
                {"email": user_email},
                {"$set": update_data}
            )
        
        if result.modified_count > 0 or result.matched_count > 0:
            print(f"✅ FCM token saved for {user_email} (role: {user_role})")
            return {
                "success": True,
                "message": "FCM token saved successfully",
                "user_id": user_id or str(admin.get("_id") if user_role == "admin" else None)
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to save FCM token"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error saving FCM token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error saving FCM token: {str(e)}"
        )


# Optional: Add DELETE endpoint for removing FCM token (on logout)
@router.delete("/fcm-token")
async def delete_fcm_token(current_user=Depends(get_current_user)):
    """Remove user's FCM token (e.g., on logout)"""
    try:
        user_email = current_user.get("sub")
        user_role = current_user.get("role", "user")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        if user_role == "admin":
            from ..services.admin_service import get_admin_by_email, admin_collection
            admin = get_admin_by_email(user_email)
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            admin_collection.update_one(
                {"_id": ObjectId(str(admin["_id"]))},
                {"$unset": {"fcm_token": "", "fcm_token_updated_at": ""}}
            )
        else:
            users_collection.update_one(
                {"email": user_email},
                {"$unset": {"fcm_token": "", "fcm_token_updated_at": ""}}
            )
        
        print(f"✅ FCM token removed for {user_email}")
        return {"success": True, "message": "FCM token removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting FCM token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting FCM token: {str(e)}"
        )