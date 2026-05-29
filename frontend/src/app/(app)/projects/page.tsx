"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────── */
interface ProjectPlan {
  id: string;
  planName: string;
  flowStatus?: number;
  flowNexts?: string[];
}

interface ProjectTask {
  id: string;
  taskName: string;
  taskNumber?: number;
  status: number;
  priority?: number;
  seq?: number;
  deadline?: string;
  endTime?: string;
  modifiedOn?: string;
  createdOn?: string;
  description?: string;
  executor?: [string, string];
  createdBy?: [string, string];
  planName?: string;
  projectPlanId?: string;
  tags?: { rid: string; name: string; color: string }[];
  attachments?: unknown;
  comments?: number;
}

type ViewMode = "kanban" | "list";
type SortMode = "seq" | "deadline" | "modifiedOn";
type GroupMode = "plan" | "priority" | "deadline";

/* ── Priority colors ───────────────────────────────────────────── */
const PRIORITY_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "较低", color: "text-gray-500", bg: "bg-gray-100" },
  1: { label: "普通", color: "text-blue-600", bg: "bg-blue-50" },
  2: { label: "紧急", color: "text-orange-600", bg: "bg-orange-50" },
  3: { label: "非常紧急", color: "text-red-600", bg: "bg-red-50" },
};

