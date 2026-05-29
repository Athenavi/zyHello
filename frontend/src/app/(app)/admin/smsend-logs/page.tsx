"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface SmsLog {
  id: string;
  smsType: number;
  to: string;
  content: string;
  sendTime: string;
  status?: number;
  errorMsg?: string;
  createdBy?: { loginName: string; fullName: string };
}

const SMS_TYPE_LABELS: Record<number, string> = {
  1: "验证码",
  2: "通知",
  3: "营销",
  4: "告警",
};

export default function SmsLogsPage() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");

  const fetchLogs = useCallback(async (p: number, q?: string) => {
    setLoading(true);
    try {
      const data = await api.listSmsLogs(p, 20, q);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const items = (d.data || d.items || d.logs || (Array.isArray(data) ? data : [])) as SmsLog[];
        setLogs(items);
        setTotalPages(((d.totalPages as number) || Math.ceil(((d.totalRecords as number) || items.length) / 20)) || 1);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, query);
  }, [page, query, fetchLogs]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1, query);
  };

  const getStatusBadge = (status?: number) => {
    if (status === 1 || status === 0) return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">成功</span>;
    if (status === -1) return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">失败</span>;
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">未知</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">短信发送统计</h1>
        <p className="text-sm text-gray-500 mt-1">查看短信发送记录与状态</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="搜索手机号、内容..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            搜索
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">接收号码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">发送人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">发送时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无短信记录</td></tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{SMS_TYPE_LABELS[log.smsType] || "其他"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{log.to}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{log.content}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.createdBy?.fullName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.sendTime ? new Date(log.sendTime).toLocaleString("zh-CN") : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
