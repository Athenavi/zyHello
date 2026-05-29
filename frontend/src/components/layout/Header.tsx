"use client";

import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  Moon,
  Sun,
  Monitor,
  Menu,
  Settings,
  LogOut,
  User,
  Command,
} from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { user, logout } = useAuth();
  const {
    breadcrumbs,
    sidebarMobileOpen,
    toggleMobileSidebar,
    setCommandPaletteOpen,
    theme,
    setTheme,
  } = useAppStore();

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 sticky top-0 z-30 flex-shrink-0">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={toggleMobileSidebar}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="hidden md:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-muted-foreground">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Command Palette Trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex items-center gap-2 text-muted-foreground h-8 px-3"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">搜索...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Quick search (mobile) */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="w-5 h-5" />
      </Button>

      {/* Theme Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            {theme === "dark" ? (
              <Moon className="w-[18px] h-[18px]" />
            ) : theme === "light" ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Monitor className="w-[18px] h-[18px]" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="w-4 h-4 mr-2" />
            亮色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="w-4 h-4 mr-2" />
            暗色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="w-4 h-4 mr-2" />
            跟随系统
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse-soft" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>通知</span>
            <Badge variant="secondary" className="text-[10px] h-5">3 条未读</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-64 overflow-y-auto">
            {[
              { title: "新任务分配", desc: "张三将任务「完成设计稿」分配给了你", time: "5分钟前" },
              { title: "审批提醒", desc: "你有1条待审批的报销单", time: "1小时前" },
              { title: "系统更新", desc: "系统将在今晚22:00进行维护升级", time: "2小时前" },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">{n.time}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.desc}</span>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="justify-center">
            <Link href="/notifications" className="text-xs text-primary">查看全部通知</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              {(user?.full_name || user?.login_name || "U")[0].toUpperCase()}
            </div>
            <span className="hidden md:inline text-sm font-medium max-w-24 truncate">
              {user?.full_name || user?.login_name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{user?.full_name || user?.login_name}</span>
              <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <User className="w-4 h-4 mr-2" />
              个人资料
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
