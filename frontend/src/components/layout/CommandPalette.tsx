"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  LayoutDashboard,
  Database,
  Rss,
  FolderKanban,
  Bell,
  Contact,
  FolderOpen,
  Bot,
  Settings,
  Users,
  Shield,
  Link2,
  Zap,
  ArrowRight,
  FileText,
  Hash,
  Clock,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  category: string;
  shortcut?: string;
}

const commands: CommandItem[] = [
  // Navigation
  { id: "nav-dashboard", label: "仪表盘", icon: LayoutDashboard, href: "/dashboard", category: "导航" },
  { id: "nav-entities", label: "业务实体", icon: Database, href: "/entities", category: "导航" },
  { id: "nav-feeds", label: "动态", icon: Rss, href: "/feeds", category: "导航" },
  { id: "nav-projects", label: "项目", icon: FolderKanban, href: "/projects", category: "导航" },
  { id: "nav-notifications", label: "消息通知", icon: Bell, href: "/notifications", category: "导航" },
  { id: "nav-contacts", label: "通讯录", icon: Contact, href: "/contacts", category: "导航" },
  { id: "nav-files", label: "文件管理", icon: FolderOpen, href: "/files", category: "导航" },
  { id: "nav-ai", label: "AI 助手", icon: Bot, href: "/ai-chat", category: "导航" },
  { id: "nav-settings", label: "设置", icon: Settings, href: "/settings", category: "导航", shortcut: "⌘," },

  // Admin
  { id: "admin-metadata", label: "元数据管理", icon: Database, href: "/admin/metadata", category: "管理后台" },
  { id: "admin-users", label: "用户管理", icon: Users, href: "/admin/users", category: "管理后台" },
  { id: "admin-roles", label: "权限管理", icon: Shield, href: "/admin/role-privileges", category: "管理后台" },
  { id: "admin-triggers", label: "触发器", icon: Zap, href: "/admin/robots", category: "管理后台" },
  { id: "admin-integration", label: "系统集成", icon: Link2, href: "/admin/integration", category: "管理后台" },

  // Actions
  { id: "action-theme", label: "切换主题", icon: FileText, category: "操作", action: () => {} },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Group by category
  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatList = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      setCommandPaletteOpen(false);
      if (cmd.href) {
        router.push(cmd.href);
      } else if (cmd.action) {
        cmd.action();
      }
    },
    [router, setCommandPaletteOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatList[selectedIndex]) {
          executeCommand(flatList[selectedIndex]);
        }
        break;
      case "Escape":
        setCommandPaletteOpen(false);
        break;
    }
  };

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl overflow-hidden rounded-xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面、操作、数据..."
            className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {flatList.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
              未找到匹配结果
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    const idx = flatList.indexOf(cmd);
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedIndex === idx
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {selectedIndex === idx && (
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">↵</kbd>
            打开
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">ESC</kbd>
            关闭
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
