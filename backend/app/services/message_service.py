from ..config import db
from bson import ObjectId
from datetime import datetime
from ..models.message import ChatMessage
from typing import List, Optional
from zoneinfo import ZoneInfo
messages_collection = db["messages"]

def send_message(message: ChatMessage) -> str:
    message_dict = message.dict()
    timestamp = datetime.now(ZoneInfo("Asia/Kolkata"))
    message_dict["timestamp"] = timestamp
    
    # Debug current time
    from datetime import datetime
    utc_now = datetime.utcnow()
    ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    print(f"🔍 TIME DEBUG:")
    print(f"  - UTC now: {utc_now}")
    print(f"  - IST now: {ist_now}")
    print(f"  - IST timezone: {ist_now.tzinfo}")
    print(f"  - IST ISO: {ist_now.isoformat()}")
    print(f"  - Storing timestamp: {timestamp}")
    print(f"  - Full message: {message_dict}")
    
    result = messages_collection.insert_one(message_dict)
    print(f"🔍 Message saved with ID: {result.inserted_id}")
    return str(result.inserted_id)

def get_messages(chat_id: str) -> List[dict]:
    messages = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    result = []
    for msg in messages:
        # Convert datetime to ISO string with timezone info
        timestamp = msg["timestamp"]
        print(f"🔍 Original timestamp: {timestamp}, type: {type(timestamp)}")
        if hasattr(timestamp, 'isoformat'):
            timestamp_str = timestamp.isoformat()
            print(f"🔍 ISO format: {timestamp_str}")
        else:
            timestamp_str = str(timestamp)
            print(f"🔍 String format: {timestamp_str}")
        print(f"🔍 Final timestamp string: {timestamp_str}")
            
        processed_msg = {
            "id": str(msg["_id"]),
            "chat_id": msg["chat_id"],
            "sender_id": msg["sender_id"],
            "message": msg["message"],
            "message_type": msg["message_type"],
            "attachment": msg.get("attachment"),  # Include attachment data
            "timestamp": timestamp_str,
            "status": msg["status"]
        }
        if processed_msg["attachment"]:
            print(f"🔍 Message with attachment: {processed_msg['id']} - {processed_msg['attachment']}")
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
