import { useEffect, useRef, useState } from 'react';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_WS_URL || 'wss://your-backend-url.railway.app'
  : 'ws://localhost:8000';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueue = useRef<any[]>([]);
  const isConnectingRef = useRef(false);

  const connect = () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN))) {
      return;
    }

    try {
      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      isConnectingRef.current = true;
      
      // Add token as query parameter
      const separator = url.includes('?') ? '&' : '?';
      const fullUrl = url.startsWith('ws') ? `${url}${separator}token=${encodeURIComponent(token)}` : `${WS_BASE_URL}${url}${separator}token=${encodeURIComponent(token)}`;
      ws.current = new WebSocket(fullUrl);
      
      // Store URL for error logging
      const connectionUrl = fullUrl;
      
      ws.current.onopen = (event) => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        console.log('✅ WebSocket connection opened');
        // Send any queued messages
        if (messageQueue.current.length > 0 && ws.current) {
          console.log(`📤 Sending ${messageQueue.current.length} queued messages`);
          while (messageQueue.current.length > 0) {
            const queuedMessage = messageQueue.current.shift();
            if (queuedMessage && ws.current) {
              ws.current.send(JSON.stringify(queuedMessage));
            }
          }
        }
        onOpen?.(event);
      };

      ws.current.onmessage = (event) => {
        onMessage?.(event);
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        isConnectingRef.current = false;
        console.log('🔌 WebSocket connection closed', event.code, event.reason);
        onClose?.(event);
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (event) => {
        isConnectingRef.current = false;
        // WebSocket errors during connection are normal and will trigger onclose
        // The onclose handler will handle reconnection automatically
        console.error('❌ WebSocket error:', event);
        onError?.(event);
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('WebSocket connection error:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    messageQueue.current = []; // Clear message queue on disconnect
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
      // Queue the message if WebSocket is connecting
      messageQueue.current.push(message);
      // Wait for connection to open, then send queued messages
      const checkAndSend = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          // Send all queued messages
          while (messageQueue.current.length > 0) {
            const queuedMessage = messageQueue.current.shift();
            if (queuedMessage && ws.current) {
              ws.current.send(JSON.stringify(queuedMessage));
            }
          }
        } else if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
          // Retry after a short delay
          setTimeout(checkAndSend, 100);
        } else {
          // Connection failed, clear queue
          messageQueue.current = [];
        }
      };
      setTimeout(checkAndSend, 100);
    } else {
      // WebSocket is not available, queue the message
      messageQueue.current.push(message);
      console.warn('WebSocket is not connected. ReadyState:', ws.current?.readyState, 'Message queued');
    }
  };

  useEffect(() => {
    connect();
    
    // Handle page visibility changes - reconnect when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
        console.log('Page became visible, reconnecting WebSocket...');
        connect();
      }
    };
    
    // Handle window focus - reconnect if needed
    const handleFocus = () => {
      if (!isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
        console.log('Window focused, reconnecting WebSocket...');
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [url]); // Removed isConnected from dependencies to prevent infinite loops

  return {
    isConnected,
    sendMessage,
    disconnect,
  };
};
