from pydantic import BaseModel
from typing import List, Optional

class Organization(BaseModel):
    org_name: str
    description: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    admin_id: str
    user_ids: List[str] = []

