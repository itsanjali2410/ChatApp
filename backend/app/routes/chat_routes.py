from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..models.chat import Chat
from ..services.chat_service import (
    create_chat, get_chats_for_user, get_chat, update_chat, delete_chat
)
from ..dependencies.auth import get_current_user

router = APIRouter(prefix="/chats", tags=["Chats"])

# ✅ Create direct chat between two users
@router.post("/create-direct")
def create_direct_chat(payload: dict, current_user=Depends(get_current_user)):
    """Create a direct chat between current user and another user"""
    other_user_id = payload.get("other_user_id")
    if not other_user_id:
        raise HTTPException(status_code=400, detail="other_user_id is required")
    
    # Get current user ID from database
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    current_user_obj = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    current_user_id = str(current_user_obj["_id"])
    user_org_id = current_user.get("org_id")
    
    # Get other user details (check both users and admins)
    from ..services.user_service import get_user_by_id
    from ..services.admin_service import get_admin
    other_user = get_user_by_id(other_user_id) or get_admin(other_user_id)
    if not other_user:
        raise HTTPException(status_code=404, detail="Other user not found")
    
    # Check if other user is in same organization
    if other_user.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Cannot chat with users outside your organization")
    
    # Check if direct chat already exists between these users
    from ..services.chat_service import chats_collection
    existing_chat = chats_collection.find_one({
        "type": "direct",
        "participants": {"$all": [current_user_id, other_user_id]},
        "organization_id": user_org_id
    })
    
    if existing_chat:
        return {
            "id": str(existing_chat["_id"]),
            "type": existing_chat["type"],
            "participants": existing_chat["participants"],
            "organization_id": existing_chat["organization_id"]
        }
    
    # Create new direct chat
    chat_data = {
        "type": "direct",
        "participants": [current_user_id, other_user_id],
        "organization_id": user_org_id
    }
    
    from ..services.chat_service import create_chat
    chat_id = create_chat(chat_data)
    
    return {
        "id": chat_id,
        "type": "direct",
        "participants": [current_user_id, other_user_id],
        "organization_id": user_org_id
    }

