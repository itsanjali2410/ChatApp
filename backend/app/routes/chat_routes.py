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
    
    # Get other user details
    from ..services.user_service import get_user_by_id
    other_user = get_user_by_id(other_user_id)
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
