// Notification Service for WhatsApp Clone
export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isAppFocused: boolean = true;
  private unreadCount: number = 0;

  private constructor() {
    this.requestPermission();
    this.setupFocusListeners();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async requestPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission:', this.permission);
    }
  }

  private setupFocusListeners(): void {
    // Track if app is focused
    document.addEventListener('visibilitychange', () => {
      this.isAppFocused = !document.hidden;
      if (this.isAppFocused) {
        this.clearUnreadCount();
      }
    });

    // Track window focus
    window.addEventListener('focus', () => {
      this.isAppFocused = true;
      this.clearUnreadCount();
    });

    window.addEventListener('blur', () => {
      this.isAppFocused = false;
    });
  }

  public async showNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    // Only show notification if permission is granted and app is not focused
    if (this.permission !== 'granted' || this.isAppFocused) {
      return;
    }

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
    const title = `New message from ${senderName}`;
    const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
    
    await this.showNotification(title, {
      body,
      data: { chatId, senderName }
    });
  }

  public async showFileNotification(
    senderName: string,
    fileName: string,
    chatId: string
  ): Promise<void> {
    const title = `File from ${senderName}`;
    const body = `📎 ${fileName}`;
    
    await this.showNotification(title, {
      body,
      data: { chatId, senderName, type: 'file' }
    });
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
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ChatApp`;
    } else {
      document.title = 'ChatApp';
    }
  }

  public playNotificationSound(): void {
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
    if ('vibrate' in navigator) {
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
