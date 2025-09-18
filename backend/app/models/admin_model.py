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
    

