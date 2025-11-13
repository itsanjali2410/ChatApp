// Extended notification options for service worker notifications
interface ServiceWorkerNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  renotify?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isAppFocused: boolean = true;
  private unreadCount: number = 0;

  private constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.requestPermission();
      this.setupFocusListeners();
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async requestPermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission:', this.permission);
    }
  }

  private setupFocusListeners(): void {
    if (typeof window === 'undefined') return;
    
    // Track if app is focused
    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden || document.visibilityState === 'hidden';
      this.isAppFocused = !isHidden;
      if (this.isAppFocused) {
        this.clearUnreadCount();
      }
      console.log('📱 Page visibility changed:', isHidden ? 'hidden' : 'visible', 'isAppFocused:', this.isAppFocused);
    });

    // Track window focus
    window.addEventListener('focus', () => {
      this.isAppFocused = true;
      this.clearUnreadCount();
      console.log('🖥️ Window focused');
    });

    window.addEventListener('blur', () => {
      this.isAppFocused = false;
      console.log('🖥️ Window blurred');
    });
    
    // Initialize focus state
    this.isAppFocused = !document.hidden && document.visibilityState !== 'hidden';
  }

  public async showNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    // Only show notification if permission is granted
    if (typeof window === 'undefined' || this.permission !== 'granted') {
      return;
    }
    
    // Check if page is hidden or in background
    const isPageHidden = typeof document !== 'undefined' && 
      (document.hidden === true || document.visibilityState !== 'visible');
    
    // On desktop, show if page is hidden OR app is not focused OR window is minimized
    // On mobile, always show notifications
    const isDesktop = window.innerWidth >= 1024;
    const shouldShow = !isDesktop || !this.isAppFocused || isPageHidden;
    
    if (!shouldShow && isDesktop) {
      console.log('🔕 Skipping notification - app is focused and visible on desktop');
      return;
    }
    
    console.log('📢 Showing notification:', {
      title,
      isPageHidden,
      isAppFocused: this.isAppFocused,
      isDesktop,
      shouldShow
    });

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chatapp-message', // Replace previous notifications
        requireInteraction: false,
        silent: false,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Try to get chat ID from notification data
        const chatId = (notification.data as any)?.chatId;
        if (chatId && typeof window !== 'undefined') {
          // Post message to open specific chat
          window.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            chatId: chatId
          }, '*');
        }
      };

      this.incrementUnreadCount();
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  public async showMessageNotification(
    senderName: string,
    message: string,
    chatId: string
  ): Promise<void> {
    // Always show notifications when page is hidden/offscreen
    const isPageHidden = typeof document !== 'undefined' && 
      (document.hidden === true || document.visibilityState !== 'visible');
    
    const isDesktop = window.innerWidth >= 1024;
    const shouldShow = !isDesktop || !this.isAppFocused || isPageHidden;
    
    if (!shouldShow && isDesktop) {
      console.log('🔕 Skipping message notification - app is focused and visible on desktop');
      return;
    }
    
    const title = `New message from ${senderName}`;
    const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
    
    // Use service worker for better mobile push support (non-blocking)
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      // Don't await - fire and forget for instant notifications
      navigator.serviceWorker.ready.then((registration) => {
      
      const options: ServiceWorkerNotificationOptions = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: chatId, // Group notifications by chat
        requireInteraction: false,
        silent: false, // Ensure system notification sound plays
        vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
        data: { 
          chatId, 
          senderName,
          url: '/chat',
          click_action: '/chat',
          messageType: 'text'
        },
        renotify: true, // Show in notification drawer
        actions: [
          {
            action: 'open',
            title: 'Open Chat',
            icon: '/icon-192.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
      
        registration.showNotification(title, options).catch(() => {});
      }).catch(() => {});
    } else {
      // Fallback to regular notification (non-blocking)
      this.showNotification(title, {
        body,
        data: { chatId, senderName }
      }).catch(() => {});
    }
  }

  public async showFileNotification(
    senderName: string,
    fileName: string,
    chatId: string
  ): Promise<void> {
    // Always show notifications when page is hidden/offscreen
    const isPageHidden = typeof document !== 'undefined' && 
      (document.hidden === true || document.visibilityState !== 'visible');
    
    const isDesktop = window.innerWidth >= 1024;
    const shouldShow = !isDesktop || !this.isAppFocused || isPageHidden;
    
    if (!shouldShow && isDesktop) {
      console.log('🔕 Skipping file notification - app is focused and visible on desktop');
      return;
    }
    
    const title = `File from ${senderName}`;
    const body = `📎 ${fileName}`;
    
    // Use service worker for better mobile push support (non-blocking)
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      // Don't await - fire and forget for instant notifications
      navigator.serviceWorker.ready.then((registration) => {
      
      const options: ServiceWorkerNotificationOptions = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: chatId,
        requireInteraction: false,
        silent: false, // Ensure system notification sound plays
        vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
        data: { 
          chatId, 
          senderName, 
          type: 'file',
          url: '/chat',
          click_action: '/chat',
          messageType: 'file'
        },
        renotify: true, // Show in notification drawer
        actions: [
          {
            action: 'open',
            title: 'Open Chat',
            icon: '/icon-192.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
      
        registration.showNotification(title, options).catch(() => {});
      }).catch(() => {});
    } else {
      // Fallback to regular notification (non-blocking)
      this.showNotification(title, {
        body,
        data: { chatId, senderName, type: 'file' }
      }).catch(() => {});
    }
  }

  private incrementUnreadCount(): void {
    this.unreadCount++;
    this.updateTitle();
  }

  private clearUnreadCount(): void {
    this.unreadCount = 0;
    this.updateTitle();
  }

  private updateTitle(): void {
    if (typeof window === 'undefined') return;
    
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ChatApp`;
    } else {
      document.title = 'ChatApp';
    }
  }

  public playNotificationSound(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a simple notification sound (beep)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // 600Hz
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // 800Hz
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  public vibrate(pattern: number | number[] = [200, 100, 200]): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  public async requestPermissionAgain(): Promise<boolean> {
    await this.requestPermission();
    return this.permission === 'granted';
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
