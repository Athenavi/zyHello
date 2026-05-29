"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

/* ── 类型定义 ─────────────────────────────────────────── */
interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
  displayType?: string;
  nullable?: boolean;
  creatable?: boolean;
  updatable?: boolean;
}

interface EntityMeta {
  entity?: string;
  name?: string;
  entityLabel?: string;
  label?: string;
  icon?: string;
  entityIcon?: string;
}

interface FilterItem {
  id: string;
  name: string;
  filter?: Record<string, unknown>;
}

interface RecordData {
  [key: string]: unknown;
}

/* ── 主页面组件 ───────────────────────────────────────── */
export default function EntityRecordListPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;

  const [records, setRecords] = useState<RecordData[]>([]);
  const [fields, setFields] = useState<EntityField[]>([]);
  const [entityMeta, setEntityMeta] = useState<EntityMeta | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAside, setShowAside] = useState(true);
  const [asideTab, setAsideTab] = useState<"filters" | "category" | "charts">("filters");
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("$ALL$");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [displayFieldNames, setDisplayFieldNames] = useState<string[]>([]);
  const [detailEntities, setDetailEntities] = useState<EntityMeta[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchRecords = useCallback(
    async (p: number) => {
      setLoading(true);
      setError("");
      try {
        const filterData =
          activeFilter !== "$ALL$"
            ? filters.find((f) => f.id === activeFilter)?.filter
            : undefined;
        const sort = sortField ? `${sortField}:${sortOrder}` : undefined;
        const res = await api.getDataList(entity, p, pageSize, sort, filterData);
        const data = res as Record<string, unknown>;
        const items = (data.data || data.items || data.records || []) as RecordData[];
        setRecords(items);
        setTotal(((data.total || data.totalCount || 0) as number) || 0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [entity, activeFilter, filters, sortField, sortOrder]
  );

  useEffect(() => {
    // 加载字段
    api
      .getFields(entity)
      .then((data) => {
        const fieldList = Array.isArray(data) ? data : [];
        setFields(fieldList);
        // 默认显示前6个字段
        setDisplayFieldNames(
          fieldList.slice(0, 6).map((f: EntityField) => (f.field || f.name || "") as string)
        );
      })
      .catch(() => {});

    // 加载实体元数据
    api
      .getEntities()
      .then((data) => {
        const entities = Array.isArray(data) ? data : [];
        const meta = entities.find(
          (e: Record<string, unknown>) =>
            (e.entity || e.name) === entity
        ) as EntityMeta | undefined;
        if (meta) setEntityMeta(meta);
      })
      .catch(() => {});

    // 加载筛选器
    api
      .get(`/app/${entity}/filters`)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as Record<string, unknown>).data || [];
        setFilters([
          { id: "$ALL$", name: "全部数据" },
          ...(list as FilterItem[]),
        ]);
      })
      .catch(() => {
        setFilters([{ id: "$ALL$", name: "全部数据" }]);
      });

    fetchRecords(1);
    setPage(1);
    setSelectedIds(new Set());
  }, [entity, fetchRecords]);

  useEffect(() => {
    fetchRecords(page);
  }, [page, fetchRecords]);

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── 工具函数 ─────────────────────────────────────── */
  const displayFields = fields.filter((f) =>
    displayFieldNames.includes((f.field || f.name || "") as string)
  );
  const totalPages = Math.ceil(total / pageSize);

  const getCellValue = (record: RecordData, field: EntityField) => {
    const name = (field.field || field.name || "") as string;
    const value = record[name];
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      return (v.text || v.label || v.name || JSON.stringify(value)) as string;
    }
    return String(value);
  };

  const getRecordId = (record: RecordData): string => {
    return (record.id || record.recordId || record.record_id || "") as string;
  };

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(fieldName);
      setSortOrder("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => getRecordId(r))));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── CRUD 操作 ─────────────────────────────────────── */
  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.saveRecord(entity, { ...newRecord, meta_id: entity });
      setShowCreateForm(false);
      setNewRecord({});
      fetchRecords(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录？`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.deleteRecord(entity, id))
      );
      setSelectedIds(new Set());
      fetchRecords(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "批量删除失败");
    }
  };

  const handleExport = () => {
    // 导出功能：下载CSV
    if (records.length === 0) return;
    const headers = displayFields.map(
      (f) => (f.fieldLabel || f.label || f.field || "") as string
    );
    const rows = records.map((r) =>
      displayFields.map((f) => {
        const val = getCellValue(r, f);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearchSubmit = () => {
    setPage(1);
    fetchRecords(1);
  };

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      {showAside && (
        <aside className="w-64 border-r bg-white flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex gap-1">
              {(["filters", "category", "charts"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAsideTab(tab)}
                  className={`px-2 py-1 text-xs rounded ${
                    asideTab === tab
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab === "filters" ? "筛选" : tab === "category" ? "分类" : "图表"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAside(false)}
              className="text-gray-400 hover:text-gray-600"
              title="收起"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {asideTab === "filters" && (
              <div className="space-y-1">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      activeFilter === f.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            {asideTab === "category" && (
              <div className="text-sm text-gray-400 text-center py-8">暂无分类数据</div>
            )}
            {asideTab === "charts" && (
              <div className="space-y-3">
                <div className="text-sm text-gray-400 text-center py-4">暂无图表</div>
                <button className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  + 选择图表
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showAside && (
                <button
                  onClick={() => setShowAside(true)}
                  className="text-gray-400 hover:text-gray-600 mr-1"
                  title="展开侧边栏"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              {/* 面包屑 */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/entities" className="hover:text-blue-600">
                  业务实体
                </Link>
                <span>/</span>
                <span className="text-gray-800 font-medium">
                  {entityMeta?.entityLabel || entityMeta?.label || entity}
                </span>
              </div>
            </div>
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建
              </button>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => {
                      const id = Array.from(selectedIds)[0];
                      router.push(`/entities/${entity}/${id}`);
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition"
                  >
                    打开
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition"
                  >
                    删除
                  </button>
                </>
              )}
              {/* 更多操作 */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition flex items-center gap-1"
                >
                  更多
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                  </svg>
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        // TODO: 分配
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      分配
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        // TODO: 共享
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      共享
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        // TODO: 取消共享
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      取消共享
                    </button>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleExport();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      数据导出
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        router.push(`/admin/data?entity=${entity}&tab=import`);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      数据导入
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        // TODO: 批量修改
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      批量修改
                    </button>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowColumnConfig(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      列显示
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="flex items-center gap-3 mt-3">
            {/* 筛选器下拉 */}
            <div className="relative">
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white pr-8 appearance-none cursor-pointer"
              >
                {filters.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {/* 搜索输入框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="快速查询..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                  className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* 高级查询按钮 */}
            <button
              className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
              title="高级查询"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 明细实体标签页 */}
        {detailEntities.length > 0 && (
          <div className="bg-white border-b px-4">
            <div className="flex gap-0">
              <Link
                href={`/entities/${entity}`}
                className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
              >
                {entityMeta?.entityLabel || entityMeta?.label || entity}
              </Link>
              {detailEntities.map((de, idx) => (
                <Link
                  key={idx}
                  href={`/entities/${de.entity || de.name}`}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
                >
                  {de.entityLabel || de.label || de.entity || de.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 数据表格 */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={records.length > 0 && selectedIds.size === records.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {displayFields.map((field, idx) => {
                      const name = (field.field || field.name || "") as string;
                      const label = (field.fieldLabel || field.label || field.field || "") as string;
                      const isSorted = sortField === name;
                      return (
                        <th
                          key={idx}
                          onClick={() => handleSort(name)}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {isSorted && (
                              <svg
                                className={`w-3 h-3 text-blue-500 ${sortOrder === "desc" ? "rotate-180" : ""}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                              </svg>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={displayFields.length + 2}
                        className="px-4 py-12 text-center text-gray-400"
                      >
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
                      <td
                        colSpan={displayFields.length + 2}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    records.map((record, idx) => {
                      const rid = getRecordId(record);
                      const isSelected = selectedIds.has(rid);
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-blue-50 transition-colors ${
                            isSelected ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(rid)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          {displayFields.map((field, fIdx) => (
                            <td
                              key={fIdx}
                              className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate"
                              title={getCellValue(record, field)}
                            >
                              {getCellValue(record, field)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm">
                            <Link
                              href={`/entities/${entity}/${rid}`}
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

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  共 {total} 条记录，第 {page}/{totalPages} 页
                  {selectedIds.size > 0 && (
                    <span className="ml-2 text-blue-600">已选 {selectedIds.size} 条</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    className="px-2 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    首页
                  </button>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  {/* 页码按钮 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          page === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-white"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="px-2 py-1 text-sm border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    末页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新建记录表单弹窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                新建 {entityMeta?.entityLabel || entityMeta?.label || entity}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRecord({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {fields
                .filter((f) => f.creatable !== false)
                .slice(0, 10)
                .map((field, idx) => {
                  const name = (field.field || field.name || "") as string;
                  const label = (field.fieldLabel || field.label || name) as string;
                  const type = (field.displayType || field.type || "TEXT") as string;
                  return (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                        {field.nullable === false && (
                          <span className="text-red-500 ml-0.5">*</span>
                        )}
                      </label>
                      {type === "TEXTAREA" || type === "NTEXT" ? (
                        <textarea
                          value={newRecord[name] || ""}
                          onChange={(e) =>
                            setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      ) : type === "BOOL" ? (
                        <select
                          value={newRecord[name] || ""}
                          onChange={(e) =>
                            setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择</option>
                          <option value="true">是</option>
                          <option value="false">否</option>
                        </select>
                      ) : type === "DATE" || type === "DATETIME" ? (
                        <input
                          type={type === "DATETIME" ? "datetime-local" : "date"}
                          value={newRecord[name] || ""}
                          onChange={(e) =>
                            setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : type === "DECIMAL" || type === "INT" || type === "LONG" ? (
                        <input
                          type="number"
                          value={newRecord[name] || ""}
                          onChange={(e) =>
                            setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={newRecord[name] || ""}
                          onChange={(e) =>
                            setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRecord({});
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 列显示配置弹窗 */}
      {showColumnConfig && (
        <ColumnConfigModal
          fields={fields}
          displayFieldNames={displayFieldNames}
          onSave={(names) => {
            setDisplayFieldNames(names);
            setShowColumnConfig(false);
          }}
          onClose={() => setShowColumnConfig(false)}
        />
      )}
    </div>
  );
}

/* ── 列显示配置弹窗组件 ─────────────────────────────── */
function ColumnConfigModal({
  fields,
  displayFieldNames,
  onSave,
  onClose,
}: {
  fields: EntityField[];
  displayFieldNames: string[];
  onSave: (names: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([...displayFieldNames]);
  const [available, setAvailable] = useState<string[]>(
    fields
      .map((f) => (f.field || f.name || "") as string)
      .filter((n) => !displayFieldNames.includes(n))
  );

  const addField = (name: string) => {
    setAvailable((prev) => prev.filter((n) => n !== name));
    setSelected((prev) => [...prev, name]);
  };

  const removeField = (name: string) => {
    setSelected((prev) => prev.filter((n) => n !== name));
    setAvailable((prev) => [...prev, name]);
  };

  const moveField = (name: string, direction: "up" | "down") => {
    setSelected((prev) => {
      const idx = prev.indexOf(name);
      if (idx < 0) return prev;
      const next = [...prev];
      if (direction === "up" && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (direction === "down" && idx < next.length - 1) {
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      }
      return next;
    });
  };

  const getFieldLabel = (name: string) => {
    const f = fields.find((f) => (f.field || f.name) === name);
    return f ? ((f.fieldLabel || f.label || name) as string) : name;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">列显示配置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 已选字段 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                显示列 ({selected.length})
              </h4>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {selected.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{getFieldLabel(name)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveField(name, "up")}
                        className="text-gray-400 hover:text-gray-600"
                        title="上移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveField(name, "down")}
                        className="text-gray-400 hover:text-gray-600"
                        title="下移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeField(name)}
                        className="text-red-400 hover:text-red-600 ml-1"
                        title="移除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {selected.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">请添加显示列</div>
                )}
              </div>
            </div>
            {/* 可选字段 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                可选字段 ({available.length})
              </h4>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {available.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => addField(name)}
                  >
                    <span className="text-sm text-gray-600">{getFieldLabel(name)}</span>
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                ))}
                {available.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">所有字段已添加</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => onSave(selected)}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
