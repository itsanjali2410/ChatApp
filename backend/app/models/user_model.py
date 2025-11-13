from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from zoneinfo import ZoneInfo

class FCMTokenUpdate(BaseModel):
    fcm_token: str
    timestamp: Optional[str] = None
    
class User(BaseModel):
    username: str
    email: EmailStr
    organization_id: Optional[str] = None
    password: str
    role: str = "user"
    created_at: datetime = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    # Profile fields
    profile_picture: Optional[str] = None
    selfie: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    
    # Status fields
    is_online: bool = False
    last_seen: Optional[datetime] = None
    is_typing: bool = False
    current_chat_id: Optional[str] = None