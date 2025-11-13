from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from zoneinfo import ZoneInfo

class MessageStatus(str, Enum):
    sent = "sent"
    delivered = "delivered"
    read = "read"

class FileAttachment(BaseModel):
    file_id: str
    filename: str
    file_type: str  # "image" or "document"
    file_url: str
    thumbnail_url: Optional[str] = None
    size: int

class ChatMessage(BaseModel):
    id: Optional[str] = None
    chat_id: str
    sender_id: str
    message: str
    message_type: str  # "text", "image", "file"
    attachment: Optional[FileAttachment] = None
    status: MessageStatus = MessageStatus.sent
    timestamp: Optional[datetime] = None
    seen_at: Optional[datetime] = None
    seenBy: Optional[str] = None  # User ID who saw the message
    reply_to: Optional[Dict[str, Any]] = None  # Reply to another message
