"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell, CheckCircle, Clock, MessageSquare, ClipboardList, ShieldCheck,
  Trash2, MoreVertical, Check, Filter, RefreshCw, ExternalLink,
  Archive, Settings2, BellOff, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ── 类型定义 ─────────────────────────────────────────── */
interface Notification {
  [key: string]: unknown;
}

interface TodoItem {
  [key: string]: unknown;
}

/* ── 主页面组件 ───────────────────────────────────────── */
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("messages");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [approvals, setApprovals] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listNotifications(1);
      const data = (res as Record<string, unknown>)?.data ?? res;
      const items = Array.isArray(data) ? data : ((data as Record<string, unknown>).data || []) as Notification[];
      setNotifications(items as Notification[]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/app/todo/list?page=1");
      const data = (res as Record<string, unknown>)?.data ?? res;
      const items = Array.isArray(data) ? data : ((data as Record<string, unknown>).data || []) as TodoItem[];
      setTodos(items as TodoItem[]);
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listApprovals();
      const data = (res as Record<string, unknown>)?.data ?? res;
      const items = Array.isArray(data) ? data : ((data as Record<string, unknown>).data || []) as TodoItem[];
      setApprovals(items as TodoItem[]);
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "messages") fetchNotifications();
    else if (activeTab === "todo") fetchTodos();
    else if (activeTab === "approval") fetchApprovals();
  }, [activeTab, fetchNotifications, fetchTodos, fetchApprovals]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      toast.success("已全部标记为已读");
      fetchNotifications();
    } catch { toast.error("操作失败"); }
  };

  const handleMakeRead = async (ids: string[]) => {
    try {
      await api.makeRead(ids);
      setSelectedIds(new Set());
      fetchNotifications();
    } catch { toast.error("操作失败"); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getUserInitials = (name: unknown): string => {
    const str = typeof name === "string" ? name : typeof name === "object" ? ((name as Record<string, unknown>).name || (name as Record<string, unknown>).fullName || "") as string : "";
    return str ? str.slice(0, 2) : "??";
  };

  const tabs = [
    { key: "messages", label: "消息", icon: MessageSquare, count: notifications.length },
    { key: "todo", label: "待办", icon: ClipboardList, count: todos.length },
    { key: "approval", label: "审批", icon: ShieldCheck, count: approvals.length },
  ];

  return (
    <div className={cn("space-y-6 p-4 lg:p-6", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* ── 页面头部 ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6" />
            消息中心
          </h1>
          <p className="text-muted-foreground mt-1">查看通知、待办事项和审批流程</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => {
                if (activeTab === "messages") fetchNotifications();
                else if (activeTab === "todo") fetchTodos();
                else fetchApprovals();
              }}>
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新</TooltipContent>
          </Tooltip>
          {activeTab === "messages" && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="w-4 h-4 mr-1" />
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* ── 标签页 ─────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── 消息列表 ─────────────────────────── */}
        <TabsContent value="messages">
          <Card>
            {loading ? (
              <CardContent className="p-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border-b last:border-0">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : notifications.length === 0 ? (
              <CardContent className="p-8">
                <EmptyState
                  icon={<BellOff className="w-10 h-10" />}
                  title="暂无消息"
                  description="当有新消息时会在这里显示"
                />
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((item, idx) => {
                  const id = (item.id || item.messageId || idx) as string;
                  const isRead = item.read === true || item.isRead === true;
                  const message = (item.message || item.content || item.title || "") as string;
                  const type = item.type as string | undefined;
                  const createdOn = (item.createdOn || item.createdTime || "") as string;
                  const relatedUrl = (item.relatedUrl || item.url || "") as string;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group",
                        !isRead && "bg-primary/5"
                      )}
                      onClick={() => relatedUrl && router.push(relatedUrl)}
                    >
                      <Checkbox
                        checked={selectedIds.has(String(id))}
                        onCheckedChange={() => toggleSelect(String(id))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                        type === "approval" ? "bg-success/10 text-success" :
                        type === "todo" ? "bg-warning/10 text-warning" :
                        "bg-primary/10 text-primary"
                      )}>
                        {type === "approval" ? <CheckCircle className="w-4 h-4" /> :
                         type === "todo" ? <ClipboardList className="w-4 h-4" /> :
                         <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !isRead ? "font-medium" : "text-muted-foreground")}>
                          {message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(createdOn)}
                          </span>
                          {!isRead && <Badge variant="info" className="h-4 text-[10px] px-1">新</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.success("已标记为已读")}>
                            <Check className="w-4 h-4 mr-2" />
                            标记已读
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="w-4 h-4 mr-2" />
                            归档
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── 待办列表 ─────────────────────────── */}
        <TabsContent value="todo">
          <Card>
            {loading ? (
              <CardContent className="p-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border-b last:border-0">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : todos.length === 0 ? (
              <CardContent className="p-8">
                <EmptyState
                  icon={<CheckCircle className="w-10 h-10" />}
                  title="暂无待办"
                  description="所有待办事项已完成"
                />
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {todos.map((item, idx) => {
                  const title = (item.title || item.taskName || item.name || "") as string;
                  const status = item.status as number;
                  const deadline = (item.deadline || item.dueDate || "") as string;
                  const priority = item.priority as number | undefined;
                  const entity = (item.entity || "") as string;
                  const recordId = (item.recordId || item.record_id || "") as string;
                  return (
                    <div key={idx} className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                      <Checkbox checked={status === 1} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", status === 1 ? "line-through text-muted-foreground" : "font-medium")}>
                          {title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {deadline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {deadline}
                            </span>
                          )}
                          {priority !== undefined && priority >= 2 && (
                            <Badge variant="warning" className="text-xs">紧急</Badge>
                          )}
                        </div>
                      </div>
                      {entity && recordId && (
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/entities/${entity}/${recordId}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── 审批列表 ─────────────────────────── */}
        <TabsContent value="approval">
          <Card>
            {loading ? (
              <CardContent className="p-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border-b last:border-0">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded" />
                  </div>
                ))}
              </CardContent>
            ) : approvals.length === 0 ? (
              <CardContent className="p-8">
                <EmptyState
                  icon={<ShieldCheck className="w-10 h-10" />}
                  title="暂无审批"
                  description="没有待审批的流程"
                />
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {approvals.map((item, idx) => {
                  const name = (item.name || item.title || item.approvalName || "") as string;
                  const state = (item.state || item.status || 0) as number;
                  const stateLabel = state === 0 ? "待审批" : state === 1 ? "已通过" : state === 2 ? "已驳回" : "已撤回";
                  const stateVariant = state === 0 ? "warning" : state === 1 ? "success" : state === 2 ? "destructive" : "secondary";
                  const entity = (item.entity || "") as string;
                  const recordId = (item.recordId || item.record_id || "") as string;
                  const approver = (item.approver || item.nextApprover || "") as string;
                  return (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={stateVariant as any} className="text-xs">{stateLabel}</Badge>
                          {approver && (
                            <span className="text-xs text-muted-foreground">审批人: {approver}</span>
                          )}
                        </div>
                      </div>
                      {entity && recordId && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/entities/${entity}/${recordId}`}>
                            查看
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
