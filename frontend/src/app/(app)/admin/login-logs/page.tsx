"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface LoginLog {
  id: string;
  user: { loginName: string; fullName: string };
  ipAddr: string;
  userAgent: string;
  loginTime: string;
  logoutTime?: string;
  loginState?: number;
}

interface OnlineUser {
  userId: string;
  fullName: string;
  loginName: string;
  activeTime: string;
  ipAddr?: string;
}

export default function AdminLoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [showOnline, setShowOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);

  const fetchLogs = useCallback(async (p: number, q?: string) => {
    setLoading(true);
    try {
      const data = await api.listLoginLogs(p, 20, q);
      if (data && Array.isArray(data)) {
        setLogs(data);
        setTotalPages(Math.ceil((data as unknown as { totalRecords: number }).totalRecords / 20) || 1);
      } else if (data && typeof data === "object" && "data" in data) {
        const d = data as Record<string, unknown>;
        setLogs((d.data || d.items || []) as LoginLog[]);
        setTotalPages(((d.totalPages as number) || 1) as number);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(page, query || undefined);
  }, [page, fetchLogs, query]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1, query || undefined);
  };

  const handleViewOnline = async () => {
    setShowOnline(true);
    setOnlineLoading(true);
    try {
      const data = await api.listOnlineUsers();
      if (Array.isArray(data)) {
        setOnlineUsers(data);
      } else if (data && typeof data === "object" && "data" in data) {
        setOnlineUsers(((data as Record<string, unknown>).data || []) as OnlineUser[]);
      } else {
        setOnlineUsers([]);
      }
    } catch {
      setOnlineUsers([]);
    }
    setOnlineLoading(false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("zh-CN");
  };

  const getLoginStateLabel = (state?: number) => {
    if (state === 1) return { text: "成功", color: "bg-green-100 text-green-700" };
    if (state === 0) return { text: "失败", color: "bg-red-100 text-red-700" };
    return { text: "成功", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">登录日志</h1>
        <button
          onClick={handleViewOnline}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          在线用户
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜索用户名、姓名、IP地址..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">IP 地址</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">登录时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">登出时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备/浏览器</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无登录日志</td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const stateInfo = getLoginStateLabel(log.loginState);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">
                              {(log.user?.fullName || log.user?.loginName || "?").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{log.user?.fullName || "-"}</div>
                            <div className="text-xs text-gray-400">{log.user?.loginName || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.ipAddr || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.loginTime)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.logoutTime)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateInfo.color}`}>
                          {stateInfo.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]" title={log.userAgent}>
                        {log.userAgent || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pageNum = start + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      pageNum === page ? "bg-blue-500 text-white border-blue-500" : "hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Online Users Modal */}
      {showOnline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">在线用户</h2>
              <button onClick={() => setShowOnline(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {onlineLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  加载中...
                </div>
              ) : onlineUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无在线用户</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {onlineUsers.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium">{(u.fullName || u.loginName || "?").charAt(0)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.fullName || u.loginName}</div>
                        <div className="text-xs text-gray-400">
                          {u.ipAddr && <span className="mr-2">IP: {u.ipAddr}</span>}
                          活跃: {formatDate(u.activeTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t text-right">
              <span className="text-sm text-gray-500">共 {onlineUsers.length} 位在线用户</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
