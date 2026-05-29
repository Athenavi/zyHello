"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  ArrowUpDown,
  LayoutGrid,
  List,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Circle,
  MessageSquare,
  Clock,
  User,
  Tag,
  Zap,
  FileText,
  Calendar,
  ChevronRight,
  Send,
  FolderKanban,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Types ─────────────────────────────────────────────────────── */
interface ProjectPlan {
  plan_id: string;
  plan_name: string;
  flow_status?: number;
  flow_nexts?: string[];
}

interface ProjectTask {
  task_id: string;
  task_name: string;
  task_number?: number;
  status: number;
  priority?: number;
  seq?: number;
  deadline?: string;
  end_time?: string;
  modified_on?: string;
  created_on?: string;
  description?: string;
  executor?: [string, string];
  created_by?: string;
  plan_name?: string;
  project_plan_id?: string;
  tags?: { rid: string; name: string; color: string }[];
  attachments?: unknown;
  comments?: number;
}

type ViewMode = "kanban" | "list";
type SortMode = "seq" | "deadline" | "modified_on";

/* ── Priority colors ───────────────────────────────────────────── */
const PRIORITY_MAP: Record<
  number,
  { label: string; color: string; bg: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" }
> = {
  0: { label: "较低", color: "text-muted-foreground", bg: "bg-muted", variant: "secondary" },
  1: { label: "普通", color: "text-info", bg: "bg-info/10", variant: "default" },
  2: { label: "紧急", color: "text-warning", bg: "bg-warning/10", variant: "warning" },
  3: { label: "非常紧急", color: "text-destructive", bg: "bg-destructive/10", variant: "destructive" },
};

const SORT_OPTIONS = [
  { key: "seq" as SortMode, label: "手动排序", icon: ArrowUpDown },
  { key: "deadline" as SortMode, label: "最近到期", icon: Clock },
  { key: "modified_on" as SortMode, label: "最近修改", icon: Calendar },
];

/* ── Helper ────────────────────────────────────────────────────── */
function getDeadlineState(deadline?: string, isDone?: boolean): { state: number; label: string; variant: "default" | "destructive" | "warning" | "info" | "success" | "secondary" | "outline" } {
  if (isDone || !deadline) return { state: -1, label: "", variant: "default" };
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  if (dl < now) return { state: 2, label: "已逾期", variant: "destructive" };
  if (dl < now + 3 * 24 * 60 * 60 * 1000) return { state: 1, label: "即将到期", variant: "warning" };
  return { state: 0, label: deadline.slice(0, 10), variant: "info" };
}

function getUserInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    api
      .listProjects()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setProjects(list);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (selectedProject) {
    return (
      <ProjectBoard
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className={cn("space-y-6 p-4 lg:p-6", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">项目</h1>
          <p className="text-muted-foreground mt-1">管理项目计划和任务</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-12 h-12" />}
          title="暂无项目"
          description="还没有创建任何项目"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, idx) => (
            <Card
              key={idx}
              hover
              className={cn(
                "group cursor-pointer overflow-hidden",
                mounted ? "animate-fade-up" : "opacity-0"
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
              onClick={() => setSelectedProject(p)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {(p.project_name || p.name || "未命名") as string}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {!!(p.description || p.comments) && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {String(p.description || p.comments || "") as string}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {!!p.status && (
                    <Badge variant="info" className="text-xs">
                      {String(p.status || "进行中") as string}
                    </Badge>
                  )}
                  {!!p.members && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {String(p.members) as string} 位成员
                    </span>
                  )}
                  {!!p.created_on && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {String(p.created_on) as string}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Project Board (Kanban + List) ─────────────────────────────── */
function ProjectBoard({
  project,
  onBack,
}: {
  project: Record<string, unknown>;
  onBack: () => void;
}) {
  const projectId = String(project.config_id || project.id || "");
  const projectName = String(project.project_name || project.name || "未命名");
  const plans = (project.plans || []) as ProjectPlan[];

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sortMode, setSortMode] = useState<SortMode>("seq");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = () => setSearch(searchInput);
  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)]", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 lg:px-6 py-4 bg-background border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回项目列表</TooltipContent>
            </Tooltip>
            <h2 className="text-lg font-semibold">{projectName}</h2>
            {project.scope === 1 && (
              <Badge variant="secondary" className="text-xs">公开</Badge>
            )}
            {project.status === 2 && (
              <Badge variant="secondary" className="text-xs">已归档</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜索标题和 ID"
                className="w-48 pl-9 pr-8 h-9"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="w-4 h-4" />
                  排序
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>排序方式</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORT_OPTIONS.map((s) => (
                  <DropdownMenuItem
                    key={s.key}
                    onClick={() => setSortMode(s.key)}
                    className={cn("gap-2", sortMode === s.key && "text-primary font-medium")}
                  >
                    <s.icon className="w-4 h-4" />
                    {sortMode === s.key && "✓ "}{s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode("kanban")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>看板视图</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>列表视图</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "kanban" ? (
          <KanbanView
            projectId={projectId}
            plans={plans}
            sortMode={sortMode}
            search={search}
            onSelectTask={setSelectedTask}
            showCreateTask={showCreateTask}
            setShowCreateTask={setShowCreateTask}
          />
        ) : (
          <ListView
            projectId={projectId}
            plans={plans}
            sortMode={sortMode}
            search={search}
            onSelectTask={setSelectedTask}
          />
        )}
      </div>

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetailDialog
          taskId={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

/* ── Kanban View ───────────────────────────────────────────────── */
function KanbanView({
  projectId,
  plans,
  sortMode,
  search,
  onSelectTask,
  showCreateTask,
  setShowCreateTask,
}: {
  projectId: string;
  plans: ProjectPlan[];
  sortMode: SortMode;
  search: string;
  onSelectTask: (id: string) => void;
  showCreateTask: string | null;
  setShowCreateTask: (id: string | null) => void;
}) {
  if (plans.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title="暂无任务面板"
          description="该项目还没有创建任何计划面板"
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex gap-4 p-4 lg:p-6 h-full">
        {plans.map((plan) => (
          <PlanColumn
            key={plan.plan_id}
            plan={plan}
            projectId={projectId}
            sortMode={sortMode}
            search={search}
            onSelectTask={onSelectTask}
            showCreateTask={showCreateTask === plan.plan_id}
            onToggleCreate={() =>
              setShowCreateTask(
                showCreateTask === plan.plan_id ? null : plan.plan_id
              )
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/* ── Plan Column ───────────────────────────────────────────────── */
function PlanColumn({
  plan,
  projectId,
  sortMode,
  search,
  onSelectTask,
  showCreateTask,
  onToggleCreate,
}: {
  plan: ProjectPlan;
  projectId: string;
  sortMode: SortMode;
  search: string;
  onSelectTask: (id: string) => void;
  showCreateTask: boolean;
  onToggleCreate: () => void;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getProjectTasks(
        projectId,
        plan.plan_id,
        sortMode,
        search
      );
      const data = res?.data || res;
      setTasks(data?.tasks || (Array.isArray(data) ? data : []));
      if (data?.count !== undefined) setTaskCount(data.count);
      else setTaskCount((data?.tasks || []).length);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, plan.plan_id, sortMode, search]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const canCreate =
    (plan.flow_status === 1 || plan.flow_status === 3) &&
    plan.plan_id?.startsWith("051-");

  return (
    <div className="flex-shrink-0 w-80 bg-muted/30 rounded-xl flex flex-col max-h-full border">
      {/* Plan header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{plan.plan_name}</h4>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {taskCount}
          </Badge>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无任务
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.task_id}
                task={task}
                onClick={() => onSelectTask(task.task_id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create task */}
      {canCreate && (
        <div className="p-2 border-t">
          {showCreateTask ? (
            <CreateTaskForm
              projectId={projectId}
              planId={plan.plan_id}
              onCreated={() => {
                fetchTasks();
                onToggleCreate();
              }}
              onCancel={onToggleCreate}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground"
              onClick={onToggleCreate}
            >
              <Plus className="w-4 h-4" />
              添加任务
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Task Card ─────────────────────────────────────────────────── */
function TaskCard({
  task,
  onClick,
}: {
  task: ProjectTask;
  onClick: () => void;
}) {
  const isDone = task.status === 1;
  const priority = PRIORITY_MAP[task.priority ?? 1];
  const deadlineInfo = getDeadlineState(task.deadline, isDone);

  return (
    <Card
      hover
      className={cn(
        "cursor-pointer group",
        isDone && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Status indicator */}
          <div
            className={cn(
              "mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
              isDone
                ? "border-success bg-success text-white"
                : "border-muted-foreground/30"
            )}
          >
            {isDone && <CheckCircle2 className="w-3 h-3" />}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                isDone ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {task.task_name}
            </p>

            {/* Deadline badge */}
            {deadlineInfo.state > -1 && (
              <Badge
                variant={deadlineInfo.variant}
                className="mt-1 text-xs h-5"
              >
                <Clock className="w-3 h-3 mr-0.5" />
                {deadlineInfo.label}
              </Badge>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag.rid}
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pl-7">
          <div className="flex items-center gap-1">
            {task.executor && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary/70 to-primary">
                      {getUserInitials(task.executor[1])}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>执行人: {task.executor[1]}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.description && (
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {task.task_number && (
              <span className="text-xs text-muted-foreground">
                #{task.task_number}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Create Task Form ──────────────────────────────────────────── */
function CreateTaskForm({
  projectId,
  planId,
  onCreated,
  onCancel,
}: {
  projectId: string;
  planId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [taskName, setTaskName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!taskName.trim()) return;
    setSubmitting(true);
    try {
      await api.saveProjectTask({
        task_name: taskName.trim(),
        deadline: deadline ? deadline + ":00" : undefined,
        project_id: projectId,
        project_plan_id: planId,
        task_number: 0,
        metadata: { entity: "ProjectTask" },
      });
      setTaskName("");
      setDeadline("");
      toast.success("任务已创建");
      onCreated();
    } catch {
      toast.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <textarea
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="输入标题以新建任务"
          className="w-full px-2 py-1.5 text-sm bg-transparent border rounded focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
          rows={2}
          maxLength={190}
          autoFocus
        />
        <Input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-8 text-xs"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!taskName.trim() || submitting}
            loading={submitting}
          >
            确定
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── List View ─────────────────────────────────────────────────── */
function ListView({
  projectId,
  plans,
  sortMode,
  search,
  onSelectTask,
}: {
  projectId: string;
  plans: ProjectPlan[];
  sortMode: SortMode;
  search: string;
  onSelectTask: (id: string) => void;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          plans.map((p) =>
            api.getProjectTasks(projectId, p.plan_id, sortMode, search)
          )
        );
        const allTasks: ProjectTask[] = [];
        results.forEach((res) => {
          const data = res?.data || res;
          const t = data?.tasks || (Array.isArray(data) ? data : []);
          allTasks.push(...t);
        });
        setTasks(allTasks);
        setTaskCount(allTasks.length);
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    if (plans.length > 0) fetchAll();
    else {
      setTasks([]);
      setLoading(false);
    }
  }, [projectId, plans, sortMode, search]);

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-10">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  标题
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-32 hidden md:table-cell">
                  时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-24 hidden lg:table-cell">
                  面板
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-20 hidden md:table-cell">
                  用户
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">
                      <Skeleton className="w-5 h-5 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="w-6 h-6 rounded-full" />
                    </td>
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<FolderKanban className="w-10 h-10" />}
                      title="暂无任务"
                      description="还没有创建任何任务"
                    />
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => {
                  const isDone = task.status === 1;
                  const deadlineInfo = getDeadlineState(task.deadline, isDone);

                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectTask(task.task_id)}
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer transition-colors",
                        isDone && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            isDone
                              ? "border-success bg-success text-white"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isDone && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          {task.task_number ? `#${task.task_number} ` : ""}
                          {task.task_name}
                        </p>
                        {deadlineInfo.state > -1 && (
                          <Badge
                            variant={deadlineInfo.variant}
                            className="mt-0.5 text-xs h-4"
                          >
                            {deadlineInfo.label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell space-y-0.5">
                        {task.end_time && (
                          <div>完成: {task.end_time.slice(0, 16)}</div>
                        )}
                        {task.modified_on && (
                          <div>更新: {task.modified_on.slice(0, 16)}</div>
                        )}
                        {task.created_on && (
                          <div>创建: {task.created_on.slice(0, 16)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {task.plan_name || "-"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {task.executor && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/70 to-primary">
                                  {getUserInitials(task.executor[1])}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              {task.executor[1]}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-3 text-sm text-muted-foreground text-right">
        共 {taskCount} 个任务
      </div>
    </div>
  );
}

/* ── Task Detail Dialog ────────────────────────────────────────── */
function TaskDetailDialog({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await api.getProjectTaskDetail(taskId);
      const data = res?.data || res;
      setTask(data as ProjectTask);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleSaveField = async (field: string, value: unknown) => {
    try {
      await api.saveProjectTask({
        [field]: value,
        task_id: taskId,
      });
      setEditingField(null);
      toast.success("已保存");
      fetchTask();
    } catch {
      toast.error("保存失败");
    }
  };

  const handleToggleStatus = async () => {
    if (!task) return;
    await handleSaveField("status", task.status === 1 ? 0 : 1);
  };

  const handleDelete = async () => {
    try {
      await api.deleteProjectTask(taskId);
      toast.success("任务已删除");
      onClose();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.addProjectTaskComment(taskId, commentText.trim());
      setCommentText("");
      toast.success("评论已添加");
      fetchTask();
    } catch {
      toast.error("评论失败");
    } finally {
      setSubmittingComment(false);
    }
  };

  const startEdit = (field: string, currentValue: unknown) => {
    setEditingField(field);
    setEditValue(String(currentValue || ""));
  };

  const isDone = task?.status === 1;
  const priority = PRIORITY_MAP[task?.priority ?? 1];

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              任务详情
              {task?.task_number && (
                <span className="text-sm text-muted-foreground font-normal">
                  #{task.task_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] -mx-6 px-6">
            {loading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !task ? (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="加载失败"
                description="无法获取任务详情"
              />
            ) : (
              <div className="space-y-5 py-2">
                {/* Task name */}
                <div>
                  {editingField === "task_name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveField("task_name", editValue)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.target as HTMLInputElement).blur()
                      }
                      className="text-lg font-semibold"
                      autoFocus
                    />
                  ) : (
                    <h4
                      className="text-lg font-semibold hover:text-primary cursor-pointer transition-colors"
                      onClick={() => startEdit("task_name", task.task_name)}
                    >
                      {task.task_name}
                    </h4>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-20 flex-shrink-0 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    状态
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleStatus}
                    className={cn(
                      "gap-2 rounded-full",
                      isDone
                        ? "text-success border-success/30 bg-success/10"
                        : ""
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    {isDone ? "已完成" : "未完成"}
                  </Button>
                </div>

                {/* Executor */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-20 flex-shrink-0 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    执行人
                  </label>
                  {task.executor ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary/70 to-primary">
                          {getUserInitials(task.executor[1])}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.executor[1]}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      未指派
                    </span>
                  )}
                </div>

                {/* Deadline */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-20 flex-shrink-0 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    到期时间
                  </label>
                  {editingField === "deadline" ? (
                    <Input
                      type="datetime-local"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() =>
                        handleSaveField(
                          "deadline",
                          editValue ? editValue + ":00" : ""
                        )
                      }
                      className="w-auto h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-sm hover:text-primary cursor-pointer transition-colors"
                      onClick={() =>
                        startEdit(
                          "deadline",
                          task.deadline?.slice(0, 16) || ""
                        )
                      }
                    >
                      {task.deadline
                        ? task.deadline.slice(0, 16).replace("T", " ")
                        : "点击设置"}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-20 flex-shrink-0 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    优先级
                  </label>
                  <div className="flex gap-2">
                    {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                      <Button
                        key={key}
                        variant={
                          task.priority === Number(key)
                            ? val.variant
                            : "outline"
                        }
                        size="sm"
                        className="rounded-full text-xs h-7"
                        onClick={() =>
                          handleSaveField("priority", Number(key))
                        }
                      >
                        {val.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    详情
                  </label>
                  {editingField === "description" ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() =>
                        handleSaveField("description", editValue)
                      }
                      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-transparent"
                      rows={4}
                      autoFocus
                    />
                  ) : (
                    <div
                      className="text-sm bg-muted/50 rounded-lg p-3 min-h-[60px] cursor-pointer hover:bg-muted transition-colors whitespace-pre-wrap"
                      onClick={() =>
                        startEdit("description", task.description || "")
                      }
                    >
                      {task.description || "点击添加详情..."}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      标签
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.rid}
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: tag.color + "20",
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {task.created_by && (
                    <div>
                      创建人:{" "}
                      <span className="text-foreground">
                        {task.created_by}
                      </span>
                    </div>
                  )}
                  {task.created_on && (
                    <div>
                      创建时间:{" "}
                      <span className="text-foreground">
                        {task.created_on.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  )}
                  {task.modified_on && (
                    <div>
                      更新时间:{" "}
                      <span className="text-foreground">
                        {task.modified_on.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  )}
                  {task.end_time && (
                    <div>
                      完成时间:{" "}
                      <span className="text-foreground">
                        {task.end_time.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <label className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    评论 {task.comments ? `(${task.comments})` : ""}
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="输入评论..."
                      className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-transparent"
                      rows={2}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || submittingComment}
                      loading={submittingComment}
                      size="sm"
                      className="self-end gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      发送
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Actions footer */}
          {!loading && task && (
            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  删除任务
                </Button>
                <Button variant="outline" size="sm" onClick={onClose}>
                  关闭
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确认删除此任务？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
