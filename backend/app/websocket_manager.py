from typing import Dict, List, Set
import json
import asyncio
from fastapi import WebSocket
from starlette.websockets import WebSocketState

class ConnectionManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Store user connections by chat_id for broadcasting
        self.chat_connections: Dict[str, Set[str]] = {}
        # Store user's current chat
        self.user_current_chat: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Remove from all chat connections
        for chat_id, users in self.chat_connections.items():
            users.discard(user_id)
        # Remove current chat
        if user_id in self.user_current_chat:
            del self.user_current_chat[user_id]
        print(f"User {user_id} disconnected")

    async def join_chat(self, user_id: str, chat_id: str):
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = set()
        self.chat_connections[chat_id].add(user_id)
        self.user_current_chat[user_id] = chat_id
        print(f"User {user_id} joined chat {chat_id}")

    async def leave_chat(self, user_id: str, chat_id: str):
        if chat_id in self.chat_connections:
            self.chat_connections[chat_id].discard(user_id)
        if user_id in self.user_current_chat and self.user_current_chat[user_id] == chat_id:
            del self.user_current_chat[user_id]
        print(f"User {user_id} left chat {chat_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending message to user {user_id}: {e}")
                # Remove disconnected connection
                self.disconnect(user_id)

    async def broadcast_to_chat(self, message: dict, chat_id: str, exclude_user: str = None):
        if chat_id in self.chat_connections:
            for user_id in self.chat_connections[chat_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_text(json.dumps(message))
                    except Exception as e:
                        print(f"Error broadcasting to user {user_id}: {e}")
                        # Remove disconnected connection
                        self.disconnect(user_id)

    async def send_typing_indicator(self, chat_id: str, user_id: str, is_typing: bool):
        message = {
            "type": "typing",
            "user_id": user_id,
            "is_typing": is_typing,
            "chat_id": chat_id
        }
        await self.broadcast_to_chat(message, chat_id, exclude_user=user_id)

    async def send_message_status(self, chat_id: str, message_id: str, status: str, user_id: str):
        message = {
            "type": "message_status",
            "message_id": message_id,
            "status": status,
            "user_id": user_id,
            "chat_id": chat_id
        }
        await self.broadcast_to_chat(message, chat_id, exclude_user=user_id)

    def get_connected_users_in_chat(self, chat_id: str) -> List[str]:
        if chat_id in self.chat_connections:
            return list(self.chat_connections[chat_id])
        return []

# Global connection manager instance
manager = ConnectionManager()