# ✅ Start a new chat
@router.post("/")
def start_chat(chat: Chat, current_user=Depends(get_current_user)):
    # Get user ID from database using email
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    print(f"DEBUG: User email from token: {user_email}")
    print(f"DEBUG: Chat participants: {chat.participants}")
    print(f"DEBUG: Chat org_id: {chat.organization_id}")
    
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not user:
        print(f"DEBUG: User not found for email: {user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    print(f"DEBUG: User ID from database: {user_id}")
    
    # Ensure user is in the chat participants and organization matches
    if user_id not in chat.participants:
        print(f"DEBUG: User ID {user_id} not in participants {chat.participants}")
        raise HTTPException(status_code=400, detail="You must be a participant in the chat")
    
    # Verify organization_id matches user's organization
    user_org_id = current_user.get("org_id")
    print(f"DEBUG: User org_id from token: {user_org_id}")
    if chat.organization_id != user_org_id:
        print(f"DEBUG: Org ID mismatch - chat: {chat.organization_id}, user: {user_org_id}")
        raise HTTPException(status_code=403, detail="Cannot create chat outside your organization")
    
    # Check if chat already exists with these participants
    from ..services.chat_service import chats_collection
    existing_chat = chats_collection.find_one({
        "type": chat.type,
        "participants": {"$all": chat.participants},
        "organization_id": chat.organization_id
    })
    
    if existing_chat:
        print(f"DEBUG: Chat already exists: {existing_chat['_id']}")
        return {"message": "Chat already exists", "chat_id": str(existing_chat["_id"])}
    
    print(f"DEBUG: Creating new chat")
    chat_id = create_chat(chat)
    return {"message": "Chat created", "chat_id": chat_id}

# ✅ Get all chats of current user
@router.get("/my-chats")
def fetch_my_chats(current_user=Depends(get_current_user)):
    # Get user ID from database using email
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    chats = get_chats_for_user(user_id)
    # Filter by organization
    user_org_id = current_user.get("org_id")
    org_chats = [chat for chat in chats if chat.get("organization_id") == user_org_id]
    return org_chats

# ✅ Get specific chat details
@router.get("/{chat_id}")
def fetch_chat(chat_id: str, current_user=Depends(get_current_user)):
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get user ID from database using email
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    user_org_id = current_user.get("org_id")
    if user_id not in chat.get("participants", []) or chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return chat

# ✅ Update chat (rename group, add/remove users)
@router.put("/{chat_id}")
def modify_chat(chat_id: str, updates: dict, current_user=Depends(get_current_user)):
    # Verify user has access to chat
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_email = current_user.get("sub")
    user_org_id = current_user.get("org_id")
    if user_email not in chat.get("participants", []) or chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = update_chat(chat_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found or not updated")
    return {"message": "Chat updated"}

# ✅ Create group chat
@router.post("/create-group")
def create_group_chat(payload: dict, current_user=Depends(get_current_user)):
    """Create a group chat with multiple users"""
    group_name = payload.get("group_name")
    group_description = payload.get("group_description", "")
    participant_ids = payload.get("participant_ids", [])
    
    if not group_name:
        raise HTTPException(status_code=400, detail="group_name is required")
    
    if not participant_ids or len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 participants are required for group chat")
    
    # Get current user ID from database
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    current_user_obj = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    current_user_id = str(current_user_obj["_id"])
    user_org_id = current_user.get("org_id")
    
    # Add current user to participants if not already included
    if current_user_id not in participant_ids:
        participant_ids.append(current_user_id)
    
    # Verify all participants are in the same organization
    from ..services.user_service import get_user_by_id
    from ..services.admin_service import get_admin
    for user_id in participant_ids:
        # Check both users and admins
        user = get_user_by_id(user_id) or get_admin(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        if user.get("organization_id") != user_org_id:
            raise HTTPException(status_code=403, detail=f"User {user_id} is not in your organization")
    
    # Check if group chat already exists with these participants
    from ..services.chat_service import chats_collection
    existing_chat = chats_collection.find_one({
        "type": "group",
        "participants": {"$all": participant_ids, "$size": len(participant_ids)},
        "organization_id": user_org_id
    })
    
    if existing_chat:
        return {
            "id": str(existing_chat["_id"]),
            "type": existing_chat["type"],
            "participants": existing_chat["participants"],
            "organization_id": existing_chat["organization_id"],
            "group_name": existing_chat.get("group_name"),
            "group_description": existing_chat.get("group_description"),
            "created_by": existing_chat.get("created_by"),
            "admins": existing_chat.get("admins", [])
        }
    
    # Create new group chat
    chat_data = {
        "type": "group",
        "participants": participant_ids,
        "organization_id": user_org_id,
        "group_name": group_name,
        "group_description": group_description,
        "created_by": current_user_id,
        "admins": [current_user_id]  # Creator is admin by default
    }
    
    from ..services.chat_service import create_chat
    chat_id = create_chat(chat_data)
    
    return {
        "id": chat_id,
        "type": "group",
        "participants": participant_ids,
        "organization_id": user_org_id,
        "group_name": group_name,
        "group_description": group_description,
        "created_by": current_user_id,
        "admins": [current_user_id]
    }

# ✅ Add users to group chat
@router.post("/{chat_id}/add-members")
def add_members_to_group(chat_id: str, payload: dict, current_user=Depends(get_current_user)):
    """Add members to an existing group chat"""
    new_member_ids = payload.get("member_ids", [])
    
    if not new_member_ids:
        raise HTTPException(status_code=400, detail="member_ids is required")
    
    # Get current user ID
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    current_user_obj = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    current_user_id = str(current_user_obj["_id"])
    user_org_id = current_user.get("org_id")
    
    # Get chat details
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.get("type") != "group":
        raise HTTPException(status_code=400, detail="This is not a group chat")
    
    if chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if current user is admin or creator
    if current_user_id not in chat.get("admins", []) and current_user_id != chat.get("created_by"):
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    
    # Verify all new members are in the same organization
    from ..services.user_service import get_user_by_id
    for user_id in new_member_ids:
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        if user.get("organization_id") != user_org_id:
            raise HTTPException(status_code=403, detail=f"User {user_id} is not in your organization")
    
    # Add new members to participants (avoid duplicates)
    current_participants = set(chat.get("participants", []))
    new_participants = list(current_participants.union(set(new_member_ids)))
    
    # Update chat
    updates = {"participants": new_participants}
    success = update_chat(chat_id, updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add members")
    
    return {"message": "Members added successfully", "participants": new_participants}

# ✅ Remove users from group chat
@router.post("/{chat_id}/remove-members")
def remove_members_from_group(chat_id: str, payload: dict, current_user=Depends(get_current_user)):
    """Remove members from an existing group chat"""
    member_ids_to_remove = payload.get("member_ids", [])
    
    if not member_ids_to_remove:
        raise HTTPException(status_code=400, detail="member_ids is required")
    
    # Get current user ID
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    current_user_obj = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    current_user_id = str(current_user_obj["_id"])
    user_org_id = current_user.get("org_id")
    
    # Get chat details
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.get("type") != "group":
        raise HTTPException(status_code=400, detail="This is not a group chat")
    
    if chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if current user is admin or creator
    if current_user_id not in chat.get("admins", []) and current_user_id != chat.get("created_by"):
        raise HTTPException(status_code=403, detail="Only group admins can remove members")
    
    # Remove members from participants
    current_participants = chat.get("participants", [])
    new_participants = [p for p in current_participants if p not in member_ids_to_remove]
    
    # Ensure at least 2 members remain (minimum for group)
    if len(new_participants) < 2:
        raise HTTPException(status_code=400, detail="Group must have at least 2 members")
    
    # Remove from admins if they were admins
    current_admins = chat.get("admins", [])
    new_admins = [a for a in current_admins if a not in member_ids_to_remove]
    
    # Update chat
    updates = {
        "participants": new_participants,
        "admins": new_admins
    }
    success = update_chat(chat_id, updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove members")
    
    return {"message": "Members removed successfully", "participants": new_participants}

# ✅ Update group info
@router.put("/{chat_id}/group-info")
def update_group_info(chat_id: str, payload: dict, current_user=Depends(get_current_user)):
    """Update group name and description"""
    group_name = payload.get("group_name")
    group_description = payload.get("group_description")
    
    # Get current user ID
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    current_user_obj = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    current_user_id = str(current_user_obj["_id"])
    user_org_id = current_user.get("org_id")
    
    # Get chat details
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.get("type") != "group":
        raise HTTPException(status_code=400, detail="This is not a group chat")
    
    if chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if current user is admin or creator
    if current_user_id not in chat.get("admins", []) and current_user_id != chat.get("created_by"):
        raise HTTPException(status_code=403, detail="Only group admins can update group info")
    
    # Update group info
    updates = {}
    if group_name is not None:
        updates["group_name"] = group_name
    if group_description is not None:
        updates["group_description"] = group_description
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    success = update_chat(chat_id, updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update group info")
    
    return {"message": "Group info updated successfully"}

# ✅ Delete chat
@router.delete("/{chat_id}")
def remove_chat(chat_id: str, current_user=Depends(get_current_user)):
    # Verify user has access to chat
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_email = current_user.get("sub")
    user_org_id = current_user.get("org_id")
    if user_email not in chat.get("participants", []) or chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = delete_chat(chat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Chat deleted"}
