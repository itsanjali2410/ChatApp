from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Chat(BaseModel):
    id: Optional[str]
    type: str  # "direct" or "group"
    participants: List[str]  # user_ids
    organization_id: str
    created_at: datetime = datetime.utcnow()
    last_message: Optional[str] = None
