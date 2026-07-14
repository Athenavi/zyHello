/**
 * WebSocket hook for real-time notifications.
 *
 * Usage:
 *   const { connected, unreadCount } = useWebSocket();
 *
 * The hook automatically connects when the user is authenticated,
 * handles reconnection, and dispatches notification events.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ||
  "ws://localhost:8000";

interface WSMessage {
  type: string;
  data?: Record<string, unknown>;
  count?: number;
  [key: string]: unknown;
}

type NotificationHandler = (data: Record<string, unknown>) => void;
type UnreadCountHandler = (count: number) => void;

// Global listeners so multiple components can subscribe
const listeners = {
  notification: new Set<NotificationHandler>(),
  unreadCount: new Set<UnreadCountHandler>(),
};

export function onNotification(handler: NotificationHandler) {
  listeners.notification.add(handler);
  return () => { listeners.notification.delete(handler); };
}

export function onUnreadCount(handler: UnreadCountHandler) {
  listeners.unreadCount.add(handler);
  return () => { listeners.unreadCount.delete(handler); };
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pingTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Send heartbeat every 30 seconds
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "notification":
              listeners.notification.forEach((fn) => fn(msg.data || {}));
              break;
            case "unread_count":
              setUnreadCount(msg.count ?? 0);
              listeners.unreadCount.forEach((fn) => fn(msg.count ?? 0));
              break;
            case "pong":
              // heartbeat reply — no action needed
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingTimer.current) clearInterval(pingTimer.current);
        // Reconnect after 5 seconds
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Connection failed, retry
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [connect]);

  return { connected, unreadCount };
}
