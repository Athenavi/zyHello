"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus, Search, Filter, MoreVertical, Download, Upload, Trash2, Eye,
  Columns3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, X, GripVertical, Loader2, AlertCircle,
  Share2, UserPlus, RefreshCw, Settings2, ListFilter, BarChart3, FolderTree,
  ChevronDown, FileSpreadsheet, Pencil, ExternalLink, Copy, CheckSquare,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAside, setShowAside] = useState(true);
  const [asideTab, setAsideTab] = useState<"filters" | "category" | "charts">("filters");
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("$ALL$");
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [displayFieldNames, setDisplayFieldNames] = useState<string[]>([]);
  const [detailEntities, setDetailEntities] = useState<EntityMeta[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pageSize = 20;

  useEffect(() => { setMounted(true); }, []);

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchRecords = useCallback(
    async (p: number, filterData?: Record<string, unknown>) => {
      setLoading(true);
      setError("");
      try {
        const fd = filterData ??
          (activeFilter !== "$ALL$"
            ? filters.find((f) => f.id === activeFilter)?.filter
            : undefined);
        const sort = sortField ? `${sortField}:${sortOrder}` : undefined;
        const res = await api.getDataList(entity, p, pageSize, sort, filterData);
        const outer = (res as Record<string, unknown>)?.data ?? res;
        const data = outer as Record<string, unknown>;
        const items = (data.data || data.items || data.records || []) as RecordData[];
        setRecords(items);
        setTotal(((data.total || data.totalCount || 0) as number) || 0);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "加载失败";
        setError(msg);
        toast.error("数据加载失败", { description: msg });
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [entity, activeFilter, sortField, sortOrder]
  );

  useEffect(() => {
    setInitialLoading(true);
    api.getFields(entity)
      .then((res) => {
        const data = (res as Record<string, unknown>)?.data ?? res;
        const fieldList = Array.isArray(data) ? data : [];
        setFields(fieldList);
        setDisplayFieldNames(
          fieldList.slice(0, 6).map((f: EntityField) => (f.field || f.name || "") as string)
        );
      })
      .catch(() => {});

    api.getEntities()
      .then((res) => {
        const data = (res as Record<string, unknown>)?.data ?? res;
        const entities = Array.isArray(data) ? data : [];
        const meta = entities.find(
          (e: Record<string, unknown>) => (e.entity || e.name) === entity
        ) as EntityMeta | undefined;
        if (meta) setEntityMeta(meta);
      })
      .catch(() => {});

    api.getFilters(entity)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as Record<string, unknown>).data || [];
        setFilters([{ id: "$ALL$", name: "全部数据" }, ...(list as FilterItem[])]);
      })
      .catch(() => {
        setFilters([{ id: "$ALL$", name: "全部数据" }]);
      });

    fetchRecords(1);
    setPage(1);
    setSelectedIds(new Set());
  }, [entity]); // Only re-run when entity changes (avoid loop with fetchRecords)

  useEffect(() => { fetchRecords(page); }, [page, fetchRecords]);

  /* ── 工具函数 ─────────────────────────────────────── */
  const displayFields = useMemo(
    () => fields.filter((f) => displayFieldNames.includes((f.field || f.name || "") as string)),
    [fields, displayFieldNames]
  );
  const totalPages = Math.ceil(total / pageSize);

  const getCellValue = (record: RecordData, field: EntityField) => {
    const name = (field.field || field.name || "") as string;
    const value = record[name];
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      return (v.text || v.label || v.name || JSON.stringify(value)) as string;
    }
    return String(value);
  };

  const getRecordId = (record: RecordData): string =>
    (record.id || record.recordId || record.record_id || "") as string;

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(fieldName);
      setSortOrder("asc");
    }
  };

  const allSelected = records.length > 0 && selectedIds.size === records.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < records.length;

  const toggleSelectAll = () => {
    if (allSelected) {
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
      toast.success("创建成功");
      fetchRecords(page);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "创建失败";
      toast.error("创建失败", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.deleteRecord(entity, id)));
      toast.success(`已删除 ${selectedIds.size} 条记录`);
      setSelectedIds(new Set());
      fetchRecords(page);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "批量删除失败";
      toast.error("删除失败", { description: msg });
    }
  };

  const handleExport = () => {
    if (records.length === 0) return;
    const headers = displayFields.map((f) => (f.fieldLabel || f.label || f.field || "") as string);
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
    toast.success("导出成功", { description: `已导出 ${records.length} 条记录` });
  };

  const handleSearchSubmit = () => { setPage(1); fetchRecords(1); };

  const entityLabel = entityMeta?.entityLabel || entityMeta?.label || entity;

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <div className="flex h-full bg-background">
      {/* ── 侧边栏 ─────────────────────────────── */}
      {showAside && (
        <aside className={cn(
          "w-64 border-r bg-card flex-shrink-0 flex flex-col overflow-hidden",
          mounted ? "animate-slide-in-left" : "opacity-0"
        )}>
          {/* 侧边栏头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
              {([
                { key: "filters" as const, label: "筛选", icon: ListFilter },
                { key: "category" as const, label: "分类", icon: FolderTree },
                { key: "charts" as const, label: "图表", icon: BarChart3 },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setAsideTab(key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md transition-all",
                    asideTab === key
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowAside(false)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>收起侧边栏</TooltipContent>
            </Tooltip>
          </div>

          {/* 侧边栏内容 */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {asideTab === "filters" && (
                <>
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setActiveFilter(f.id); setPage(1); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2",
                        activeFilter === f.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Filter className={cn("w-3.5 h-3.5", activeFilter === f.id ? "text-primary" : "")} />
                      {f.name}
                    </button>
                  ))}
                </>
              )}
              {asideTab === "category" && (
                <EmptyState
                  icon={<FolderTree className="w-8 h-8" />}
                  title="暂无分类"
                  description="尚未创建分类规则"
                  className="py-8"
                />
              )}
              {asideTab === "charts" && (
                <div className="space-y-3">
                  <EmptyState
                    icon={<BarChart3 className="w-8 h-8" />}
                    title="暂无图表"
                    description="添加图表以可视化数据"
                    className="py-8"
                  />
                  <Button variant="outline" className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    选择图表
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* ── 主内容区 ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── 顶部工具栏 ─────────────────────────── */}
        <div className="border-b bg-card px-4 lg:px-6 py-4 space-y-3">
          {/* 第一行：面包屑 + 操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showAside && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => setShowAside(true)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>展开侧边栏</TooltipContent>
                </Tooltip>
              )}

              {/* 面包屑 */}
              <nav className="flex items-center gap-1.5 text-sm">
                <Link href="/entities" className="text-muted-foreground hover:text-foreground transition-colors">
                  业务实体
                </Link>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold text-foreground">{entityLabel}</span>
              </nav>

              <Badge variant="secondary" className="text-xs">{total} 条记录</Badge>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <Badge variant="info" className="gap-1">
                    <CheckSquare className="w-3 h-3" />
                    已选 {selectedIds.size} 条
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const id = Array.from(selectedIds)[0];
                      router.push(`/entities/${entity}/${id}`);
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    打开
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    删除
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </div>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon-sm" onClick={() => fetchRecords(page)}>
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>刷新</TooltipContent>
              </Tooltip>

              {/* 更多操作 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4 mr-1" />
                    更多
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>数据操作</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    数据导出
                    <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/admin/data?entity=${entity}&tab=import`)}>
                    <Upload className="w-4 h-4 mr-2" />
                    数据导入
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Pencil className="w-4 h-4 mr-2" />
                    批量修改
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>协作</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <UserPlus className="w-4 h-4 mr-2" />
                    分配
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    共享
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowColumnConfig(true)}>
                    <Columns3 className="w-4 h-4 mr-2" />
                    列显示配置
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>
          </div>

          {/* 第二行：搜索栏 */}
          <div className="flex items-center gap-3">
            {/* 筛选器下拉 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[120px]">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="truncate">{filters.find(f => f.id === activeFilter)?.name || "全部数据"}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {filters.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => { setActiveFilter(f.id); setPage(1); }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {activeFilter === f.id && <CheckSquare className="w-3.5 h-3.5 text-primary" />}
                      <span className={cn(activeFilter === f.id ? "font-medium" : "")}>{f.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 搜索输入框 */}
            <div className="flex-1 max-w-md">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="快速查询..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="h-9"
              />
            </div>

            {/* 高级查询 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <ListFilter className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>高级查询</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── 明细实体标签页 ─────────────────────── */}
        {detailEntities.length > 0 && (
          <div className="border-b bg-card px-4 lg:px-6">
            <div className="flex gap-0 -mb-px">
              <Link
                href={`/entities/${entity}`}
                className="px-4 py-2.5 text-sm font-medium text-primary border-b-2 border-primary"
              >
                {entityLabel}
              </Link>
              {detailEntities.map((de, idx) => (
                <Link
                  key={idx}
                  href={`/entities/${de.entity || de.name}`}
                  className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent transition-colors"
                >
                  {de.entityLabel || de.label || de.entity || de.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 错误提示 ───────────────────────────── */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-3 bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── 数据表格 ───────────────────────────── */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Card className={cn("overflow-hidden", mounted ? "animate-fade-up" : "opacity-0")}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onCheckedChange={toggleSelectAll}
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
                          className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 select-none transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {label}
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-primary" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3"><Skeleton className="w-4 h-4" /></td>
                        {displayFields.map((_, fIdx) => (
                          <td key={fIdx} className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        ))}
                        <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                      </tr>
                    ))
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={displayFields.length + 2}>
                        <EmptyState
                          icon={<FileSpreadsheet className="w-10 h-10" />}
                          title="暂无数据"
                          description="点击上方「新建」按钮创建第一条记录"
                          className="py-16"
                        />
                      </td>
                    </tr>
                  ) : (
                    records.map((record, idx) => {
                      const rid = getRecordId(record);
                      const isSelected = selectedIds.has(rid);
                      return (
                        <tr
                          key={idx}
                          onClick={() => window.location.href = `/entities/${entity}/${rid}`}
                          className={cn(
                            "group hover:bg-muted/50 transition-colors cursor-pointer",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(rid)}
                            />
                          </td>
                          {displayFields.map((field, fIdx) => (
                            <td
                              key={fIdx}
                              className="px-4 py-3 text-sm text-foreground max-w-[200px] truncate"
                              title={getCellValue(record, field)}
                            >
                              {getCellValue(record, field)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm">
                            <Link
                              href={`/entities/${entity}/${rid}`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
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

            {/* ── 分页 ───────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  共 <span className="font-medium text-foreground">{total}</span> 条记录，
                  第 <span className="font-medium text-foreground">{page}</span>/{totalPages} 页
                  {selectedIds.size > 0 && (
                    <span className="ml-2 text-primary font-medium">已选 {selectedIds.size} 条</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>首页</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>上一页</TooltipContent>
                  </Tooltip>

                  {/* 页码 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>下一页</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>末页</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── 新建记录弹窗 ───────────────────────── */}
      <Dialog open={showCreateForm} onOpenChange={(open) => {
        if (!open) { setNewRecord({}); }
        setShowCreateForm(open);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>新建 {entityLabel}</DialogTitle>
            <DialogDescription>填写以下字段创建新记录</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <div className="space-y-4 py-2">
              {fields
                .filter((f) => f.creatable !== false)
                .slice(0, 10)
                .map((field, idx) => {
                  const name = (field.field || field.name || "") as string;
                  const label = (field.fieldLabel || field.label || name) as string;
                  const type = (field.displayType || field.type || "TEXT") as string;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {label}
                        {field.nullable === false && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      {type === "TEXTAREA" || type === "NTEXT" ? (
                        <textarea
                          value={newRecord[name] || ""}
                          onChange={(e) => setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))}
                          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          rows={3}
                        />
                      ) : type === "BOOL" ? (
                        <select
                          value={newRecord[name] || ""}
                          onChange={(e) => setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))}
                          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">请选择</option>
                          <option value="true">是</option>
                          <option value="false">否</option>
                        </select>
                      ) : type === "DATE" || type === "DATETIME" ? (
                        <Input
                          type={type === "DATETIME" ? "datetime-local" : "date"}
                          value={newRecord[name] || ""}
                          onChange={(e) => setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))}
                        />
                      ) : type === "DECIMAL" || type === "INT" || type === "LONG" ? (
                        <Input
                          type="number"
                          value={newRecord[name] || ""}
                          onChange={(e) => setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))}
                        />
                      ) : (
                        <Input
                          value={newRecord[name] || ""}
                          onChange={(e) => setNewRecord((prev) => ({ ...prev, [name]: e.target.value }))}
                          placeholder={`请输入${label}`}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateForm(false); setNewRecord({}); }}>
              取消
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 列配置弹窗 ─────────────────────────── */}
      <ColumnConfigDialog
        fields={fields}
        displayFieldNames={displayFieldNames}
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
        onSave={(names) => { setDisplayFieldNames(names); setShowColumnConfig(false); }}
      />
    </div>
  );
}

/* ── 列显示配置弹窗组件 ─────────────────────────────── */
function ColumnConfigDialog({
  fields,
  displayFieldNames,
  open,
  onOpenChange,
  onSave,
}: {
  fields: EntityField[];
  displayFieldNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (names: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelected([...displayFieldNames]);
      setAvailable(
        fields
          .map((f) => (f.field || f.name || "") as string)
          .filter((n) => !displayFieldNames.includes(n))
      );
    }
  }, [open, displayFieldNames, fields]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="w-5 h-5" />
            列显示配置
          </DialogTitle>
          <DialogDescription>选择要在列表中显示的字段，拖拽调整顺序</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-2">
          {/* 已选字段 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">显示列</h4>
              <Badge variant="secondary">{selected.length}</Badge>
            </div>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="divide-y">
                {selected.map((name, idx) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-sm">{idx + 1}.</span>
                      <span className="text-sm font-medium">{getFieldLabel(name)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveField(name, "up")}
                        disabled={idx === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveField(name, "down")}
                        disabled={idx === selected.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeField(name)}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selected.length === 0 && (
                  <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                    请从右侧添加显示字段
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 可选字段 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">可选字段</h4>
              <Badge variant="secondary">{available.length}</Badge>
            </div>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="divide-y">
                {available.map((name) => (
                  <button
                    key={name}
                    onClick={() => addField(name)}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors w-full text-left group"
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {getFieldLabel(name)}
                    </span>
                    <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {available.length === 0 && (
                  <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                    所有字段已添加
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => onSave(selected)}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
