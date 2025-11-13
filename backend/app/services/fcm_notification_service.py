# backend/services/fcm_notification_service.py
# Create this NEW file to handle sending FCM notifications

import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Dict, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class FCMNotificationService:
    """
    Service for sending instant push notifications via Firebase Cloud Messaging.
    This ensures users get notifications in <1 second when messages arrive.
    """
    
    def __init__(self):
        """Initialize Firebase Admin SDK"""
        # Check if Firebase is already initialized
        if not firebase_admin._apps:
            try:
                # Get the absolute path to the service account key
                import os
                
                # Get the directory where this file is located
                current_dir = os.path.dirname(os.path.abspath(__file__))
                
                # Go up to the app directory and find the key
                key_path = os.path.join(current_dir, "..", "serviceAccountKey.json")
                
                # Normalize the path (resolve .. references)
                key_path = os.path.normpath(key_path)
                
                print(f"🔍 Looking for Firebase key at: {key_path}")
                
                if not os.path.exists(key_path):
                    raise FileNotFoundError(f"Service account key not found at: {key_path}")
                
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
                logger.info("✅ Firebase Admin SDK initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
                raise
    
    async def send_message_notification(
        self,
        fcm_token: str,
        sender_name: str,
        message_body: str,
        chat_id: str,
        message_type: str = "text",
        chat_name: Optional[str] = None
    ) -> bool:
        """
        Send instant notification for new message.
        
        Args:
            fcm_token: User's FCM registration token
            sender_name: Name of the person who sent the message
            message_body: The actual message content
            chat_id: ID of the chat
            message_type: Type of message (text, file, image, etc.)
            chat_name: Name of chat (for group chats)
        
        Returns:
            bool: True if notification sent successfully, False otherwise
        """
        try:
            # Format notification title and body
            if chat_name:
                # Group chat notification
                notification_title = chat_name
                notification_body = f"{sender_name}: {message_body}"
            else:
                # Direct chat notification
                notification_title = sender_name
                notification_body = message_body
            
            # Truncate long messages
            if len(notification_body) > 100:
                notification_body = notification_body[:97] + "..."
            
            # Create FCM message with HIGH PRIORITY for instant delivery
            message = messaging.Message(
                token=fcm_token,
                notification=messaging.Notification(
                    title=notification_title,
                    body=notification_body,
                    image=None  # Optional: Add sender's profile picture URL
                ),
                data={
                    'chatId': chat_id,
                    'chat_id': chat_id,
                    'sender': sender_name,
                    'message_type': message_type,
                    'timestamp': str(datetime.now().timestamp()),
                    'click_action': f'/chat?chat={chat_id}'
                },
                # CRITICAL: Android config with HIGH priority for instant delivery
                android=messaging.AndroidConfig(
                    priority='high',  # THIS IS KEY FOR INSTANT DELIVERY
                    notification=messaging.AndroidNotification(
                        title=notification_title,
                        body=notification_body,
                        icon='ic_notification',
                        color='#4A90E2',
                        sound='default',
                        channel_id='chat_messages',
                        priority='high',
                        default_sound=True,
                        default_vibrate_timings=True,
                        visibility='public',
                        notification_priority='PRIORITY_HIGH'
                    ),
                    ttl=0  # Time to live = 0 means instant delivery, no caching
                ),
                # iOS configuration
                apns=messaging.APNSConfig(
                    headers={
                        'apns-priority': '10',  # Highest priority
                        'apns-push-type': 'alert'
                    },
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            alert=messaging.ApsAlert(
                                title=notification_title,
                                body=notification_body
                            ),
                            badge=1,
                            sound='default',
                            content_available=True
                        )
                    )
                ),
                # Web push configuration (CRITICAL for instant web notifications)
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        title=notification_title,
                        body=notification_body,
                        icon='/icon-192.png',
                        badge='/icon-192.png',
                        tag=chat_id,
                        renotify=True,
                        require_interaction=False,
                        vibrate=[200, 100, 200, 100, 200],
                        timestamp=int(datetime.now().timestamp() * 1000),
                        silent=False
                    ),
                    headers={
                        'Urgency': 'high',  # HIGH urgency = instant delivery
                        'TTL': '0'  # No caching = instant delivery
                    },
                    fcm_options=messaging.WebpushFCMOptions(
                        link=f'/chat?chat={chat_id}'
                    )
                )
            )
            
            # Send message (this is VERY fast, typically <50ms)
            response = messaging.send(message)
            logger.info(f"✅ FCM notification sent successfully: {response}")
            return True
            
        except messaging.UnregisteredError:
            logger.warning(f"⚠️ FCM token is invalid/unregistered: {fcm_token[:20]}...")
            # Token is invalid, should be removed from database
            return False
        except messaging.SenderIdMismatchError:
            logger.error(f"❌ FCM token doesn't match this project: {fcm_token[:20]}...")
            return False
        except Exception as e:
            logger.error(f"❌ Error sending FCM notification: {str(e)}")
            return False
    
    async def send_notification_to_users(
        self,
        user_ids: List[str],
        sender_name: str,
        message_body: str,
        chat_id: str,
        message_type: str = "text",
        chat_name: Optional[str] = None,
        exclude_user_id: Optional[str] = None
    ) -> Dict[str, bool]:
        """
        Send notifications to multiple users (for group chats).
        
        Args:
            user_ids: List of user IDs to send notifications to
            sender_name: Name of message sender
            message_body: Message content
            chat_id: Chat ID
            message_type: Type of message
            chat_name: Name of group chat
            exclude_user_id: User ID to exclude (typically the sender)
        
        Returns:
            Dict mapping user_id to success status
        """
        from ..services.user_service import users_collection
        from ..services.admin_service import admin_collection
        from bson import ObjectId
        
        results = {}
        
        for user_id in user_ids:
            # Skip the sender
            if user_id == exclude_user_id:
                continue
            
            try:
                # Get user's FCM token from database
                user = users_collection.find_one({"_id": ObjectId(user_id)})
                if not user:
                    # Try admin collection
                    user = admin_collection.find_one({"_id": ObjectId(user_id)})
                
                if not user or not user.get("fcm_token"):
                    logger.warning(f"⚠️ No FCM token found for user {user_id}")
                    results[user_id] = False
                    continue
                
                fcm_token = user["fcm_token"]
                
                # Send notification
                success = await self.send_message_notification(
                    fcm_token=fcm_token,
                    sender_name=sender_name,
                    message_body=message_body,
                    chat_id=chat_id,
                    message_type=message_type,
                    chat_name=chat_name
                )
                
                results[user_id] = success
                
                # If token is invalid, remove it from database
                if not success:
                    logger.info(f"🗑️ Removing invalid FCM token for user {user_id}")
                    users_collection.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$unset": {"fcm_token": "", "fcm_token_updated_at": ""}}
                    )
                    admin_collection.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$unset": {"fcm_token": "", "fcm_token_updated_at": ""}}
                    )
                    
            except Exception as e:
                logger.error(f"❌ Error sending notification to user {user_id}: {e}")
                results[user_id] = False
        
        return results
    
    async def send_file_notification(
        self,
        fcm_token: str,
        sender_name: str,
        filename: str,
        chat_id: str,
        chat_name: Optional[str] = None
    ) -> bool:
        """Send notification for file upload"""
        message_body = f"📎 {filename}"
        return await self.send_message_notification(
            fcm_token=fcm_token,
            sender_name=sender_name,
            message_body=message_body,
            chat_id=chat_id,
            message_type="file",
            chat_name=chat_name
        )


# Create singleton instance
fcm_service = FCMNotificationService()