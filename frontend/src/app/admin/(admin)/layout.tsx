"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import {
  Database, Users, Zap, Link2, HardDrive, Shield,
  ChevronLeft, Settings, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const adminNavItems: AdminNavItem[] = [
  { href: "/admin/metadata", label: "元数据管理", icon: Database, description: "实体、字段与表单设计" },
  { href: "/admin/users", label: "用户管理", icon: Users, description: "用户、部门与团队" },
  { href: "/admin/robots", label: "触发器", icon: Zap, description: "自动化规则与审批流程" },
  { href: "/admin/integration", label: "系统集成", icon: Link2, description: "API密钥与外部服务" },
  { href: "/admin/data", label: "数据管理", icon: HardDrive, description: "导入、导出与报表" },
  { href: "/admin/role-privileges", label: "权限管理", icon: Shield, description: "角色与权限配置" },
  { href: "/admin/project", label: "项目管理", icon: FolderKanban, description: "项目与任务管理" },
  { href: "/admin/feeds", label: "动态管理", icon: Rss, description: "动态、公告、日程管理" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Theme effect
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "system";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
              <Settings className="w-7 h-7 text-white animate-spin" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">加载管理后台...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getUserInitials = (name?: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b flex-shrink-0">
        <Link href="/admin/metadata" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight">管理后台</span>
            <span className="block text-[10px] text-muted-foreground -mt-0.5">Admin Console</span>
          </div>
        </Link>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-0.5">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{item.label}</span>
                  <span className={cn(
                    "block text-[11px] truncate transition-colors",
                    active ? "text-primary/70" : "text-muted-foreground/60"
                  )}>
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t flex-shrink-0">
        <div className="p-3">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-muted-foreground">
            <Link href="/dashboard">
              <ChevronLeft className="w-4 h-4" />
              返回主应用
            </Link>
          </Button>
        </div>
        <Separator />
        <div className="p-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {getUserInitials(user.full_name || user.login_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name || user.login_name}</p>
            <p className="text-xs text-muted-foreground truncate">管理员</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar border-r border-sidebar-border flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b flex items-center px-4 lg:px-6 gap-3 flex-shrink-0 bg-card/50 backdrop-blur-sm">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Settings className="w-3 h-3" />
            管理后台
          </Badge>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/dashboard">
              <ChevronLeft className="w-4 h-4 mr-1" />
              主应用
            </Link>
          </Button>
        </div>

        {/* Page content */}
        <div className={cn("flex-1 overflow-auto", mounted ? "animate-fade-in" : "opacity-0")}>
          {children}
        </div>
      </main>
    </div>
  );
}
