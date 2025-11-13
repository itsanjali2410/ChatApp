from datetime import timedelta
from fastapi import FastAPI, HTTPException, APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from werkzeug.security import check_password_hash
from werkzeug.security import check_password_hash as check_user_password_hash
from .core.security import create_access_token
from .routes.user_routes import router as user_routes
from .routes.org_routes import router as org_routes 
from .routes.chat_routes import router as chat_routes
from .routes.message_routes import router as message_routes
from .routes.file_routes import router as file_routes
from .routes.admin_routes import router as admin_routes
from .config import db
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from .services.user_service import users_collection
from .services.admin_service import get_admin_by_email
from .websocket_manager import manager
import json
# UNUSED IMPORT - FLAG FOR REMOVAL
# from .services import org_service  # TODO: REMOVE - not used in this file
load_dotenv()
import logging
from starlette.middleware.sessions import SessionMiddleware

logger = logging.getLogger("chatapp")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Internal Chat Application")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "change-me-session-secret"))

# Mount static files for uploads
# app.mount("/files", StaticFiles(directory="uploads"), name="files")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
    return response

# include routers
app.include_router(user_routes, tags=["Users"])
app.include_router(org_routes, tags=["Organization"])
app.include_router(chat_routes, tags=["Chats"])
app.include_router(message_routes, tags=["Messages"])
app.include_router(file_routes, tags=["Files"])
app.include_router(admin_routes, tags=["Admin"])

@app.get("/")
def root():
    return {"message": "Welcome to the Internal Chat Application API"}
    
@app.get("/api/")
def api_root():
    return {"message": "API is working"}

@app.on_event("startup")
def on_startup():
    logger.info("Backend started and ready to accept requests")

router = APIRouter(prefix="/auth", tags=["Auth"])
admin_collection = db["admins"]

class AdminLogin(BaseModel):
    email: str
    password: str

@router.post("/login")
def login_admin(data: AdminLogin, response: Response):
    # Admin login
    admin = admin_collection.find_one({"email": data.email})
    if admin and check_password_hash(admin["password"], data.password):
        token = create_access_token(
            {"sub": data.email, "role": "admin", "org_id": str(admin["organization_id"]), "user_id": str(admin["_id"])},
            expires_delta=timedelta(hours=24)  # Extended to 24 hours to prevent frequent logouts
        )
        response.set_cookie("access_token", token, httponly=True, samesite="lax")
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "role": "admin", 
            "org_id": str(admin["organization_id"]),
            "user_id": str(admin["_id"])
        }

    # User login (hashed)
    user = users_collection.find_one({"email": data.email})
    if user and check_user_password_hash(user["password"], data.password):
        token = create_access_token(
            {"sub": data.email, "role": user.get("role", "user"), "org_id": str(user.get("organization_id")), "user_id": str(user["_id"])},
            expires_delta=timedelta(hours=24)  # Extended to 24 hours to prevent frequent logouts
        )
        response.set_cookie("access_token", token, httponly=True, samesite="lax")
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "role": user.get("role", "user"), 
            "org_id": str(user.get("organization_id")),
            "user_id": str(user["_id"])
        }

    raise HTTPException(status_code=401, detail="Invalid credentials")

# Check if email exists and whether org setup is needed
@router.get("/check_email")
def check_email(email: str):
    admin = get_admin_by_email(email)
    if admin:
        return {"exists": True, "type": "admin", "need_org_setup": False, "org_id": str(admin.get("organization_id"))}
    user = users_collection.find_one({"email": email})
    if user:
        return {"exists": True, "type": "user", "need_org_setup": user.get("organization_id") is None, "org_id": str(user.get("organization_id"))}
    return {"exists": False, "need_org_setup": True}

# Register admin and organization in one step for a brand-new email
class RegisterAdminWithOrg(BaseModel):
    username: str
    email: str
    password: str
    org_name: str
    description: str | None = None
    address: str | None = None
    website: str | None = None

@router.post("/register_admin_with_org")
def register_admin_with_org(payload: RegisterAdminWithOrg):
    existing_admin = get_admin_by_email(payload.email)
    existing_user = users_collection.find_one({"email": payload.email})
    if existing_admin or existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_data = {
        "username": payload.username,
        "email": payload.email,
        "password": payload.password,
        "role": "admin",
    }
    org_data = {
        "org_name": payload.org_name,
        "description": payload.description,
        "address": payload.address,
        "website": payload.website,
    }
    # Use admin_service.create_admin to handle links and hashing
    from .services.admin_service import create_admin as svc_create_admin
    admin_result, org_result = svc_create_admin(admin_data, org_data)
    return {"admin_id": str(admin_result.inserted_id), "org_id": str(org_result.inserted_id)}


app.include_router(router)

