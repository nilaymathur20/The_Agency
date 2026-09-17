import { useEffect, useRef, useCallback, useState } from 'react';
export function useEventStream({ url, onEvent, onError, reconnectDelay = 3000, maxReconnectAttempts = 5, }) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectCountRef = useRef(0);
    const handlersRef = useRef(new Map());
    const connect = useCallback(() => {
        try {
            wsRef.current = new WebSocket(url);
            wsRef.current.onopen = () => {
                setIsConnected(true);
                reconnectCountRef.current = 0;
            };
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onEvent?.(data);
                    if (handlersRef.current.has(data.type)) {
                        handlersRef.current.get(data.type)?.(data.payload);
                    }
                }
                catch (err) {
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
                }
                else {
                    onError?.(new Error('Max reconnect attempts reached'));
                }
            };
        }
        catch (err) {
            onError?.(err);
        }
    }, [url, onEvent, onError, reconnectDelay, maxReconnectAttempts]);
    const subscribe = useCallback((eventType, handler) => {
        handlersRef.current.set(eventType, handler);
        return () => { handlersRef.current.delete(eventType); };
    }, []);
    const send = useCallback((type, payload) => {
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
