from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from zoneinfo import ZoneInfo
from enum import Enum

class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

class Note(BaseModel):
    id: str
    author: str
    author_id: str
    content: str
    createdAt: datetime

class TicketMessage(BaseModel):
    id: str
    author: str
    author_id: str
    content: str
    attachment: Optional[dict] = None  # { name: str, url: str }
    createdAt: datetime

class Ticket(BaseModel):
    id: Optional[str] = None
    name: str  # Subject/Name
    pocName: str  # Point of Contact Name
    mobile: str
    destination: str
    pax: Optional[int] = None  # Total passengers (for backward compatibility)
    adults: Optional[int] = None  # Number of adults
    children: Optional[int] = None  # Number of children
    infants: int
    body: str  # Request body/description
    status: TicketStatus = TicketStatus.OPEN
    travelDate: datetime
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    
    # Organization and user tracking
    organization_id: str
    created_by: str  # User ID who created the ticket
    assigned_to: Optional[str] = None  # User ID assigned to handle ticket
    pocId: Optional[str] = None  # User ID of the POC
    
    # Communication and notes
    notes: List[Note] = []
    communication: List[TicketMessage] = []

class TicketCreate(BaseModel):
    name: str
    pocName: str
    mobile: str
    destination: str
    pax: Optional[int] = None  # For backward compatibility
    adults: Optional[int] = None
    children: Optional[int] = None
    infants: int
    body: str
    travelDate: str  # ISO string
    pocId: Optional[str] = None  # User ID of the POC

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[str] = None

class NoteCreate(BaseModel):
    content: str

class TicketMessageCreate(BaseModel):
    content: str
    attachment: Optional[dict] = None

