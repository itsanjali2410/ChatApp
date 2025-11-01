import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  chatId?: string;
  senderName?: string;
  timestamp: Date;
  type: 'message' | 'file' | 'system';
  data?: any;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeNotifications() {
    try {
      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');

        // Get FCM token
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        // You should send this token to your backend

        // Handle foreground messages
        messaging().onMessage(async (remoteMessage) => {
          console.log('Foreground message received:', remoteMessage);
          this.handleNotification(remoteMessage);
        });

        // Handle background/quit state messages
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('Background message received:', remoteMessage);
          this.handleNotification(remoteMessage);
        });

        // Handle notification tap when app is in background/quit state
        messaging().onNotificationOpenedApp((remoteMessage) => {
          console.log('Notification opened app:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        });

        // Check if app was opened from a notification
        messaging()
          .getInitialNotification()
          .then((remoteMessage) => {
            if (remoteMessage) {
              console.log('App opened from notification:', remoteMessage);
              this.handleNotificationTap(remoteMessage);
            }
          });
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private handleNotification(remoteMessage: any) {
    const notification = remoteMessage.notification;
    const data = remoteMessage.data || {};

    const notificationData: NotificationData = {
      id: remoteMessage.messageId || Date.now().toString(),
      title: notification?.title || 'New Notification',
      body: notification?.body || '',
      chatId: data.chatId || data.chat_id,
      senderName: data.senderName || data.sender_name,
      timestamp: new Date(),
      type: data.type || (data.chatId || data.chat_id ? 'message' : 'system'),
      data: data,
    };

    this.addNotification(notificationData);

    // Show alert for foreground notifications
    if (notification?.title && notification?.body) {
      Alert.alert(notification.title, notification.body);
    }
  }

  private handleNotificationTap(remoteMessage: any) {
    const data = remoteMessage.data || {};
    const chatId = data.chatId || data.chat_id;

    if (chatId) {
      // Navigate to chat - you'll need to implement navigation logic
      console.log('Navigate to chat:', chatId);
      // Example: navigation.navigate('ChatDetail', { chatId });
    }
  }

  public addNotification(notification: NotificationData) {
    this.notifications.unshift(notification); // Add to beginning
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.notifyListeners();
  }

  public getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    // You can add read/unread tracking if needed
    return this.notifications.length;
  }

  public clearNotifications() {
    this.notifications = [];
    this.notifyListeners();
  }

  public removeNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyListeners();
  }

  public subscribe(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback([...this.notifications]));
  }

  public async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  public async deleteToken(): Promise<void> {
    try {
      await messaging().deleteToken();
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }
}

export default NotificationService.getInstance();

