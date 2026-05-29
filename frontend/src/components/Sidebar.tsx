"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: "📊" },
  { href: "/entities", label: "业务实体", icon: "📋" },
  { href: "/feeds", label: "动态", icon: "📢" },
  { href: "/projects", label: "项目", icon: "📁" },
  { href: "/notifications", label: "消息", icon: "🔔" },
];

const adminItems = [
  { href: "/admin/metadata", label: "元数据管理", icon: "🗂️" },
  { href: "/admin/users", label: "用户管理", icon: "👥" },
  { href: "/admin/robots", label: "触发器", icon: "🤖" },
  { href: "/admin/integration", label: "系统集成", icon: "🔗" },
  { href: "/admin/data", label: "数据管理", icon: "💾" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  if (!user) return null;

  return (
    <aside
      className={`bg-gray-900 text-white flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <span className="text-lg font-bold text-blue-400">Rebuild</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white text-sm"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Admin section */}
        {!collapsed && (
          <div className="mt-4">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 w-full"
            >
              <span>⚙️</span>
              <span>管理后台</span>
              <span className="ml-auto">{adminOpen ? "▾" : "▸"}</span>
            </button>
            {adminOpen &&
              adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 pl-8 text-sm transition-colors ${
                    pathname.startsWith(item.href)
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-700 p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
              {(user.full_name || user.login_name || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.full_name || user.login_name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user.email || user.login_name}
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 text-sm"
              title="退出登录"
            >
              ⏻
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-400 text-sm w-full text-center"
            title="退出登录"
          >
            ⏻
          </button>
        )}
      </div>
    </aside>
  );
}
