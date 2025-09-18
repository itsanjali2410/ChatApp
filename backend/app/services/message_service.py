from ..config import db
from bson import ObjectId
from datetime import datetime
from ..models.message import ChatMessage
from typing import List, Optional

messages_collection = db["messages"]

def send_message(message: ChatMessage) -> str:
    message_dict = message.dict()
    message_dict["timestamp"] = datetime.utcnow()
    print(f"🔍 Saving message to database: {message_dict}")
    result = messages_collection.insert_one(message_dict)
    print(f"🔍 Message saved with ID: {result.inserted_id}")
    return str(result.inserted_id)

def get_messages(chat_id: str) -> List[dict]:
    messages = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    result = []
    for msg in messages:
        processed_msg = {
            "id": str(msg["_id"]),
            "chat_id": msg["chat_id"],
            "sender_id": msg["sender_id"],
            "message": msg["message"],
            "message_type": msg["message_type"],
            "attachment": msg.get("attachment"),  # Include attachment data
            "timestamp": msg["timestamp"],
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
    return msg

def delete_message(message_id: str) -> bool:
    result = messages_collection.delete_one({"_id": ObjectId(message_id)})
    return result.deleted_count > 0

def update_message(message_id: str, updates: dict) -> bool:
    result = messages_collection.update_one({"_id": ObjectId(message_id)}, {"$set": updates})
    return result.modified_count > 0
