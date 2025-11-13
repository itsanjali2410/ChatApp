from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from zoneinfo import ZoneInfo

class Admin(BaseModel):
    username: str
    email: EmailStr
    password: str   
    org_name: Optional[str] = None
    created_at: datetime = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    # Profile fields (optional)
    profile_picture: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    
    # Status fields
    is_online: bool = False
    last_seen: Optional[datetime] = None
    is_typing: bool = False
    current_chat_id: Optional[str] = None
    

