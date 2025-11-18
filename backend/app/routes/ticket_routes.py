from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from bson import ObjectId
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List
from ..models.ticket_model import (
    Ticket, TicketCreate, TicketUpdate, TicketStatus,
    NoteCreate, TicketMessageCreate
)
from ..services.ticket_service import (
    create_ticket, get_ticket_by_id, get_ticket_by_ticket_id,
    get_tickets_by_org, get_tickets_by_user, update_ticket,
    add_note_to_ticket, add_message_to_ticket, delete_ticket
)
from ..dependencies.auth import get_current_user, get_current_admin
from ..services.user_service import get_user_by_id
from ..services.admin_service import get_admin
from ..websocket_manager import manager

router = APIRouter(prefix="/tickets", tags=["Tickets"])

def _serialize_ticket(ticket: dict) -> dict:
    """Serialize ticket for JSON response"""
    if not ticket:
        return {}
    serialized = {**ticket}
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])
    # Convert datetime objects to ISO strings
    for field in ["createdAt", "updatedAt", "travelDate"]:
        if field in serialized and isinstance(serialized[field], datetime):
            serialized[field] = serialized[field].isoformat()
    # Serialize notes and communication
    if "notes" in serialized:
        for note in serialized["notes"]:
            if "createdAt" in note and isinstance(note["createdAt"], datetime):
                note["createdAt"] = note["createdAt"].isoformat()
    if "communication" in serialized:
        for msg in serialized["communication"]:
            if "createdAt" in msg and isinstance(msg["createdAt"], datetime):
                msg["createdAt"] = msg["createdAt"].isoformat()
    return serialized

@router.post("/create")
async def create_new_ticket(
    ticket_data: TicketCreate,
    current_user=Depends(get_current_user)
):
    """Create a new ticket"""
    import logging
    logger = logging.getLogger("chatapp")
    try:
        logger.info(f"✅ Pydantic validation passed. Received ticket data: {ticket_data.dict()}")
    except Exception as e:
        logger.error(f"❌ Error accessing ticket_data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")
    
    try:
        # Get user's organization
        user = get_user_by_id(current_user["_id"])
        if not user or "organization_id" not in user:
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user["organization_id"]
        
        # Parse travel date - handle different date formats
        try:
            travel_date_str = ticket_data.travelDate
            # Handle ISO format with or without timezone
            if 'Z' in travel_date_str:
                travel_date = datetime.fromisoformat(travel_date_str.replace('Z', '+00:00'))
            elif '+' in travel_date_str or travel_date_str.count('-') >= 2:
                # Already has timezone or is ISO format
                travel_date = datetime.fromisoformat(travel_date_str)
            else:
                # Assume YYYY-MM-DD format and add time
                travel_date = datetime.fromisoformat(travel_date_str + 'T00:00:00')
        except Exception as date_error:
            raise HTTPException(status_code=400, detail=f"Invalid travel date format: {str(date_error)}")
        
        # Calculate pax if not provided (for backward compatibility)
        pax = ticket_data.pax
        if pax is None:
            adults = ticket_data.adults or 0
            children = ticket_data.children or 0
            pax = adults + children
        
        ticket_dict = {
            **ticket_data.dict(),
            "travelDate": travel_date,
            "organization_id": org_id,
            "created_by": current_user["_id"],
            "status": TicketStatus.OPEN.value,
            "pax": pax  # Ensure pax is set for backward compatibility
        }
        
        ticket_id = create_ticket(ticket_dict)
        ticket = get_ticket_by_id(ticket_id)
        
        # Broadcast ticket creation to organization members
        import asyncio
        asyncio.create_task(manager.broadcast_to_org(org_id, {
            "type": "ticket_created",
            "ticket": _serialize_ticket(ticket)
        }, exclude_user=current_user["_id"]))
        
        return _serialize_ticket(ticket)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = str(e)
        print(f"Error creating ticket: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to create ticket: {error_detail}")

@router.get("/")
async def get_my_tickets(current_user=Depends(get_current_user)):
    """Get all tickets for the current user's organization"""
    try:
        user = get_user_by_id(current_user["_id"])
        if not user or "organization_id" not in user:
            return []
        
        org_id = user["organization_id"]
        tickets = get_tickets_by_org(org_id)
        
        return [_serialize_ticket(ticket) for ticket in tickets]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-created")
