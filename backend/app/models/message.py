from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

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
    id: Optional[str]
    chat_id: str
    sender_id: str
    message: str
    message_type: str  # "text", "image", "file"
    attachment: Optional[FileAttachment] = None
    status: MessageStatus = MessageStatus.sent
    timestamp: datetime = datetime.utcnow()
