import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDszyPzTtgV-k8TpBGm4lmckkyyFAbon6A",
  authDomain: "chatapp-internal.firebaseapp.com",
  projectId: "chatapp-internal",
  storageBucket: "chatapp-internal.firebasestorage.app",
  messagingSenderId: "231183713207",
  appId: "1:231183713207:web:1937c63c9000294ca69e32",
  measurementId: "G-4S11ZLC2X1"
};

// Initialize Firebase
let app: any = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

// Only initialize on client-side to avoid SSR issues
if (typeof window !== "undefined") {
  try {
    app = initializeApp(firebaseConfig);
    
    // Get Firebase Messaging instance (only in browser)
    if ("serviceWorker" in navigator) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.error("Error initializing Firebase Messaging:", error);
      }
    }

    // Analytics removed to prevent build errors
  } catch (error) {
    console.error("Error initializing Firebase app:", error);
  }
}

// Request notification permission and get FCM token
export async function requestNotificationPermissionAndToken(): Promise<string | null> {
  if (!messaging) {
    console.warn("Firebase Messaging is not available");
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Notification permission granted");
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: "BCvp3xwoohxjD2uGNJAB7ZxmgI4mr4iPQQ5zTsV9puib-Jvunj2al0TpZm3tppOzv9ODylpsb1uTPmXy_MPyw40" // Replace with your VAPID key
      });
      
      if (token) {
        console.log("FCM Token:", token);
        return token;
      } else {
        console.warn("No FCM token available");
        return null;
      }
    } else {
      console.warn("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn("Firebase Messaging is not available");
    return;
  }

  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}

// Send FCM token to backend
export async function saveFCMTokenToBackend(token: string) {
  try {
    const token_header = localStorage.getItem("token");
    const response = await fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/users/save-fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token_header}`
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      console.log("FCM token saved to backend");
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to save FCM token to backend:", errorData);
    }
  } catch (error) {
    console.error("Error saving FCM token to backend:", error);
  }
}

export { app, messaging };

