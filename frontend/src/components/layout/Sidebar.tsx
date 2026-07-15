"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Database,
  Rss,
  FolderKanban,
  Bell,
  Contact,
  FolderOpen,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Users,
  Workflow,
  Link2,
  HardDrive,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/entities", label: "业务实体", icon: Database },
  { href: "/feeds", label: "动态", icon: Rss },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/notifications", label: "消息", icon: Bell },
  { href: "/contacts", label: "通讯录", icon: Contact },
  { href: "/files", label: "文件管理", icon: FolderOpen },
  { href: "/ai-chat", label: "AI 助手", icon: Bot },
];

const adminItems: NavItem[] = [
  { href: "/admin/metadata", label: "元数据管理", icon: Database },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/robots", label: "触发器", icon: Zap },
  { href: "/admin/integration", label: "系统集成", icon: Link2 },
  { href: "/admin/data", label: "数据管理", icon: HardDrive },
  { href: "/admin/role-privileges", label: "权限管理", icon: Shield },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const [adminOpen, setAdminOpen] = useState(true);

  if (!user) return null;

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border flex-shrink-0">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-base font-bold text-white tracking-tight">ZyHello</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg p-1.5 transition-all",
            sidebarCollapsed && "hidden"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-white")} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Section */}
        <div className="mt-6 px-3">
          {!sidebarCollapsed ? (
            <>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
              >
                <span>管理后台</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", !adminOpen && "-rotate-90")} />
              </button>
              {adminOpen && (
                <div className="mt-1 space-y-0.5">
                  {adminItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-white")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-0.5">
              <div className="flex justify-center py-1">
                <div className="w-6 h-px bg-sidebar-border" />
              </div>
              {adminItems.slice(0, 3).map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center rounded-lg px-2 py-2 transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Collapse toggle (when collapsed) */}
      {sidebarCollapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg p-2 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Footer */}
      <div className="border-t border-sidebar-border p-3 flex-shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {(user.full_name || user.login_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.full_name || user.login_name}
              </div>
              <div className="text-[11px] text-sidebar-foreground/50 truncate">
                {user.email || user.login_name}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Link
                href="/settings"
                className="text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent rounded-lg p-1.5 transition-all"
                title="设置"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                className="text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent rounded-lg p-1.5 transition-all"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {(user.full_name || user.login_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-red-400 transition-all"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
