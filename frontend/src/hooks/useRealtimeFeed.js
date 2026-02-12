import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWebSocketUrl } from '../services/api';

const MAX_RECONNECT_DELAY_MS = 10000;

function getReconnectDelayMs(attempt) {
  const base = 1000 * 2 ** Math.max(0, attempt - 1);
  return Math.min(base, MAX_RECONNECT_DELAY_MS);
}

/**
 * Maintains a resilient WebSocket connection for live telemetry updates.
 */
export default function useRealtimeFeed({ enabled = true, onMessage }) {
  const wsUrl = useMemo(() => buildWebSocketUrl(), []);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const [status, setStatus] = useState('idle');
  const [lastMessageAt, setLastMessageAt] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return undefined;
    }

    let isMounted = true;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function closeSocket() {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (error) {
          // Ignore close failures during teardown.
        }
        socketRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (!isMounted) return;
      reconnectAttemptRef.current += 1;
      const delay = getReconnectDelayMs(reconnectAttemptRef.current);

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    }

    function connect() {
      closeSocket();
      setStatus('connecting');

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          reconnectAttemptRef.current = 0;
          setStatus('connected');
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          setLastMessageAt(new Date().toISOString());

          try {
            const parsed = JSON.parse(event.data);
            if (typeof onMessage === 'function') {
              onMessage(parsed);
            }
          } catch (error) {
            // Skip malformed packets and keep stream alive.
          }
        };

        socket.onerror = () => {
          if (!isMounted) return;
          setStatus('error');
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setStatus('disconnected');
          scheduleReconnect();
        };
      } catch (error) {
        if (!isMounted) return;
        setStatus('error');
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      isMounted = false;
      clearReconnectTimer();
      closeSocket();
    };
  }, [enabled, onMessage, wsUrl]);

  return {
    wsUrl,
    status,
    lastMessageAt,
  };
}

