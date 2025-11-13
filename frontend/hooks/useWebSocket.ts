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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      // Add token as query parameter
      const separator = url.includes('?') ? '&' : '?';
      const fullUrl = url.startsWith('ws') ? `${url}${separator}token=${encodeURIComponent(token)}` : `${WS_BASE_URL}${url}${separator}token=${encodeURIComponent(token)}`;
      ws.current = new WebSocket(fullUrl);
      
      // Store URL for error logging
      const connectionUrl = fullUrl;
      
      ws.current.onopen = (event) => {
        setIsConnected(true);
        setReconnectAttempts(0);
        onOpen?.(event);
      };

      ws.current.onmessage = (event) => {
        onMessage?.(event);
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        onClose?.(event);
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (event) => {
        // WebSocket errors during connection are normal and will trigger onclose
        // The onclose handler will handle reconnection automatically
        // Only call onError callback, don't log here to avoid noise
        onError?.(event);
      };
    } catch (error) {
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
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected or still connecting. ReadyState:', ws.current?.readyState);
      // Queue the message if WebSocket is connecting
      if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
        // Wait for connection to open, then send
        const checkAndSend = () => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
          } else if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
            // Retry after a short delay
            setTimeout(checkAndSend, 100);
          }
        };
        setTimeout(checkAndSend, 100);
      }
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnectAttempts,
  };
};
