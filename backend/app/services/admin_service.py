from ..config import db
from bson import ObjectId
from werkzeug.security import generate_password_hash

admin_collection = db["admins"]
org_collection = db["organizations"]

def get_admin_by_email(email: str):
    return admin_collection.find_one({"email": email})

def create_admin(admin_data: dict, org_data: dict):
    """Create admin and organization, linking both directions.
    - Hash admin password before storing
    - Insert admin first so org can reference admin_id
    - Then insert org and update admin with organization_id
    """
    # ensure password is hashed
    if admin_data.get("password"):
        admin_data["password"] = generate_password_hash(admin_data["password"])

    # insert admin
    admin_insert_result = admin_collection.insert_one(admin_data)
    admin_id_str = str(admin_insert_result.inserted_id)

    # insert org linked to admin
    org_data = {**org_data, "admin_id": admin_id_str}
    org_insert_result = org_collection.insert_one(org_data)
    org_id_str = str(org_insert_result.inserted_id)

    # back-link admin to org
    admin_collection.update_one({"_id": admin_insert_result.inserted_id}, {"$set": {"organization_id": org_id_str}})

    return admin_insert_result, org_insert_result

def get_admin(admin_id: str):
    admin = admin_collection.find_one({"_id": ObjectId(admin_id)})
    if admin:
        admin["_id"] = str(admin["_id"])
    return admin

def update_admin(admin_id: str, updates: dict):
    """Update admin by ID"""
    result = admin_collection.update_one({"_id": ObjectId(admin_id)}, {"$set": updates})
    return result.modified_count > 0

def get_admins_by_org(org_id: str):
    """Get all admins in a specific organization"""
    admins = []
    for admin in admin_collection.find({"organization_id": org_id}):
        admin["_id"] = str(admin["_id"])
        # Add role field to distinguish from regular users
        admin["role"] = "admin"
        
        # Add missing fields that frontend expects for user display
        admin["first_name"] = admin.get("first_name") or admin.get("username", "").split()[0] if admin.get("username") else ""
        admin["last_name"] = admin.get("last_name") or ""
        admin["profile_picture"] = admin.get("profile_picture")
        admin["is_online"] = admin.get("is_online", False)
        admin["is_typing"] = admin.get("is_typing", False)
        admin["current_chat_id"] = admin.get("current_chat_id")
        
        admins.append(admin)
    return admins