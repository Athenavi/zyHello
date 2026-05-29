"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
  displayType?: string;
}

interface FilterItem {
  id: string;
  name: string;
  filter?: Record<string, unknown>;
}

interface RecordData {
  [key: string]: unknown;
}

function ReferenceSearchContent() {
  const searchParams = useSearchParams();
  const [entity, setEntity] = useState("");
  const [entityLabel, setEntityLabel] = useState("");
  const [fields, setFields] = useState<EntityField[]>([]);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("$ALL$");
  const [showFilters, setShowFilters] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    const e = searchParams.get("entity") || "";
    setEntity(e);
    if (e) {
      loadMeta(e);
    }
  }, [searchParams]);

  const loadMeta = async (entityName: string) => {
    try {
      const [fieldsData, metaData, filtersData] = await Promise.all([
        api.getFields(entityName),
        api.getEntityMeta(entityName).catch(() => ({})),
        api.getFilters(entityName).catch(() => []),
      ]);

      const fieldsList = Array.isArray(fieldsData) ? fieldsData : ((fieldsData as Record<string, unknown>).fields || []);
      setFields(fieldsList as EntityField[]);
      setEntityLabel(((metaData as Record<string, unknown>).entityLabel || (metaData as Record<string, unknown>).label || entityName) as string);
      setFilters(Array.isArray(filtersData) ? (filtersData as FilterItem[]) : []);
      
      loadRecords(entityName, 1, "$ALL$", "");
    } catch {
      setLoading(false);
    }
  };

  const loadRecords = useCallback(async (entityName: string, p: number, filter: string, q: string) => {
    setLoading(true);
    try {
      const filterData = filter !== "$ALL$" ? filters.find((f) => f.id === filter)?.filter : undefined;
      const res = await api.getDataList(entityName, p, pageSize, undefined, filterData);
      const data = res as Record<string, unknown>;
      const items = (data.data || data.items || data.records || []) as RecordData[];
      setRecords(items);
      setTotal(((data.total || data.totalCount || 0) as number) || 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (entity) {
      loadRecords(entity, page, activeFilter, search);
    }
  }, [entity, page, activeFilter, search, loadRecords]);

  const getCellValue = (record: RecordData, field: EntityField) => {
    const name = field.field || field.name || "";
    const val = record[name];
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      if ((val as Record<string, unknown>).name) return String((val as Record<string, unknown>).name);
      if ((val as Record<string, unknown>).id) return String((val as Record<string, unknown>).id);
      return JSON.stringify(val);
    }
    return String(val);
  };

  const handleSelect = () => {
    if (!selectedRecord) return;
    if (window.opener) {
      window.opener.postMessage({
        type: "reference-selected",
        entity,
        data: selectedRecord,
        id: selectedRecord.id,
      }, "*");
    }
    window.close();
  };

  const displayFields = fields.slice(0, 5);

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showFilters && filters.length > 0 && (
          <aside className="w-56 border-r bg-gray-50 flex-shrink-0 flex flex-col overflow-hidden">
            <div className="p-3 border-b bg-white">
              <h3 className="text-sm font-semibold text-gray-700">过滤条件</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={() => setActiveFilter("$ALL$")}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  activeFilter === "$ALL$" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                全部记录
              </button>
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    activeFilter === f.id ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => window.close()} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-gray-800">搜索 {entityLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="搜索..."
                  className="pl-10 pr-4 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>

              {/* Toggle sidebar */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded ${showFilters ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                title="过滤条件"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b">
                  <th className="w-10 px-3 py-3">
                    <span className="sr-only">选择</span>
                  </th>
                  {displayFields.map((field, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {field.fieldLabel || field.label || field.field || field.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={displayFields.length + 1} className="text-center py-10 text-gray-400">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={displayFields.length + 1} className="text-center py-10 text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  records.map((record, idx) => {
                    const rid = String(record.id || "");
                    const isSelected = selectedRecord?.id === record.id;
                    return (
                      <tr
                        key={rid || idx}
                        onClick={() => setSelectedRecord(record)}
                        onDoubleClick={handleSelect}
                        className={`cursor-pointer transition ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-3 py-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </td>
                        {displayFields.map((field, fIdx) => (
                          <td key={fIdx} className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">
                            {getCellValue(record, field)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {total} 条记录
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">第 {page} 页</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={records.length < pageSize}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedRecord}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 ml-2"
              >
                选择
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReferenceSearchPage() {
  return (
    <Suspense>
      <ReferenceSearchContent />
    </Suspense>
  );
}
