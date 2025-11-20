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
    
    user_id_for_log = current_user.get("_id") or current_user.get("user_id")
    logger.info(f"📥 Received ticket creation request from user: {user_id_for_log}")
    try:
        ticket_dict_data = ticket_data.dict()
        logger.info(f"✅ Pydantic validation passed. Ticket data: {ticket_dict_data}")
    except Exception as e:
        logger.error(f"❌ Error accessing ticket_data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")
    
    try:
        # Get user's organization - check both users and admins
        user_id = current_user.get("_id") or current_user.get("user_id")
        user_role = current_user.get("role")
        org_id_from_token = current_user.get("org_id")
        
        logger.info(f"🔍 Token info - user_id: {user_id}, role: {user_role}, org_id from token: {org_id_from_token}")
        
        if not user_id:
            logger.error(f"❌ No user_id or _id found in token")
            raise HTTPException(status_code=400, detail="Invalid token: missing user ID")
        
        # Try to get user/admin from database
        user = None
        try:
            if user_role == "admin":
                try:
                    from bson import ObjectId
                    # Validate ObjectId format
                    if not ObjectId.is_valid(user_id):
                        logger.error(f"❌ Invalid ObjectId format for admin: {user_id}")
                        raise HTTPException(status_code=400, detail=f"Invalid admin ID format: {user_id}")
                    user = get_admin(user_id)
                    logger.info(f"👤 Admin lookup result: {user is not None}")
                except ValueError as ve:
                    logger.error(f"❌ Invalid ObjectId for admin lookup: {ve}")
                    raise HTTPException(status_code=400, detail=f"Invalid admin ID: {str(ve)}")
                except Exception as e:
                    logger.warning(f"⚠️ Admin lookup failed: {e}")
            else:
                try:
                    from bson import ObjectId
                    # Validate ObjectId format
                    if not ObjectId.is_valid(user_id):
                        logger.error(f"❌ Invalid ObjectId format for user: {user_id}")
                        raise HTTPException(status_code=400, detail=f"Invalid user ID format: {user_id}")
                    user = get_user_by_id(user_id)
                    logger.info(f"👤 User lookup result: {user is not None}")
                except ValueError as ve:
                    logger.error(f"❌ Invalid ObjectId for user lookup: {ve}")
                    raise HTTPException(status_code=400, detail=f"Invalid user ID: {str(ve)}")
                except Exception as e:
                    logger.warning(f"⚠️ User lookup failed: {e}")
            
            # If still not found, try the other collection
            if not user:
                if user_role == "admin":
                    try:
                        from bson import ObjectId
                        if ObjectId.is_valid(user_id):
                            user = get_user_by_id(user_id)
                            logger.info(f"👤 Fallback user lookup result: {user is not None}")
                    except Exception as e:
                        logger.warning(f"⚠️ Fallback user lookup failed: {e}")
                else:
                    try:
                        from bson import ObjectId
                        if ObjectId.is_valid(user_id):
                            user = get_admin(user_id)
                            logger.info(f"👤 Fallback admin lookup result: {user is not None}")
                    except Exception as e:
                        logger.warning(f"⚠️ Fallback admin lookup failed: {e}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error during user/admin lookup: {e}")
            raise HTTPException(status_code=400, detail=f"Error looking up user/admin: {str(e)}")
        
        # Determine organization ID
        org_id = None
        if user and "organization_id" in user:
            org_id = user["organization_id"]
            logger.info(f"🏢 Organization ID from user/admin record: {org_id}")
        elif org_id_from_token:
            org_id = org_id_from_token
            logger.info(f"🏢 Organization ID from token: {org_id}")
        else:
            logger.error(f"❌ No organization_id found in user/admin record or token")
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        logger.info(f"✅ Using organization ID: {org_id}")
        
        # Parse travel date - handle different date formats
        try:
            travel_date_str = ticket_data.travelDate
            logger.info(f"📅 Parsing travel date: {travel_date_str}")
            # Handle ISO format with or without timezone
            if 'Z' in travel_date_str:
                travel_date = datetime.fromisoformat(travel_date_str.replace('Z', '+00:00'))
            elif '+' in travel_date_str or travel_date_str.count('-') >= 2:
                # Already has timezone or is ISO format
                travel_date = datetime.fromisoformat(travel_date_str)
            else:
                # Assume YYYY-MM-DD format and add time
                travel_date = datetime.fromisoformat(travel_date_str + 'T00:00:00')
            logger.info(f"✅ Parsed travel date: {travel_date}")
        except Exception as date_error:
            logger.error(f"❌ Date parsing error: {date_error}")
            raise HTTPException(status_code=400, detail=f"Invalid travel date format: {str(date_error)}")
        
        # Calculate pax if not provided (for backward compatibility)
        pax = ticket_data.pax
        if pax is None:
            adults = ticket_data.adults or 0
            children = ticket_data.children or 0
            pax = adults + children
        logger.info(f"👥 Passengers: adults={ticket_data.adults}, children={ticket_data.children}, infants={ticket_data.infants}, pax={pax}")
        
        # Get the user ID for created_by field
        created_by_id = current_user.get("_id") or current_user.get("user_id")
        if not created_by_id:
            logger.error(f"❌ No user ID found in token for created_by field")
            raise HTTPException(status_code=400, detail="Invalid token: missing user ID")
        
        ticket_dict = {
            **ticket_data.dict(),
            "travelDate": travel_date,
            "organization_id": org_id,
            "created_by": created_by_id,
            "status": TicketStatus.OPEN.value,
            "pax": pax  # Ensure pax is set for backward compatibility
        }
        
        logger.info(f"💾 Creating ticket with data: {ticket_dict}")
        ticket_id = create_ticket(ticket_dict)
        logger.info(f"✅ Ticket created with ID: {ticket_id}")
        
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            logger.error(f"❌ Failed to retrieve created ticket: {ticket_id}")
            raise HTTPException(status_code=500, detail="Failed to retrieve created ticket")
        
        # Broadcast ticket creation to organization members
        import asyncio
        asyncio.create_task(manager.broadcast_to_org(org_id, {
            "type": "ticket_created",
            "ticket": _serialize_ticket(ticket)
        }, exclude_user=created_by_id))
        
        logger.info(f"🎉 Ticket creation successful: {ticket_id}")
        return _serialize_ticket(ticket)
    except HTTPException as he:
        logger.error(f"❌ HTTPException: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_trace = traceback.format_exc()
        logger.error(f"❌ Unexpected error creating ticket: {error_detail}")
        logger.error(f"❌ Traceback: {error_trace}")
        raise HTTPException(status_code=400, detail=f"Failed to create ticket: {error_detail}")

@router.get("/")
async def get_my_tickets(current_user=Depends(get_current_user)):
    """Get all tickets for the current user's organization"""
    try:
        user_id = current_user.get("_id") or current_user.get("user_id")
        if not user_id:
            return []
        
        user = get_user_by_id(user_id) or get_admin(user_id)
        if not user or "organization_id" not in user:
            # Try using org_id from token
            org_id = current_user.get("org_id")
            if org_id:
                tickets = get_tickets_by_org(org_id)
                return [_serialize_ticket(ticket) for ticket in tickets]
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        if not user_id:
            return []
        tickets = get_tickets_by_user(user_id)
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        user = None
        if user_id:
            user = get_user_by_id(user_id) or get_admin(user_id)
        
        org_id = None
        if user and "organization_id" in user:
            org_id = user["organization_id"]
        elif current_user.get("org_id"):
            org_id = current_user.get("org_id")
        
        if not org_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if ticket.get("organization_id") != org_id:
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        user = None
        if user_id:
            user = get_user_by_id(user_id) or get_admin(user_id)
        
        org_id = None
        if user and "organization_id" in user:
            org_id = user["organization_id"]
        elif current_user.get("org_id"):
            org_id = current_user.get("org_id")
        
        if not org_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if ticket.get("organization_id") != org_id:
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        user = None
        if user_id:
            user = get_user_by_id(user_id) or get_admin(user_id)
        user_name = (user.get("first_name") if user else None) or (user.get("username") if user else None) or "Unknown"
        
        note_dict = {
            "author": user_name,
            "author_id": user_id,
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        user = None
        if user_id:
            user = get_user_by_id(user_id) or get_admin(user_id)
        user_name = (user.get("first_name") if user else None) or (user.get("username") if user else None) or "Unknown"
        
        message_dict = {
            "author": user_name,
            "author_id": user_id,
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
        user_id = current_user.get("_id") or current_user.get("user_id")
        if ticket.get("created_by") != user_id:
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

