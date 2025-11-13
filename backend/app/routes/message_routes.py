from fastapi import APIRouter, HTTPException, Depends
from typing import List
import asyncio
from ..models.message import ChatMessage
from ..services.fcm_notification_service import fcm_service
from ..services.message_service import (
    send_message, get_messages, get_message, delete_message, update_message,
    mark_messages_as_delivered, mark_messages_as_read, update_message_status
)
from ..dependencies.auth import get_current_user
from ..services.chat_service import get_chat

router = APIRouter(prefix="/messages", tags=["Messages"])

# Send a message in a chat
@router.post("/send")
async def send_chat_message(message_data: dict, current_user=Depends(get_current_user)):
    chat_id = message_data.get("chat_id")
    message_text = message_data.get("message")
    message_type = message_data.get("message_type", "text")
    attachment = message_data.get("attachment")
    reply_to = message_data.get("reply_to")
    
    if not chat_id or not message_text:
        raise HTTPException(status_code=400, detail="chat_id and message are required")
    
    # Verify user has access to the chat
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
    
    if user_id not in chat.get("participants", []):
        raise HTTPException(status_code=403, detail="Access denied - not a participant")
    
    if chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied - wrong organization")
    
    # Create message object with sender_id automatically set
    from ..models.message import ChatMessage
    message = ChatMessage(
        chat_id=chat_id,
        sender_id=user_id,
        message=message_text,
        message_type=message_type,
        attachment=attachment,
        reply_to=reply_to
    )
    
    message_id = send_message(message)
    
    # Get the created message to return
    created_message = get_message(message_id)
    sender_name = "Unknown"
    if user.get("first_name") and user.get("last_name"):
        sender_name = f"{user['first_name']} {user['last_name']}"
    elif user.get("username"):
        sender_name = user["username"]
    else:
        sender_name = user.get("email", "Unknown")
    
    # Get recipient user IDs (everyone except sender)
    recipient_ids = [uid for uid in chat.get("participants", []) if uid != user_id]
    
    # Determine chat name for notifications (for group chats)
    chat_name = None
    if chat.get("type") == "group":
        chat_name = chat.get("group_name", "Group Chat")
    
    # 🚀 SEND INSTANT FCM NOTIFICATIONS (non-blocking, runs in background)
    try:
        
        # Create background task to send notifications
        # This runs asynchronously and doesn't block the response
        asyncio.create_task(
            fcm_service.send_notification_to_users(
                user_ids=recipient_ids,
                sender_name=sender_name,
                message_body=message_text,
                chat_id=chat_id,
                message_type=message_type,
                chat_name=chat_name,
                exclude_user_id=user_id
            )
        )
        
        print(f"✅ Message sent and FCM notifications triggered for {len(recipient_ids)} users")
        
    except Exception as e:
        # Don't fail the message send if notifications fail
        print(f"⚠️ Warning: Failed to send FCM notifications: {str(e)}")
    
    # ==================== END NEW CODE ====================
    
    return created_message

# Get all messages for a chat
@router.get("/chat/{chat_id}")
def fetch_messages(chat_id: str, current_user=Depends(get_current_user)):
    
    
    # Verify user has access to the chat
    chat = get_chat(chat_id)
    if not chat:
        # print(f"DEBUG FETCH: Chat not found for ID: {chat_id}")
        raise HTTPException(status_code=404, detail="Chat not found")
    
    
    # Get user ID from database using email
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    
    user_email = current_user.get("sub")
    # print(f"DEBUG FETCH: User email from token: {user_email}")
    
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not user:
        # print(f"DEBUG FETCH: User not found for email: {user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    # print(f"DEBUG FETCH: User ID from database: {user_id}")
    
    # Get user org_id from token
    user_org_id = current_user.get("org_id")
    # print(f"DEBUG FETCH: User org_id from token: {user_org_id}")
    
    if user_id not in chat.get("participants", []):
        raise HTTPException(status_code=403, detail="Access denied - not a participant")
    
    if chat.get("organization_id") != user_org_id:
        print(f"DEBUG FETCH: Org ID mismatch - chat: {chat.get('organization_id')}, user: {user_org_id}")
        raise HTTPException(status_code=403, detail="Access denied - wrong organization")
    
    print(f"DEBUG FETCH: All checks passed, fetching messages")
    messages = get_messages(chat_id)
    return messages

# Get a specific message
@router.get("/{message_id}")
def fetch_message(message_id: str, current_user=Depends(get_current_user)):
    msg = get_message(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user has access to the chat containing this message
    chat = get_chat(msg["chat_id"])
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
    
    return msg

# Update a specific message (edit content, mark read, etc.)
@router.put("/{message_id}")
def modify_message(message_id: str, updates: dict, current_user=Depends(get_current_user)):
    # Verify user has access to the message
    msg = get_message(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    chat = get_chat(msg["chat_id"])
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
    
    # Only allow sender to edit their own message
    if msg["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    
    success = update_message(message_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found or not updated")
    return {"message": "Message updated"}

# Delete a specific message
@router.delete("/{message_id}")
def remove_message(message_id: str, current_user=Depends(get_current_user)):
    # Verify user has access to the message
    msg = get_message(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    chat = get_chat(msg["chat_id"])
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
    
    # Only allow sender to delete their own message
    if msg["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    
    success = delete_message(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

# Mark messages as delivered
@router.post("/mark-delivered/{chat_id}")
def mark_delivered(chat_id: str, current_user=Depends(get_current_user)):
    # Verify user has access to the chat
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
    
    updated_count = mark_messages_as_delivered(chat_id, user_id)
    return {"message": f"Marked {updated_count} messages as delivered"}

# Mark messages as read
@router.post("/mark-read/{chat_id}")
def mark_read(chat_id: str, current_user=Depends(get_current_user)):
    # Verify user has access to the chat
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
    
    # Get username for the user
    from ..services.user_service import get_user_by_id
    from ..services.admin_service import get_admin_by_id
    user_obj = get_user_by_id(user_id) or get_admin_by_id(user_id)
    username = "User"
    if user_obj:
        username = user_obj.get("username") or user_obj.get("first_name") or user_obj.get("email", "User")
    
    updated_count = mark_messages_as_read(chat_id, user_id, username)
    return {"message": f"Marked {updated_count} messages as read"}

# Update specific message status
@router.put("/{message_id}/status")
def update_status(message_id: str, status_data: dict, current_user=Depends(get_current_user)):
    status = status_data.get("status")
    if not status or status not in ["sent", "delivered", "read"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'sent', 'delivered', or 'read'")
    
    # Verify user has access to the message
    msg = get_message(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    chat = get_chat(msg["chat_id"])
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
    
    success = update_message_status(message_id, status)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found or not updated")
    return {"message": f"Message status updated to {status}"}



@router.get("/chat/{chat_id}/unread-count")
def get_chat_unread_count(chat_id: str, current_user=Depends(get_current_user)):
    """
    Get unread message count for a specific chat.
    """
    from ..services.user_service import get_user_by_email
    from ..services.admin_service import get_admin_by_email
    from ..services.chat_service import get_chat
    from ..services.message_service import messages_collection
    
    # Verify user has access to the chat
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_email = current_user.get("sub")
    user = get_user_by_email(user_email) or get_admin_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    user_org_id = current_user.get("org_id")
    
    if user_id not in chat.get("participants", []) or chat.get("organization_id") != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count unread messages
    unread_count = messages_collection.count_documents({
        "chat_id": chat_id,
        "sender_id": {"$ne": user_id},
        "status": {"$in": ["sent", "delivered"]},
    })
    
    return {"chat_id": chat_id, "unread_count": unread_count}