"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function EntityRecordListPage() {
  const params = useParams();
  const entity = params.entity as string;

  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const fetchRecords = useCallback(
    async (p: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getDataList(entity, p, pageSize);
        const data = res as Record<string, unknown>;
        setRecords(
          (data.data || data.items || data.records || []) as Record<
            string,
            unknown
          >[]
        );
        setTotal(((data.total || data.totalCount || 0) as number) || 0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [entity]
  );

  useEffect(() => {
    api
      .getFields(entity)
      .then((data) => setFields(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetchRecords(1);
  }, [entity, fetchRecords]);

  useEffect(() => {
    fetchRecords(page);
  }, [page, fetchRecords]);

  const displayFields = fields.slice(0, 6);
  const totalPages = Math.ceil(total / pageSize);

  const getCellValue = (
    record: Record<string, unknown>,
    field: Record<string, unknown>
  ) => {
    const name = (field.field || field.name || "") as string;
    const value = record[name];
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      return (v.text || v.label || v.name || JSON.stringify(value)) as string;
    }
    return String(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/entities" className="hover:text-blue-600">
              业务实体
            </Link>
            <span>/</span>
            <span className="text-gray-800">{entity}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{entity} 列表</h1>
        </div>
        <button
          onClick={() => {
            /* TODO: open create form */
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          + 新建记录
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {displayFields.map((field, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {(field.fieldLabel || field.label || field.field || "") as string}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={displayFields.length + 1}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    加载中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayFields.length + 1}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => {
                  const r = record as Record<string, unknown>;
                  const recordId = (r.id || r.recordId || r.record_id || "") as string;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      {displayFields.map((field, fIdx) => (
                        <td
                          key={fIdx}
                          className="px-4 py-3 text-sm text-gray-700"
                        >
                          {getCellValue(r, field)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/entities/${entity}/${recordId}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          查看
                        </Link>
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
            <div className="text-sm text-gray-500">
              共 {total} 条记录，第 {page}/{totalPages} 页
            </div>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
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
