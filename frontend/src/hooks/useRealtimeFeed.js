import { useEffect, useMemo, useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
import { buildWebSocketUrl } from '../services/api';

const MAX_RECONNECT_DELAY_MS = 10000;

function getReconnectDelayMs(attempt) {
  const base = 1000 * 2 ** Math.max(0, attempt - 1);
  return Math.min(base, MAX_RECONNECT_DELAY_MS);
}

/**
 * HMAC-SHA256 hex digest (matches backend hmac + sha256 hexdigest).
 * Uses crypto-js so WebSocket auth works on plain HTTP hosts (Web Crypto subtle is secure-context only).
 */
function hmacHex(message, secret) {
  return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Hex);
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
        let authenticated = false;

        socket.onopen = () => {
          if (!isMounted) return;
          reconnectAttemptRef.current = 0;
          setStatus('authenticating');
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const parsed = JSON.parse(event.data);
            if (!authenticated && parsed?.type === 'ws_challenge') {
              const role = 'client';
              const clientId = process.env.REACT_APP_WS_CLIENT_ID || 'dashboard-client';
              const secret = process.env.REACT_APP_WS_CLIENT_SECRET || 'demo-client-secret-change-me';
              const nonce = String(parsed.nonce || '');
              const issuedAt = Number(parsed.issued_at || 0);
              const canonical = `${role}:${clientId}:${nonce}:${issuedAt}`;
              const signature = hmacHex(canonical, secret);

              socket.send(
                JSON.stringify({
                  type: 'ws_auth',
                  role,
                  id: clientId,
                  nonce,
                  issued_at: issuedAt,
                  signature,
                })
              );
              return;
            }

            if (parsed?.type === 'ws_authenticated' && parsed?.status === 'connected') {
              authenticated = true;
              setStatus('connected');
              return;
            }

            if (parsed?.type === 'ws_auth_error') {
              setStatus('error');
              return;
            }

            if (!authenticated) {
              setStatus('error');
              socket.close();
              return;
            }

            setLastMessageAt(new Date().toISOString());
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

