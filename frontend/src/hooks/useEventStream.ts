import { useEffect, useRef, useCallback, useState } from 'react';

interface StreamEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

interface UseEventStreamOptions {
  url: string;
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export function useEventStream({
  url,
  onEvent,
  onError,
  reconnectDelay = 3000,
  maxReconnectAttempts = 5,
}: UseEventStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const handlersRef = useRef<Map<string, (payload: any) => void>>(new Map());

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          onEvent?.(data);
          if (handlersRef.current.has(data.type)) {
            handlersRef.current.get(data.type)?.(data.payload);
          }
        } catch (err) {
          console.error('Failed to parse event:', err);
        }
      };

      wsRef.current.onerror = () => {
        onError?.(new Error('WebSocket connection error'));
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current += 1;
          setTimeout(connect, reconnectDelay);
        } else {
          onError?.(new Error('Max reconnect attempts reached'));
        }
      };
    } catch (err) {
      onError?.(err as Error);
    }
  }, [url, onEvent, onError, reconnectDelay, maxReconnectAttempts]);

  const subscribe = useCallback((eventType: string, handler: (payload: any) => void) => {
    handlersRef.current.set(eventType, handler);
    return () => { handlersRef.current.delete(eventType); };
  }, []);

  const send = useCallback((type: string, payload: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  return { isConnected, subscribe, send, ws: wsRef.current };
}