async def get_tickets_i_created(current_user=Depends(get_current_user)):
    """Get tickets created by the current user"""
    try:
        tickets = get_tickets_by_user(current_user["_id"])
        return [_serialize_ticket(ticket) for ticket in tickets]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, current_user=Depends(get_current_user)):
    """Get a specific ticket by ID"""
    try:
        # Try MongoDB _id first
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            # Try ticket ID format (TKT-001)
            ticket = get_ticket_by_ticket_id(ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check if user has access (same organization)
        user = get_user_by_id(current_user["_id"])
        if not user or "organization_id" not in user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if ticket.get("organization_id") != user["organization_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return _serialize_ticket(ticket)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{ticket_id}")
async def update_ticket_status(
    ticket_id: str,
    update_data: TicketUpdate,
    current_user=Depends(get_current_user)
):
    """Update ticket status or assignment"""
    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            ticket = get_ticket_by_ticket_id(ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check access
        user = get_user_by_id(current_user["_id"])
        if not user or "organization_id" not in user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if ticket.get("organization_id") != user["organization_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_dict = {}
        if update_data.status:
            update_dict["status"] = update_data.status.value
        if update_data.assigned_to:
            update_dict["assigned_to"] = update_data.assigned_to
        
        # Use MongoDB _id for update
        mongo_id = ticket.get("_id")
        if isinstance(mongo_id, str):
            mongo_id = ObjectId(mongo_id)
        
        success = update_ticket(str(mongo_id), update_dict)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update ticket")
        
        updated_ticket = get_ticket_by_id(str(mongo_id))
        serialized = _serialize_ticket(updated_ticket)
        
        # Broadcast ticket update to organization members
        import asyncio
        asyncio.create_task(manager.broadcast_to_org(ticket.get("organization_id"), {
            "type": "ticket_updated",
            "ticket": serialized
        }))
        
        return serialized
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ticket_id}/notes")
async def add_note(
    ticket_id: str,
    note_data: NoteCreate,
    current_user=Depends(get_current_user)
):
    """Add a note to a ticket"""
    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            ticket = get_ticket_by_ticket_id(ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get user info for note author
        user = get_user_by_id(current_user["_id"])
        user_name = user.get("first_name") or user.get("username") or "Unknown"
        
        note_dict = {
            "author": user_name,
            "author_id": current_user["_id"],
            "content": note_data.content
        }
        
        mongo_id = ticket.get("_id")
        if isinstance(mongo_id, str):
            mongo_id = ObjectId(mongo_id)
        
        success = add_note_to_ticket(str(mongo_id), note_dict)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add note")
        
        updated_ticket = get_ticket_by_id(str(mongo_id))
        serialized = _serialize_ticket(updated_ticket)
        
        # Broadcast ticket update
        import asyncio
        asyncio.create_task(manager.broadcast_to_org(ticket.get("organization_id"), {
            "type": "ticket_updated",
            "ticket": serialized
        }))
        
        return serialized
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ticket_id}/messages")
async def add_message(
    ticket_id: str,
    message_data: TicketMessageCreate,
    current_user=Depends(get_current_user)
):
    """Add a message to ticket communication"""
    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            ticket = get_ticket_by_ticket_id(ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get user info for message author
        user = get_user_by_id(current_user["_id"])
        user_name = user.get("first_name") or user.get("username") or "Unknown"
        
        message_dict = {
            "author": user_name,
            "author_id": current_user["_id"],
            "content": message_data.content,
            "attachment": message_data.attachment
        }
        
        mongo_id = ticket.get("_id")
        if isinstance(mongo_id, str):
            mongo_id = ObjectId(mongo_id)
        
        success = add_message_to_ticket(str(mongo_id), message_dict)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add message")
        
        updated_ticket = get_ticket_by_id(str(mongo_id))
        serialized = _serialize_ticket(updated_ticket)
        
        # Broadcast ticket message update
        import asyncio
        asyncio.create_task(manager.broadcast_to_org(ticket.get("organization_id"), {
            "type": "ticket_message_added",
            "ticket": serialized
        }))
        
        return serialized
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{ticket_id}")
async def delete_ticket_endpoint(
    ticket_id: str,
    current_user=Depends(get_current_user)
):
    """Delete a ticket (only by creator or admin)"""
    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            ticket = get_ticket_by_ticket_id(ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check if user is creator
        if ticket.get("created_by") != current_user["_id"]:
            raise HTTPException(status_code=403, detail="Only ticket creator can delete")
        
        mongo_id = ticket.get("_id")
        if isinstance(mongo_id, str):
            mongo_id = ObjectId(mongo_id)
        
        success = delete_ticket(str(mongo_id))
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete ticket")
        
        return {"message": "Ticket deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

