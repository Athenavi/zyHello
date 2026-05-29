"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Edit3, Trash2, UserPlus, Share2, Printer, MoreVertical,
  History, FileText, Eye, Save, X, Clock, User, Building2, Copy,
  ExternalLink, AlertCircle, Loader2, ChevronRight, Tag, Calendar,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

interface RecordData {
  [key: string]: unknown;
}

/* ── 主页面组件 ───────────────────────────────────────── */
export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;
  const recordId = params.recordId as string;

  const [record, setRecord] = useState<RecordData | null>(null);
  const [fields, setFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RecordData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchRecord = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fieldsResRaw, recordResRaw] = await Promise.all([
        api.getFields(entity),
        api.getRecord(entity, recordId),
      ]);
      const fieldsData = (fieldsResRaw as Record<string, unknown>)?.data ?? fieldsResRaw;
      setFields(Array.isArray(fieldsData) ? fieldsData : []);
      const recordOuter = (recordResRaw as Record<string, unknown>)?.data ?? recordResRaw;
      const d = recordOuter as Record<string, unknown>;
      const rec = (d.record || d.data || d) as RecordData;
      setRecord(rec);
      setEditData({ ...rec });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setError(msg);
      toast.error("加载失败", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [entity, recordId]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  /* ── 操作处理 ─────────────────────────────────────── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteRecord(entity, recordId);
      toast.success("删除成功");
      router.push(`/entities/${entity}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "删除失败";
      toast.error("删除失败", { description: msg });
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveRecord(entity, { ...editData, id: recordId });
      setIsEditing(false);
      toast.success("保存成功");
      fetchRecord();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "保存失败";
      toast.error("保存失败", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await api.post(`/app/${entity}/record-share`, { record_id: recordId });
      toast.success("共享成功");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "共享失败";
      toast.error("共享失败", { description: msg });
    }
  };

  const handleAssign = async () => {
    if (!assignUserId.trim()) return;
    try {
      await api.post(`/app/${entity}/record-assign`, {
        record_id: recordId,
        assignee: assignUserId,
      });
      toast.success("分配成功");
      setShowAssignDialog(false);
      setAssignUserId("");
      fetchRecord();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "分配失败";
      toast.error("分配失败", { description: msg });
    }
  };

  const loadHistory = async () => {
    if (showHistory && history.length > 0) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/app/${entity}/record-history?record=${recordId}`);
      const data = res as Record<string, unknown>;
      setHistory(((data.data || data.items || []) as RecordData[]) || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(recordId);
    toast.success("已复制记录ID");
  };

  /* ── 工具函数 ─────────────────────────────────────── */
  const getFieldValue = (rec: RecordData, field: EntityField) => {
    const name = (field.field || field.name || "") as string;
    const value = rec[name];
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">—</span>;
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      if (v.id) {
        return (
          <Link
            href={`/entities/${v.entity || entity}/${v.id}`}
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {(v.text || v.label || v.name || String(v.id)) as string}
            <ExternalLink className="w-3 h-3" />
          </Link>
        );
      }
      return <span>{(v.text || v.label || v.name || JSON.stringify(value)) as string}</span>;
    }
    if (typeof value === "boolean") return <span>{value ? "是" : "否"}</span>;
    return <span>{String(value)}</span>;
  };

  const getUserDisplay = (userData: unknown): string => {
    if (!userData) return "—";
    if (typeof userData === "string") return userData;
    if (typeof userData === "object") {
      const u = userData as Record<string, unknown>;
      return (u.name || u.fullName || u.text || u.id || "—") as string;
    }
    return String(userData);
  };

  const getUserInitials = (userData: unknown): string => {
    const name = getUserDisplay(userData);
    return name === "—" ? "?" : name.slice(0, 2).toUpperCase();
  };

  const basicFields = useMemo(
    () => fields.filter((f) => {
      const type = (f.displayType || f.type || "").toUpperCase();
      return !["NTEXT", "FILE", "IMAGE", "ATTACHMENT"].includes(type);
    }),
    [fields]
  );

  const detailFields = useMemo(
    () => fields.filter((f) => {
      const type = (f.displayType || f.type || "").toUpperCase();
      return ["NTEXT", "FILE", "IMAGE", "ATTACHMENT"].includes(type);
    }),
    [fields]
  );

  const recordTitle = record
    ? (record.name || record.subject || record.title || recordId) as string
    : recordId;

  /* ── 加载骨架屏 ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <Card>
                <CardContent className="p-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start px-6 py-4 border-b last:border-0">
                      <Skeleton className="h-4 w-28" />
                      <div className="flex-1 ml-4">
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="w-72 hidden lg:block space-y-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── 错误状态 ─────────────────────────────────────── */
  if (error && !record) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">加载失败</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href={`/entities/${entity}`}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回列表
                </Link>
              </Button>
              <Button onClick={fetchRecord}>重试</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!record) return null;

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── 顶部导航栏 ───────────────────────────── */}
      <div className={cn("border-b bg-card px-4 lg:px-6 py-3", mounted ? "animate-fade-in" : "opacity-0")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/entities/${entity}`}>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回列表</TooltipContent>
            </Tooltip>

            <nav className="flex items-center gap-1.5 text-sm">
              <Link href="/entities" className="text-muted-foreground hover:text-foreground transition-colors">
                业务实体
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <Link href={`/entities/${entity}`} className="text-muted-foreground hover:text-foreground transition-colors">
                {entity}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground truncate max-w-[200px]">{recordTitle}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditData({ ...record }); }}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSave} loading={saving}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  编辑
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>记录操作</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      分配
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      共享
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.print()}>
                      <Printer className="w-4 h-4 mr-2" />
                      打印
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyId}>
                      <Copy className="w-4 h-4 mr-2" />
                      复制记录ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除记录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 主内容区 ─────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* ── 左侧：记录内容 ─────────────────────── */}
          <div className="flex-1 p-4 lg:p-6">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setError("")}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 标签页 */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "history") loadHistory(); }}>
              <TabsList className={cn("mb-4", mounted ? "animate-fade-up" : "opacity-0")}>
                <TabsTrigger value="details" className="gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  详情
                </TabsTrigger>
                {detailFields.length > 0 && (
                  <TabsTrigger value="attachments" className="gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    附件/备注
                  </TabsTrigger>
                )}
                <TabsTrigger value="history" className="gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  修改历史
                </TabsTrigger>
              </TabsList>

              {/* ── 详情标签页 ─────────────────────── */}
              <TabsContent value="details">
                <Card className={cn(mounted ? "animate-fade-up" : "opacity-0")} style={{ animationDelay: "100ms" }}>
                  {isEditing ? (
                    /* ── 编辑模式 ─────────────────── */
                    <div className="divide-y divide-border">
                      {fields.map((field, idx) => {
                        const name = (field.field || field.name || "") as string;
                        const label = (field.fieldLabel || field.label || name) as string;
                        const type = (field.displayType || field.type || "TEXT") as string;
                        if (field.updatable === false) return null;
                        return (
                          <div key={idx} className="flex items-start px-6 py-4 gap-4">
                            <div className="w-40 shrink-0 pt-2">
                              <label className="text-sm font-medium text-muted-foreground">
                                {label}
                                {field.nullable === false && <span className="text-destructive ml-0.5">*</span>}
                              </label>
                            </div>
                            <div className="flex-1">
                              {type === "TEXTAREA" || type === "NTEXT" ? (
                                <textarea
                                  value={(editData[name] as string) || ""}
                                  onChange={(e) => setEditData((prev) => ({ ...prev, [name]: e.target.value }))}
                                  className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                  rows={3}
                                />
                              ) : type === "BOOL" ? (
                                <select
                                  value={String(editData[name] ?? "")}
                                  onChange={(e) => setEditData((prev) => ({ ...prev, [name]: e.target.value === "true" }))}
                                  className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value="">请选择</option>
                                  <option value="true">是</option>
                                  <option value="false">否</option>
                                </select>
                              ) : type === "DATE" || type === "DATETIME" ? (
                                <Input
                                  type={type === "DATETIME" ? "datetime-local" : "date"}
                                  value={(editData[name] as string) || ""}
                                  onChange={(e) => setEditData((prev) => ({ ...prev, [name]: e.target.value }))}
                                />
                              ) : (
                                <Input
                                  value={
                                    typeof editData[name] === "object"
                                      ? JSON.stringify(editData[name])
                                      : String(editData[name] ?? "")
                                  }
                                  onChange={(e) => setEditData((prev) => ({ ...prev, [name]: e.target.value }))}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── 查看模式 ─────────────────── */
                    <div className="divide-y divide-border">
                      {basicFields.map((field, idx) => {
                        const label = (field.fieldLabel || field.label || field.field || "") as string;
                        return (
                          <div
                            key={idx}
                            className="flex items-start px-6 py-3.5 hover:bg-muted/30 transition-colors group"
                          >
                            <div className="w-40 shrink-0 pt-0.5">
                              <span className="text-sm font-medium text-muted-foreground">{label}</span>
                            </div>
                            <div className="flex-1 text-sm text-foreground">
                              {getFieldValue(record, field)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ── 附件/备注标签页 ─────────────────── */}
              {detailFields.length > 0 && (
                <TabsContent value="attachments">
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      {detailFields.map((field, idx) => {
                        const label = (field.fieldLabel || field.label || field.field || "") as string;
                        return (
                          <div key={idx}>
                            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              {label}
                            </h4>
                            <div className="text-sm text-muted-foreground pl-6">
                              {getFieldValue(record, field)}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ── 修改历史标签页 ─────────────────── */}
              <TabsContent value="history">
                <Card>
                  {loadingHistory ? (
                    <CardContent className="p-6 space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  ) : history.length === 0 ? (
                    <CardContent className="p-8">
                      <EmptyState
                        icon={<History className="w-8 h-8" />}
                        title="暂无修改记录"
                        description="该记录尚未产生修改历史"
                      />
                    </CardContent>
                  ) : (
                    <div className="divide-y divide-border">
                      {history.map((item, idx) => (
                        <div key={idx} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8 mt-0.5">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getUserInitials(item.operator || item.createdBy)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {getUserDisplay(item.operator || item.createdBy)}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(
                                    (item.modificationTime || item.createdOn || "") as string
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(item.content || item.summary || JSON.stringify(item)) as string}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── 右侧：信息面板 ─────────────────────── */}
          <div className={cn(
            "w-72 border-l bg-card p-4 flex-shrink-0 hidden lg:block space-y-6",
            mounted ? "animate-slide-in-right" : "opacity-0"
          )}>
            {/* 操作按钮 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">操作</h4>
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  分配
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  共享
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  打印
                </Button>
                <Separator className="my-2" />
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </Button>
              </div>
            </div>

            <Separator />

            {/* 用户信息 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                用户信息
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">所属用户</span>
                  <span className="text-sm font-medium">
                    {getUserDisplay(record.owningUser || record.createdBy)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">所属部门</span>
                  <span className="text-sm font-medium">
                    {getUserDisplay(record.owningDepartment || record.dept)}
                  </span>
                </div>
                {!!record.sharedTo && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">共享给</span>
                    <span className="text-sm font-medium">
                      {getUserDisplay(record.sharedTo)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 时间信息 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                时间信息
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">创建时间</span>
                  <span className="text-xs">
                    {formatRelativeTime((record.createdOn || record.createdTime || "") as string)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">修改时间</span>
                  <span className="text-xs">
                    {formatRelativeTime((record.modifiedOn || record.modifiedTime || "") as string)}
                  </span>
                </div>
                {!!record.createdBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">创建人</span>
                    <span className="text-xs font-medium">{getUserDisplay(record.createdBy)}</span>
                  </div>
                )}
                {!!record.modifiedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">修改人</span>
                    <span className="text-xs font-medium">{getUserDisplay(record.modifiedBy)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 记录ID */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                记录信息
              </h4>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <code className="text-xs text-muted-foreground font-mono break-all flex-1">{recordId}</code>
                <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 删除确认弹窗 ─────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              确认删除
            </DialogTitle>
            <DialogDescription>
              确定要删除这条记录吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 分配弹窗 ─────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        if (!open) setAssignUserId("");
        setShowAssignDialog(open);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              分配记录
            </DialogTitle>
            <DialogDescription>将此记录分配给指定用户</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">用户ID</label>
            <Input
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              placeholder="请输入用户ID"
              onKeyDown={(e) => e.key === "Enter" && handleAssign()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>取消</Button>
            <Button onClick={handleAssign} disabled={!assignUserId.trim()}>确认分配</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
