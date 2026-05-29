import { create } from "zustand";

/* ─── App Store ─────────────────────────────────────────── */
interface AppState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  commandPaletteOpen: boolean;
  theme: "light" | "dark" | "system";
  searchQuery: string;
  breadcrumbs: { label: string; href?: string }[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  setCommandPaletteOpen: (v: boolean) => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  setSearchQuery: (q: string) => void;
  setBreadcrumbs: (items: { label: string; href?: string }[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  commandPaletteOpen: false,
  theme: "system",
  searchQuery: "",
  breadcrumbs: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  setTheme: (t) => set({ theme: t }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setBreadcrumbs: (items) => set({ breadcrumbs: items }),
}));

/* ─── Notification Store ────────────────────────────────── */
export interface Notification {
  id: string;
  title: string;
  message?: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  timestamp: Date;
  href?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((s) => {
      const notification: Notification = {
        ...n,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date(),
        read: false,
      };
      return {
        notifications: [notification, ...s.notifications].slice(0, 100),
        unreadCount: s.unreadCount + 1,
      };
    }),
  markAsRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: s.notifications.find((n) => n.id === id && !n.read)
        ? s.unreadCount - 1
        : s.unreadCount,
    })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