/* ── Main Page ─────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">项目</h1>
        <p className="text-gray-500 mt-1">管理项目计划和任务</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📁</p>
          <p>暂无项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedProject(p)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {(p.projectName || p.name || "未命名") as string}
                </h3>
                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                  进入 →
                </span>
              </div>
              {(p.description || p.comments) && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {String(p.description || p.comments || "")}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                {p.status && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {(p.status || "进行中") as string}
                  </span>
                )}
                {p.members && <span>👥 {String(p.members)} 位成员</span>}
                {p.createdOn && <span>📅 {String(p.createdOn)}</span>}
              </div>
            </div>
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
  const projectId = String(project.id || project.projectId || "");
  const projectName = String(project.projectName || project.name || "未命名");
  const plans = (project.projectPlans || project.plans || []) as ProjectPlan[];

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sortMode, setSortMode] = useState<SortMode>("seq");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);

  const handleSearch = () => setSearch(searchInput);
  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800">{projectName}</h2>
            {(project.scope === 1 || project.isPublic) && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">公开</span>
            )}
            {(project.status === 2 || project.archived) && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">已归档</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜索标题和 ID"
                className="w-48 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowSortMenu(!showSortMenu); setShowViewMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m0 0v8m0-8l-3 3m3-3l3 3" />
                </svg>
                排序
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border z-50">
                  <div className="px-3 py-1.5 text-xs text-gray-400 border-b">排序</div>
                  {([
                    { key: "seq", label: "手动排序" },
                    { key: "deadline", label: "最近到期" },
                    { key: "modifiedOn", label: "最近修改" },
                  ] as const).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => { setSortMode(s.key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortMode === s.key ? "text-blue-600 font-medium" : "text-gray-700"}`}
                    >
                      {sortMode === s.key && "✓ "}{s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View mode dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowViewMenu(!showViewMenu); setShowSortMenu(false); }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {viewMode === "kanban" ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                  </svg>
                )}
                {viewMode === "kanban" ? "看板" : "列表"}
              </button>
              {showViewMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-50">
                  <button
                    onClick={() => { setViewMode("kanban"); setShowViewMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${viewMode === "kanban" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                    </svg>
                    看板视图
                  </button>
                  <button
                    onClick={() => { setViewMode("list"); setShowViewMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${viewMode === "list" ? "text-blue-600 font-medium" : "text-gray-700"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    列表视图
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" onClick={() => { setShowSortMenu(false); setShowViewMenu(false); }}>
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

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
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
  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {plans.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p>暂无任务面板</p>
        </div>
      ) : (
        plans.map((plan) => (
          <PlanColumn
            key={plan.id}
            plan={plan}
            projectId={projectId}
            sortMode={sortMode}
            search={search}
            onSelectTask={onSelectTask}
            showCreateTask={showCreateTask === plan.id}
            onToggleCreate={() => setShowCreateTask(showCreateTask === plan.id ? null : plan.id)}
          />
        ))
      )}
    </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getProjectTasks(projectId, plan.id, sortMode, search);
      const data = res?.data || res;
      setTasks(data?.tasks || (Array.isArray(data) ? data : []));
      if (data?.count !== undefined) setTaskCount(data.count);
      else setTaskCount((data?.tasks || []).length);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, plan.id, sortMode, search]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const canCreate = (plan.flowStatus === 1 || plan.flowStatus === 3) && plan.id?.startsWith("051-");

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-xl flex flex-col max-h-full">
      {/* Plan header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h4 className="font-medium text-gray-700 text-sm">
          {plan.planName}
          <span className="ml-1.5 text-xs text-gray-400">· {taskCount}</span>
        </h4>
      </div>

      {/* Task list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无任务</div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
          ))
        )}
      </div>

      {/* Create task */}
      {canCreate && (
        <div className="p-2 border-t border-gray-200">
          {showCreateTask ? (
            <CreateTaskForm
              projectId={projectId}
              planId={plan.id}
              onCreated={() => { fetchTasks(); onToggleCreate(); }}
              onCancel={onToggleCreate}
            />
          ) : (
            <button
              onClick={onToggleCreate}
              className="w-full py-2 text-sm text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加任务
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Task Card ─────────────────────────────────────────────────── */
function TaskCard({ task, onClick }: { task: ProjectTask; onClick: () => void }) {
  const isDone = task.status === 1;
  const priority = PRIORITY_MAP[task.priority ?? 1];

  // Deadline state
  let deadlineState = -1;
  if (!isDone && task.deadline) {
    const now = Date.now();
    const dl = new Date(task.deadline).getTime();
    if (dl < now) deadlineState = 2; // overdue
    else if (dl < now + 3 * 24 * 60 * 60 * 1000) deadlineState = 1; // soon
    else deadlineState = 0; // ok
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border hover:shadow-md transition-all cursor-pointer group ${isDone ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isDone ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
          {isDone && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-800 ${isDone ? "line-through" : ""}`}>
            {task.taskName}
          </p>

          {/* Deadline badge */}
          {deadlineState > -1 && (
            <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${deadlineState === 2 ? "bg-red-50 text-red-600" : deadlineState === 1 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
              到期 {task.deadline?.slice(0, 10)}
            </span>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag.rid}
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pl-6">
        <div className="flex items-center gap-1">
          {task.executor && (
            <div
              className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-medium"
              title={`执行人: ${task.executor[1]}`}
            >
              {task.executor[1]?.[0]}
            </div>
          )}
          {task.createdBy && task.createdBy[0] !== task.executor?.[0] && (
            <div
              className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[9px] font-medium"
              title={`创建人: ${task.createdBy[1]}`}
            >
              {task.createdBy[1]?.[0]}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.description && (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          )}
          {task.taskNumber && (
            <span className="text-xs text-gray-400">#{task.taskNumber}</span>
          )}
        </div>
      </div>
    </div>
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
        taskName: taskName.trim(),
        deadline: deadline ? deadline + ":00" : undefined,
        projectId,
        projectPlanId: planId,
        taskNumber: 0,
        metadata: { entity: "ProjectTask" },
      });
      setTaskName("");
      setDeadline("");
      onCreated();
    } catch {
      // error handled silently
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border space-y-2">
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
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        rows={2}
        maxLength={190}
        autoFocus
      />
      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={!taskName.trim() || submitting}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "创建中..." : "确定"}
        </button>
      </div>
    </div>
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
          plans.map((p) => api.getProjectTasks(projectId, p.id, sortMode, search))
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
    else { setTasks([]); setLoading(false); }
  }, [projectId, plans, sortMode, search]);

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 hidden md:table-cell">时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24 hidden lg:table-cell">面板</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20 hidden md:table-cell">用户</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无任务</td>
              </tr>
            ) : (
              tasks.map((task, idx) => {
                const isDone = task.status === 1;
                let deadlineState = -1;
                if (!isDone && task.deadline) {
                  const now = Date.now();
                  const dl = new Date(task.deadline).getTime();
                  if (dl < now) deadlineState = 2;
                  else if (dl < now + 3 * 24 * 60 * 60 * 1000) deadlineState = 1;
                  else deadlineState = 0;
                }

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectTask(task.id)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isDone ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDone ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                        {isDone && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-medium text-gray-800 ${isDone ? "line-through" : ""}`}>
                        {task.taskNumber ? `#${task.taskNumber} ` : ""}{task.taskName}
                      </p>
                      {deadlineState > -1 && (
                        <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded ${deadlineState === 2 ? "bg-red-50 text-red-600" : deadlineState === 1 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                          到期 {task.deadline?.slice(0, 10)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {task.endTime && <div>完成: {task.endTime.slice(0, 16)}</div>}
                      {task.modifiedOn && <div>更新: {task.modifiedOn.slice(0, 16)}</div>}
                      {task.createdOn && <div>创建: {task.createdOn.slice(0, 16)}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{task.planName || "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        {task.executor && (
                          <div
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-medium"
                            title={task.executor[1]}
                          >
                            {task.executor[1]?.[0]}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-sm text-gray-400 text-right">共 {taskCount} 个任务</div>
    </div>
  );
}

/* ── Task Detail Modal ─────────────────────────────────────────── */
function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
        metadata: { id: taskId },
      });
      setEditingField(null);
      fetchTask();
    } catch {
      // ignore
    }
  };

  const handleToggleStatus = async () => {
    if (!task) return;
    await handleSaveField("status", task.status === 1 ? 0 : 1);
  };

  const handleDelete = async () => {
    if (!confirm("确认删除此任务？")) return;
    try {
      await api.deleteProjectTask(taskId);
      onClose();
    } catch {
      // ignore
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.addProjectTaskComment(taskId, commentText.trim());
      setCommentText("");
      fetchTask();
    } catch {
      // ignore
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-800">任务详情</h3>
            {task?.taskNumber && (
              <span className="text-sm text-gray-400">#{task.taskNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ) : !task ? (
            <div className="text-center py-12 text-gray-400">加载失败</div>
          ) : (
            <div className="space-y-5">
              {/* Task name */}
              <div>
                {editingField === "taskName" ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveField("taskName", editValue)}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="w-full text-lg font-semibold border-b-2 border-blue-500 outline-none py-1"
                    autoFocus
                  />
                ) : (
                  <h4
                    className="text-lg font-semibold text-gray-800 hover:text-blue-600 cursor-pointer transition-colors"
                    onClick={() => startEdit("taskName", task.taskName)}
                  >
                    {task.taskName}
                  </h4>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  状态
                </label>
                <button
                  onClick={handleToggleStatus}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${isDone ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDone ? "border-green-500 bg-green-500" : "border-gray-400"}`}>
                    {isDone && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {isDone ? "已完成" : "未完成"}
                </button>
              </div>

              {/* Executor */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  执行人
                </label>
                {task.executor ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                      {task.executor[1]?.[0]}
                    </div>
                    <span className="text-sm text-gray-700">{task.executor[1]}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">未指派</span>
                )}
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  到期时间
                </label>
                {editingField === "deadline" ? (
                  <input
                    type="datetime-local"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveField("deadline", editValue ? editValue + ":00" : "")}
                    className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-sm text-gray-700 hover:text-blue-600 cursor-pointer transition-colors"
                    onClick={() => startEdit("deadline", task.deadline?.slice(0, 16) || "")}
                  >
                    {task.deadline ? task.deadline.slice(0, 16).replace("T", " ") : "点击设置"}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  优先级
                </label>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleSaveField("priority", Number(key))}
                      className={`px-2.5 py-1 rounded-full text-xs transition-colors ${task.priority === Number(key) ? `${val.bg} ${val.color} font-medium ring-2 ring-offset-1 ring-current` : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  详情
                </label>
                {editingField === "description" ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveField("description", editValue)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    autoFocus
                  />
                ) : (
                  <div
                    className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[60px] cursor-pointer hover:bg-gray-100 transition-colors whitespace-pre-wrap"
                    onClick={() => startEdit("description", task.description || "")}
                  >
                    {task.description || "点击添加详情..."}
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    标签
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.rid}
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: tag.color + "20", color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="border-t pt-4 grid grid-cols-2 gap-3 text-xs text-gray-400">
                {task.createdBy && (
                  <div>创建人: <span className="text-gray-600">{task.createdBy[1]}</span></div>
                )}
                {task.createdOn && (
                  <div>创建时间: <span className="text-gray-600">{task.createdOn.slice(0, 16).replace("T", " ")}</span></div>
                )}
                {task.modifiedOn && (
                  <div>更新时间: <span className="text-gray-600">{task.modifiedOn.slice(0, 16).replace("T", " ")}</span></div>
                )}
                {task.endTime && (
                  <div>完成时间: <span className="text-gray-600">{task.endTime.slice(0, 16).replace("T", " ")}</span></div>
                )}
              </div>

              {/* Comments */}
              <div className="border-t pt-4">
                <label className="text-sm text-gray-500 mb-3 block">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  评论 {task.comments ? `(${task.comments})` : ""}
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="输入评论..."
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="self-end px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment ? "..." : "发送"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
