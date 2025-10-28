#!/usr/bin/env python3
"""
Test script to send Firebase Cloud Messaging (FCM) push notifications
to test devices with your chat app.

Usage:
1. Get your FCM server key from Firebase Console:
   - Go to Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
   - Copy the Server Key

2. Get a device token:
   - Open your chat app in browser
   - Check browser console for "FCM Token:" log
   - Copy the token

3. Run this script:
   python test_fcm.py --token YOUR_TOKEN --key YOUR_SERVER_KEY
"""

import argparse
import requests
import json

def send_test_notification(fcm_token: str, server_key: str):
    """Send a test notification via FCM"""
    
    url = "https://fcm.googleapis.com/fcm/send"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"key={server_key}"
    }
    
    payload = {
        "to": fcm_token,
        "notification": {
            "title": "🧪 Test Notification",
            "body": "This is a test push notification from your chat app!",
            "icon": "/icon-192.png",
            "click_action": "/chat"
        },
        "data": {
            "chat_id": "test-chat-123",
            "sender": "Test Bot",
            "type": "test_message",
            "click_action": "/chat"
        },
        "webpush": {
            "fcm_options": {
                "link": "/chat"
            }
        }
    }
    
    print("📤 Sending test notification...")
    print(f"Token: {fcm_token[:20]}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        print("\n✅ Notification sent successfully!")
        print(f"Response: {response.json()}")
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error sending notification: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")

def main():
    parser = argparse.ArgumentParser(description="Test FCM push notifications")
    parser.add_argument("--token", required=True, help="FCM device token")
    parser.add_argument("--key", required=True, help="FCM server key")
    
    args = parser.parse_args()
    
    send_test_notification(args.token, args.key)

if __name__ == "__main__":
    main()

