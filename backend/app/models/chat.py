from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

class Chat(BaseModel):
    id: Optional[str]
    type: str  # "direct" or "group"
    participants: List[str]  # user_ids
    organization_id: str
    created_at: datetime = datetime.now(ZoneInfo("Asia/Kolkata"))
    last_message: Optional[str] = None
    # Group-specific fields
    group_name: Optional[str] = None
    group_description: Optional[str] = None
    group_avatar: Optional[str] = None
    created_by: Optional[str] = None  # user_id who created the group
    admins: List[str] = []  # user_ids who are group admins
