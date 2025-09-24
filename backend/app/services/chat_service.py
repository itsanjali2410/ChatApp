from ..config import db
from bson import ObjectId
from datetime import datetime
from ..models.chat import Chat
from typing import List, Optional
from zoneinfo import ZoneInfo

chats_collection = db["chats"]

def create_chat(chat: Chat) -> str:
    if hasattr(chat, "dict"):
        chat_dict = chat.dict()
    else:
        chat_dict = chat
    chat_dict["created_at"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    result = chats_collection.insert_one(chat_dict)
    return str(result.inserted_id)

def get_chats_for_user(user_id: str) -> List[dict]:
    chats = chats_collection.find({"participants": user_id})
    return [
        {
            "id": str(chat["_id"]),
            "type": chat["type"],
            "participants": chat["participants"],
            "organization_id": chat["organization_id"],
            "last_message": chat.get("last_message"),
            "created_at": chat["created_at"],
            "group_name": chat.get("group_name"),
            "group_description": chat.get("group_description"),
            "group_avatar": chat.get("group_avatar"),
            "created_by": chat.get("created_by"),
            "admins": chat.get("admins", [])
        }
        for chat in chats
    ]

def get_chat(chat_id: str) -> Optional[dict]:
    chat = chats_collection.find_one({"_id": ObjectId(chat_id)})
    if chat:
        chat["id"] = str(chat["_id"])
        del chat["_id"]
        # Ensure group fields are included
        if "group_name" not in chat:
            chat["group_name"] = None
        if "group_description" not in chat:
            chat["group_description"] = None
        if "group_avatar" not in chat:
            chat["group_avatar"] = None
        if "created_by" not in chat:
            chat["created_by"] = None
        if "admins" not in chat:
            chat["admins"] = []
    return chat

def update_chat(chat_id: str, updates: dict) -> bool:
    result = chats_collection.update_one({"_id": ObjectId(chat_id)}, {"$set": updates})
    return result.modified_count > 0

def delete_chat(chat_id: str) -> bool:
    result = chats_collection.delete_one({"_id": ObjectId(chat_id)})
    return result.deleted_count > 0