# WebSocket endpoint for real-time messaging
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    
    # Get token from query parameters
    query_params = websocket.query_params
    token = query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # Verify the token
    from .core.security import decode_access_token
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    # Verify the user_id matches the token
    token_user_id = payload.get("user_id")
    if token_user_id != user_id:
        await websocket.close(code=4003, reason="User ID mismatch")
        return
    
    await manager.connect(websocket, user_id)
    
    # Set user as online when they connect
    from .services.user_service import update_user_by_id
    from .services.admin_service import update_admin
    from datetime import datetime
    from zoneinfo import ZoneInfo
    
    # Check if user is admin or regular user and update accordingly
    user_role = payload.get("role")
    if user_role == "admin":
        update_admin(user_id, {
            "is_online": True,
            "last_seen": datetime.now(ZoneInfo("Asia/Kolkata"))
        })
    else:
        update_user_by_id(user_id, {
            "is_online": True,
            "last_seen": datetime.now(ZoneInfo("Asia/Kolkata"))
        })
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            if message_type == "join_chat":
                chat_id = message_data.get("chat_id")
                print(f"🔌 User {user_id} joining chat {chat_id}")
                await manager.join_chat(user_id, chat_id)
                print(f"✅ User {user_id} successfully joined chat {chat_id}")
                # Send confirmation back to client
                await websocket.send_text(json.dumps({
                    "type": "joined_chat",
                    "chat_id": chat_id
                }))
                
            elif message_type == "leave_chat":
                chat_id = message_data.get("chat_id")
                await manager.leave_chat(user_id, chat_id)
                
            elif message_type == "typing":
                chat_id = message_data.get("chat_id")
                is_typing = message_data.get("is_typing", False)
                # Update user typing status in database
                if user_role == "admin":
                    update_admin(user_id, {
                        "is_typing": is_typing,
                        "current_chat_id": chat_id if is_typing else None
                    })
                else:
                    update_user_by_id(user_id, {
                        "is_typing": is_typing,
                        "current_chat_id": chat_id if is_typing else None
                    })
                await manager.send_typing_indicator(chat_id, user_id, is_typing)
                
            elif message_type == "message":
                # Handle new message
                chat_id = message_data.get("chat_id")
                message_content = message_data.get("message")
                
                print(f"📤 Broadcasting message to chat {chat_id} from user {user_id}")
                print(f"📊 Connected users in chat: {manager.get_connected_users_in_chat(chat_id)}")
                
                # Broadcast to all users in the chat (including sender for optimization)
                broadcast_data = {
                    "type": "new_message",
                    "chat_id": chat_id,
                    "sender_id": user_id,
                    "message": message_content,
                    "timestamp": message_data.get("timestamp") or datetime.utcnow().isoformat() + "Z",
                    "message_type": message_data.get("message_type", "text"),
                    "attachment": message_data.get("attachment"),
                    "reply_to": message_data.get("reply_to")  # Include reply_to in broadcast
                }
                print(f"📡 Broadcasting data: {broadcast_data}")
                await manager.broadcast_to_chat(broadcast_data, chat_id, exclude_user=user_id)
                print(f"✅ Broadcast complete for chat {chat_id}")
                
            elif message_type == "mark_delivered":
                # Handle marking messages as delivered
                chat_id = message_data.get("chat_id")
                from .services.message_service import mark_messages_as_delivered
                updated_count = mark_messages_as_delivered(chat_id, user_id)
                
                # Broadcast status update to all users in the chat
                await manager.broadcast_to_chat({
                    "type": "messages_delivered",
                    "chat_id": chat_id,
                    "user_id": user_id,
                    "updated_count": updated_count
                }, chat_id, exclude_user=user_id)
                
            elif message_type == "mark_read":
                # Handle marking messages as read
                chat_id = message_data.get("chat_id")
                from .services.message_service import mark_messages_as_read
                from .services.user_service import get_user_by_id
                from .services.admin_service import get_admin_by_id
                from datetime import datetime
                
                # Get username for the user
                user = get_user_by_id(user_id) or get_admin_by_id(user_id)
                username = "User"
                if user:
                    username = user.get("username") or user.get("first_name") or user.get("email", "User")
                
                # Mark messages as read (this now stores seenBy as array)
                updated_count = mark_messages_as_read(chat_id, user_id, username)
                seen_timestamp = datetime.utcnow().isoformat() + "Z"
                
                # Broadcast status update to all users in the chat
                await manager.broadcast_to_chat({
                    "type": "messages_read",
                    "chat_id": chat_id,
                    "user_id": user_id,
                    "username": username,
                    "updated_count": updated_count,
                    "seen_at": seen_timestamp
                }, chat_id, exclude_user=user_id)
                
    except WebSocketDisconnect:
        # Set user as offline when they disconnect
        if user_role == "admin":
            update_admin(user_id, {
                "is_online": False,
                "last_seen": datetime.now(ZoneInfo("Asia/Kolkata")),
                "is_typing": False,
                "current_chat_id": None
            })
        else:
            update_user_by_id(user_id, {
                "is_online": False,
                "last_seen": datetime.now(ZoneInfo("Asia/Kolkata")),
                "is_typing": False,
                "current_chat_id": None
            })
        manager.disconnect(user_id)

# Logout endpoint clears cookie session
@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}