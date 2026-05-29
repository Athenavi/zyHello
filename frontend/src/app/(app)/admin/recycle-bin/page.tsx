"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface RecycleRecord {
  id: string;
  recordId: string;
  recordName: string;
  belongEntity: string;
  deletedBy: string;
  deletedOn: string;
  channel?: number;
}

export default function AdminRecycleBinPage() {
  const [records, setRecords] = useState<RecycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("$ALL$");
  const [entities, setEntities] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchRecords = useCallback(async (p: number, q?: string, entity?: string) => {
    setLoading(true);
    try {
      const data = await api.listRecycleBin(p, 20, entity === "$ALL$" ? undefined : entity, q);
      if (data && typeof data === "object" && "data" in data) {
        const d = data as Record<string, unknown>;
        setRecords((d.data || d.items || []) as RecycleRecord[]);
        setTotalPages((d.totalPages as number) || 1);
      } else if (Array.isArray(data)) {
        setRecords(data as RecycleRecord[]);
        setTotalPages(1);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords(page, query || undefined, entityFilter);
  }, [page, fetchRecords, query, entityFilter]);

  useEffect(() => {
    // Fetch entity list for filter dropdown
    api
      .getEntityList()
      .then((data) => {
        if (Array.isArray(data)) {
          const names = data.map((e: Record<string, unknown>) => (e.entityName || e.name) as string).filter(Boolean);
          setEntities(names);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchRecords(1, query || undefined, entityFilter);
  };

  const handleRestore = async () => {
    if (!selectedId) return;
    if (!confirm("确定要恢复此记录吗？")) return;
    setRestoring(true);
    try {
      await api.restoreRecord(selectedId);
      fetchRecords(page, query || undefined, entityFilter);
      setSelectedId(null);
    } catch {
      alert("恢复失败");
    }
    setRestoring(false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("zh-CN");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">回收站</h1>
        {selectedId && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {restoring ? "恢复中..." : "恢复选中记录"}
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-3 items-center">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="$ALL$">全部实体</option>
            {entities.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索记录ID、记录名称..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="w-10 px-4 py-3">
                  <span className="text-sm text-gray-500">#</span>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">记录名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">所属实体</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">删除人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">删除时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
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
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">回收站为空</td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <tr
                    key={record.id || idx}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedId === record.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedId(selectedId === record.id ? null : record.id)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-400">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedId === record.id ? "bg-blue-500 border-blue-500" : "border-gray-300"
                      }`}>
                        {selectedId === record.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-800">{record.recordName || "-"}</div>
                      <div className="text-xs text-gray-400 font-mono">{record.recordId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {record.belongEntity || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.deletedBy || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(record.deletedOn)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(record.id);
                          setTimeout(() => handleRestore(), 100);
                        }}
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                      >
                        恢复
                      </button>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
