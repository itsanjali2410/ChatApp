import { useEffect, useRef, useState, useCallback } from 'react';

const DEFAULT_WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'wss://your-backend-url.railway.app'
    : 'ws://localhost:8000');

const HEARTBEAT_INTERVAL =
  Number(process.env.NEXT_PUBLIC_WS_HEARTBEAT_MS ?? 20000);

interface UseWebSocketOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const safeParse = (payload: string): unknown => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<unknown[]>([]);
  const isConnectingRef = useRef(false);
  const handlersRef = useRef({
    onMessage,
    onOpen,
    onClose,
    onError,
  });

  useEffect(() => {
    handlersRef.current = { onMessage, onOpen, onClose, onError };
  }, [onMessage, onOpen, onClose, onError]);

  const flushQueue = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    while (messageQueueRef.current.length > 0) {
      const payload = messageQueueRef.current.shift();
      if (payload) {
        wsRef.current.send(JSON.stringify(payload));
      }
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }
    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    const delay = Math.min(
      reconnectInterval * Math.pow(2, attempt - 1),
      reconnectInterval * 10
    );
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [maxReconnectAttempts, reconnectInterval]);

  const connect = useCallback(() => {
    if (isConnectingRef.current) return;
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        return;
      }
    }

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        console.warn('No authentication token found for WebSocket');
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('Navigator offline, postponing WebSocket connection');
        return;
      }

      isConnectingRef.current = true;
      const separator = url.includes('?') ? '&' : '?';
      const targetUrl = url.startsWith('ws')
        ? url
        : `${DEFAULT_WS_BASE}${url.startsWith('/') ? url : `/${url}`}`;
      const fullUrl = `${targetUrl}${separator}token=${encodeURIComponent(token)}`;
      wsRef.current = new WebSocket(fullUrl);

      wsRef.current.onopen = (event) => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        flushQueue();
        handlersRef.current.onOpen?.(event);
      };

      wsRef.current.onmessage = (event) => {
        const parsed = typeof event.data === 'string' ? safeParse(event.data) : null;
        if (parsed && typeof parsed === 'object' && (parsed as any).type === 'ping') {
          wsRef.current?.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          return;
        }
        handlersRef.current.onMessage?.(event);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        isConnectingRef.current = false;
        handlersRef.current.onClose?.(event);
        scheduleReconnect();
      };

      wsRef.current.onerror = (event) => {
        isConnectingRef.current = false;
        handlersRef.current.onError?.(event);
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('WebSocket connection error:', error);
      scheduleReconnect();
    }
  }, [flushQueue, scheduleReconnect, url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    messageQueueRef.current = [];
  }, []);

  const sendMessage = useCallback(
    (message: unknown) => {
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return;
      }
      messageQueueRef.current.push(message);
      flushQueue();
    },
    [flushQueue]
  );

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !isConnected &&
        (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)
      ) {
        connect();
      }
    };

    const handleFocus = () => {
      if (
        !isConnected &&
        (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)
      ) {
        connect();
      }
    };

    const handleOnline = () => {
      connect();
    };

    const handleOffline = () => {
      disconnect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const heartbeat = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      disconnect();
    };
  }, [connect, disconnect, isConnected]);

  return {
    isConnected,
    sendMessage,
    disconnect,
  };
};
