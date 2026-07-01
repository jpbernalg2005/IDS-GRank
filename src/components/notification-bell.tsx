"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function NotificationBell({ userId }: { userId: number }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Silence unused variable lint warning — userId is passed for future SSE or auth hints
  void userId;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silently ignore network errors during polling
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await markRead(n.id);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        id="notification-bell-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          className="absolute right-0 top-11 z-50 w-80 max-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-lg flex flex-col"
          role="dialog"
          aria-label="Panel de notificaciones"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Notificaciones</h2>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-button"
                  onClick={markAllRead}
                  title="Marcar todas como leídas"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Todas leídas</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Cerrar panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {notifications.map((n) => {
                  const inner = (
                    <div
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 ${
                        !n.isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Unread dot */}
                      <span
                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full transition-colors ${
                          !n.isRead ? "bg-primary" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markRead(n.id);
                          }}
                          title="Marcar como leída"
                          className="flex-shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Marcar como leída"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.linkUrl ? (
                        <Link
                          href={n.linkUrl}
                          onClick={() => handleItemClick(n)}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div
                          onClick={() => !n.isRead && markRead(n.id)}
                          className="cursor-default"
                        >
                          {inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer link */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2 text-center">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
