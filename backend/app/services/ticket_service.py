from bson import ObjectId
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Optional
from ..config import db
from ..models.ticket_model import Ticket, TicketStatus, Note, TicketMessage

tickets_collection = db["tickets"]

def create_ticket(ticket_data: dict) -> str:
    """Create a new ticket and return its ID"""
    ticket_data["createdAt"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    ticket_data["updatedAt"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    ticket_data["notes"] = []
    ticket_data["communication"] = []
    
    # Generate ticket ID
    count = tickets_collection.count_documents({})
    ticket_id = f"TKT-{str(count + 1).zfill(3)}"
    ticket_data["id"] = ticket_id
    
    result = tickets_collection.insert_one(ticket_data)
    return str(result.inserted_id)

def get_ticket_by_id(ticket_id: str) -> Optional[dict]:
    """Get ticket by MongoDB _id"""
    try:
        ticket = tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        if ticket:
            ticket["_id"] = str(ticket["_id"])
        return ticket
    except:
        return None

def get_ticket_by_ticket_id(ticket_id: str) -> Optional[dict]:
    """Get ticket by ticket ID (TKT-001 format)"""
    ticket = tickets_collection.find_one({"id": ticket_id})
    if ticket:
        ticket["_id"] = str(ticket["_id"])
    return ticket

def get_tickets_by_org(organization_id: str) -> List[dict]:
    """Get all tickets for an organization"""
    tickets = list(tickets_collection.find({"organization_id": organization_id}).sort("createdAt", -1))
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
    return tickets

def get_tickets_by_user(user_id: str) -> List[dict]:
    """Get all tickets created by a user"""
    tickets = list(tickets_collection.find({"created_by": user_id}).sort("createdAt", -1))
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
    return tickets

def update_ticket(ticket_id: str, update_data: dict) -> bool:
    """Update ticket fields"""
    update_data["updatedAt"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

def add_note_to_ticket(ticket_id: str, note_data: dict) -> bool:
    """Add a note to a ticket"""
    note_data["id"] = f"N-{int(datetime.now().timestamp() * 1000)}"
    note_data["createdAt"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$push": {"notes": note_data},
            "$set": {"updatedAt": datetime.now(ZoneInfo("Asia/Kolkata"))}
        }
    )
    return result.modified_count > 0

def add_message_to_ticket(ticket_id: str, message_data: dict) -> bool:
    """Add a message to ticket communication"""
    message_data["id"] = f"C-{int(datetime.now().timestamp() * 1000)}"
    message_data["createdAt"] = datetime.now(ZoneInfo("Asia/Kolkata"))
    
    result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$push": {"communication": message_data},
            "$set": {"updatedAt": datetime.now(ZoneInfo("Asia/Kolkata"))}
        }
    )
    return result.modified_count > 0

def delete_ticket(ticket_id: str) -> bool:
    """Delete a ticket"""
    result = tickets_collection.delete_one({"_id": ObjectId(ticket_id)})
    return result.deleted_count > 0

