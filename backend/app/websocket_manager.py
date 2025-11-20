from typing import Dict, List, Set, Optional
import json
import asyncio
import logging
import os
import time
from fastapi import WebSocket
from starlette.websockets import WebSocketState

HEARTBEAT_INTERVAL = int(os.getenv("WS_HEARTBEAT_INTERVAL", "25"))
HEARTBEAT_TIMEOUT = int(os.getenv("WS_HEARTBEAT_TIMEOUT", "60"))


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.chat_connections: Dict[str, Set[str]] = {}
        self.user_current_chat: Dict[str, str] = {}
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
        self.last_pong: Dict[str, float] = {}
        self.logger = logging.getLogger("chatapp.websocket")

    async def connect(self, websocket: WebSocket, user_id: str):
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        self.active_connections[user_id] = websocket
        self.last_pong[user_id] = time.monotonic()
        self.heartbeat_tasks[user_id] = asyncio.create_task(self._heartbeat_loop(user_id))
        self.logger.info("User %s connected", user_id)

    def disconnect(self, user_id: str):
        websocket = self.active_connections.pop(user_id, None)
        if websocket:
            try:
                asyncio.create_task(websocket.close())
            except Exception:
                pass
        for chat_id, users in self.chat_connections.items():
            users.discard(user_id)
        self.user_current_chat.pop(user_id, None)
        heartbeat = self.heartbeat_tasks.pop(user_id, None)
        if heartbeat:
            heartbeat.cancel()
        self.last_pong.pop(user_id, None)
        self.logger.info("User %s disconnected", user_id)

    async def _heartbeat_loop(self, user_id: str):
        while user_id in self.active_connections:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            websocket = self.active_connections.get(user_id)
            if not websocket:
                break
            try:
                await websocket.send_text(json.dumps({"type": "ping", "ts": time.time()}))
            except Exception as exc:
                self.logger.warning("Failed to send ping to %s: %s", user_id, exc)
                self.disconnect(user_id)
                break
            last_seen = self.last_pong.get(user_id, 0)
            if time.monotonic() - last_seen > HEARTBEAT_TIMEOUT:
                self.logger.warning("Heartbeat timeout for %s", user_id)
                self.disconnect(user_id)
                break

    def record_pong(self, user_id: str):
        self.last_pong[user_id] = time.monotonic()

    async def join_chat(self, user_id: str, chat_id: str):
        self.chat_connections.setdefault(chat_id, set()).add(user_id)
        self.user_current_chat[user_id] = chat_id
        self.logger.debug("User %s joined chat %s", user_id, chat_id)

    async def leave_chat(self, user_id: str, chat_id: str):
        if chat_id in self.chat_connections:
            self.chat_connections[chat_id].discard(user_id)
        if self.user_current_chat.get(user_id) == chat_id:
            self.user_current_chat.pop(user_id, None)
        self.logger.debug("User %s left chat %s", user_id, chat_id)

    async def _safe_send(self, user_id: str, message: dict):
        websocket = self.active_connections.get(user_id)
        if not websocket:
            return
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as exc:
            self.logger.warning("Failed to send message to %s: %s", user_id, exc)
            self.disconnect(user_id)

    async def send_personal_message(self, message: dict, user_id: str):
        await self._safe_send(user_id, message)

    async def broadcast_to_chat(self, message: dict, chat_id: str, exclude_user: Optional[str] = None):
        recipients = self.chat_connections.get(chat_id, set())
        for user_id in list(recipients):
            if exclude_user and user_id == exclude_user:
                continue
            await self._safe_send(user_id, message)

    async def send_typing_indicator(self, chat_id: str, user_id: str, is_typing: bool):
        await self.broadcast_to_chat(
            {"type": "typing", "user_id": user_id, "is_typing": is_typing, "chat_id": chat_id},
            chat_id,
            exclude_user=user_id,
        )

    async def send_message_status(self, chat_id: str, message_id: str, status: str, user_id: str):
        await self.broadcast_to_chat(
            {"type": "message_status", "message_id": message_id, "status": status, "user_id": user_id, "chat_id": chat_id},
            chat_id,
            exclude_user=user_id,
        )

    def get_connected_users_in_chat(self, chat_id: str) -> List[str]:
        return list(self.chat_connections.get(chat_id, []))

    async def broadcast_to_org(self, org_id: str, message: dict, exclude_user: Optional[str] = None):
        from .services.user_service import users_collection

        user_ids = [
            str(user["_id"])
            for user in users_collection.find({"organization_id": org_id}, {"_id": 1})
        ]
        for user_id in user_ids:
            if exclude_user and user_id == exclude_user:
                continue
            await self._safe_send(user_id, message)


manager = ConnectionManager()
