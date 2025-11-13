from huggingface_hub import create_collection
from ..config import db
from bson import ObjectId
from datetime import datetime
from ..models.message import ChatMessage
from typing import List, Optional
from zoneinfo import ZoneInfo
messages_collection = db["messages"]

def send_message(message: ChatMessage) -> str:
    message_dict = message.dict()
    # Use UTC timestamp for consistency across timezones
    timestamp = datetime.utcnow()
    message_dict["timestamp"] = timestamp.isoformat() + "Z"  # Add Z to indicate UTC

    # Debug current time
    utc_now = datetime.utcnow()
    ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    print(f"TIME DEBUG:")
    print(f"  - UTC now: {utc_now}")
    print(f"  - IST now: {ist_now}")
    print(f"  - Storing UTC timestamp: {timestamp.isoformat()}Z")
    print(f"  - Full message: {message_dict}")
    
    result = messages_collection.insert_one(message_dict)
    print(f"Message saved with ID: {result.inserted_id}")
    return str(result.inserted_id)

def get_messages(chat_id: str) -> List[dict]:
    messages = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    result = []
    for msg in messages:
        # Handle timestamp - could be datetime object or ISO string
        timestamp = msg["timestamp"]
        if isinstance(timestamp, str):
            # Already a string, use as is
            timestamp_str = timestamp
        elif hasattr(timestamp, 'isoformat'):
            # Convert datetime to ISO string
            timestamp_str = timestamp.isoformat()
            if not timestamp_str.endswith('Z') and not '+' in timestamp_str:
                timestamp_str += 'Z'  # Add Z if not present
        else:
            timestamp_str = str(timestamp)
            
        # Normalize seenBy to always be an array
        seen_by = msg.get("seenBy")
        if isinstance(seen_by, str):
            # Legacy format - convert to array format
            seen_by = [{"user_id": seen_by, "username": "User", "seen_at": msg.get("seen_at")}]
        elif not isinstance(seen_by, list):
            seen_by = []
        
        processed_msg = {
            "id": str(msg["_id"]),
            "chat_id": msg["chat_id"],
            "sender_id": msg["sender_id"],
            "message": msg["message"],
            "message_type": msg["message_type"],
            "attachment": msg.get("attachment"),  # Include attachment data
            "timestamp": timestamp_str,
            "status": msg.get("status", "sent"),
            "seen_at": msg.get("seen_at"),
            "seenBy": seen_by,  # Always an array now
            "reply_to": msg.get("reply_to")  # Include reply_to data
        }
        if processed_msg["attachment"]:
            print(f"Message with attachment: {processed_msg['id']} - {processed_msg['attachment']}")
        result.append(processed_msg)
    return result

def get_message(message_id: str) -> Optional[dict]:
    msg = messages_collection.find_one({"_id": ObjectId(message_id)})
    if msg:
        msg["id"] = str(msg["_id"])
        del msg["_id"]
        # Ensure attachment data is included
        if "attachment" not in msg:
            msg["attachment"] = None
        # Ensure reply_to data is included
        if "reply_to" not in msg:
            msg["reply_to"] = None
        # Convert timestamp to ISO string
        if "timestamp" in msg and hasattr(msg["timestamp"], 'isoformat'):
            msg["timestamp"] = msg["timestamp"].isoformat()
    return msg

def delete_message(message_id: str) -> bool:
    result = messages_collection.delete_one({"_id": ObjectId(message_id)})
    return result.deleted_count > 0

def update_message(message_id: str, updates: dict) -> bool:
    result = messages_collection.update_one({"_id": ObjectId(message_id)}, {"$set": updates})
    return result.modified_count > 0

def update_message_status(message_id: str, status: str) -> bool:
    """Update the status of a specific message"""
    result = messages_collection.update_one(
        {"_id": ObjectId(message_id)}, 
        {"$set": {"status": status}}
    )
    return result.modified_count > 0

def mark_messages_as_delivered(chat_id: str, sender_id: str) -> int:
    """Mark all messages in a chat as delivered (except sender's own messages)"""
    result = messages_collection.update_many(
        {
            "chat_id": chat_id,
            "sender_id": {"$ne": sender_id},
            "status": "sent"
        },
        {"$set": {"status": "delivered"}}
    )
    return result.modified_count

def mark_messages_as_read(chat_id: str, user_id: str, username: str = None) -> int:
    """Mark all messages in a chat as read (except user's own messages)
    For group chats, appends the user to the seenBy array instead of replacing it.
    """
    from datetime import datetime
    from ..services.user_service import get_user_by_id
    from ..services.admin_service import get_admin_by_id
    
    seen_timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Get username if not provided
    if not username:
        user = get_user_by_id(user_id) or get_admin_by_id(user_id)
        if user:
            username = user.get("username") or user.get("first_name", "User")
        else:
            username = "User"
    
    # Find messages that need to be updated
    messages_to_update = messages_collection.find({
        "chat_id": chat_id,
        "sender_id": {"$ne": user_id},
        "status": {"$in": ["sent", "delivered"]}
    })
    
    updated_count = 0
    for msg in messages_to_update:
        # Get existing seenBy array or initialize as empty
        existing_seen_by = msg.get("seenBy", [])
        
        # Convert to list if it's a string (legacy format)
        if isinstance(existing_seen_by, str):
            existing_seen_by = []
        elif not isinstance(existing_seen_by, list):
            existing_seen_by = []
        
        # Check if user already in seenBy
        user_already_seen = any(
            (isinstance(seen_user, dict) and seen_user.get("user_id") == user_id) or
            (isinstance(seen_user, str) and seen_user == user_id)
            for seen_user in existing_seen_by
        )
        
        if not user_already_seen:
            # Add user to seenBy array
            new_seen_entry = {
                "user_id": user_id,
                "username": username,
                "seen_at": seen_timestamp
            }
            existing_seen_by.append(new_seen_entry)
            
            # Update the message
            messages_collection.update_one(
                {"_id": msg["_id"]},
                {
                    "$set": {
                        "status": "read",
                        "seen_at": seen_timestamp,
                        "seenBy": existing_seen_by
                    }
                }
            )
            updated_count += 1
    
    return updated_count

