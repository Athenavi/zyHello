"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface RevisionRecord {
  id: string;
  entity: string;
  recordId: string;
  recordName?: string;
  revisionType: number;
  revisionContent?: string;
  createdBy?: { loginName: string; fullName: string };
  createdOn: string;
}

const REVISION_TYPE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "新建", color: "bg-green-100 text-green-700" },
  2: { label: "更新", color: "bg-blue-100 text-blue-700" },
  3: { label: "删除", color: "bg-red-100 text-red-700" },
  4: { label: "分配", color: "bg-yellow-100 text-yellow-700" },
  5: { label: "共享", color: "bg-purple-100 text-purple-700" },
};

export default function RevisionHistoryPage() {
  const [records, setRecords] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [entities, setEntities] = useState<string[]>([]);
  const [detailRecord, setDetailRecord] = useState<RevisionRecord | null>(null);

  const fetchRecords = useCallback(async (p: number, q?: string, entity?: string) => {
    setLoading(true);
    try {
      const data = await api.listRevisionHistory(p, 20, entity, q);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const items = (d.data || d.items || d.revisions || (Array.isArray(data) ? data : [])) as RevisionRecord[];
        setRecords(items);
        setTotalPages(((d.totalPages as number) || Math.ceil(((d.totalRecords as number) || items.length) / 20)) || 1);
        if (d.entities && Array.isArray(d.entities)) {
          setEntities(d.entities as string[]);
        }
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(page, query, entityFilter);
  }, [page, query, entityFilter, fetchRecords]);

  const handleSearch = () => {
    setPage(1);
    fetchRecords(1, query, entityFilter);
  };

  const getTypeInfo = (type: number) =>
    REVISION_TYPE_LABELS[type] || { label: `类型${type}`, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">变更历史</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有实体记录的变更历史</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部实体</option>
            {entities.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="搜索记录..."
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">实体</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">记录</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无变更记录</td></tr>
              ) : (
                records.map((r, idx) => {
                  const typeInfo = getTypeInfo(r.revisionType);
                  return (
                    <tr key={r.id || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{r.entity}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.recordName || r.recordId}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.createdBy?.fullName || r.createdBy?.loginName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.createdOn ? new Date(r.createdOn).toLocaleString("zh-CN") : "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => setDetailRecord(r)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          详情
                        </button>
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

      {/* Detail Modal */}
      {detailRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailRecord(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">变更详情</h3>
              <button onClick={() => setDetailRecord(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div><span className="text-gray-500 w-20 inline-block">实体：</span>{detailRecord.entity}</div>
              <div><span className="text-gray-500 w-20 inline-block">记录ID：</span>{detailRecord.recordId}</div>
              <div><span className="text-gray-500 w-20 inline-block">记录名称：</span>{detailRecord.recordName || "-"}</div>
              <div><span className="text-gray-500 w-20 inline-block">操作类型：</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeInfo(detailRecord.revisionType).color}`}>
                  {getTypeInfo(detailRecord.revisionType).label}
                </span>
              </div>
              <div><span className="text-gray-500 w-20 inline-block">操作人：</span>{detailRecord.createdBy?.fullName || "-"}</div>
              <div><span className="text-gray-500 w-20 inline-block">时间：</span>{new Date(detailRecord.createdOn).toLocaleString("zh-CN")}</div>
              {detailRecord.revisionContent && (
                <div className="mt-2">
                  <div className="text-gray-500 mb-1">变更内容：</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">{detailRecord.revisionContent}</pre>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t text-right">
              <button onClick={() => setDetailRecord(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
