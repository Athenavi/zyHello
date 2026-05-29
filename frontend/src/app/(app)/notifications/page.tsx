"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const TABS = [
  { key: "messages", label: "消息", icon: "📩" },
  { key: "todo", label: "待办", icon: "📋" },
  { key: "approval", label: "审批", icon: "✅" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Notification {
  [key: string]: unknown;
}

interface TodoItem {
  [key: string]: unknown;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabKey>("messages");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">消息中心</h1>
        <p className="text-gray-500 mt-1">查看通知、待办事项和审批流程</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="flex border-b">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "messages" && <MessagesTab />}
      {tab === "todo" && <TodoTab />}
      {tab === "approval" && <ApprovalTab />}
    </div>
  );
}

/* ─── Messages Tab ────────────────────────────────────────────────── */

function MessagesTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listNotifications()
      .then((data) => {
        const d = data as Record<string, unknown>;
        setNotifications(
          Array.isArray(d)
            ? d
            : ((d.data || d.items || d.notifications || []) as Notification[])
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getTypeIcon = (type: unknown) => {
    switch (type) {
      case "1":
      case "approval":
        return "✅";
      case "2":
      case "mention":
        return "💬";
      case "3":
      case "system":
        return "🔔";
      default:
        return "📩";
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📩</div>
          <div className="text-gray-500">暂无消息</div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, idx) => {
            const isRead = (n.read || n.isRead) as boolean;
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer ${
                  !isRead ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl mt-0.5">
                    {getTypeIcon(n.type || n.messageType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          !isRead ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {(n.title || n.subject || n.message || "通知") as string}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    {String(n.content || n.body || n.message || "") && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {String(n.content || n.body || n.message || "")}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {n.createdOn || n.createdAt
                        ? new Date(
                            (n.createdOn || n.createdAt) as string
                          ).toLocaleString("zh-CN")
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Todo Tab ────────────────────────────────────────────────────── */

function TodoTab() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listNotifications();
      const d = data as Record<string, unknown>;
      const items = Array.isArray(d)
        ? d
        : ((d.data || d.items || d.notifications || []) as TodoItem[]);
      // Filter todo type items
      const todoItems = items.filter(
        (item) =>
          item.type === "20" ||
          item.type === "todo" ||
          item.messageType === "20" ||
          item.messageType === "todo"
      );
      setTodos(todoItems.length > 0 ? todoItems : items.slice(0, 5));
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const filteredTodos = todos.filter((t) => {
    if (filter === "all") return true;
    const status = t.status || t.state;
    if (filter === "pending") return !status || status === "0" || status === "pending";
    return status === "1" || status === "done" || status === "completed";
  });

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-full transition ${
              filter === f
                ? "bg-blue-100 text-blue-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "全部" : f === "pending" ? "待处理" : "已完成"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-gray-500">暂无待办事项</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map((todo, idx) => {
            const status = todo.status || todo.state;
            const isDone = status === "1" || status === "done" || status === "completed";
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isDone ? "bg-green-500 border-green-500" : "border-gray-300"
                  }`}>
                    {isDone && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {(todo.title || todo.subject || todo.message || "待办事项") as string}
                    </div>
                    {(todo.content || todo.body) && (
                      <p className="text-sm text-gray-500 mt-1">
                        {String(todo.content || todo.body)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDone ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {isDone ? "已完成" : "待处理"}
                      </span>
                      {(todo.createdOn || todo.createdAt) && (
                        <span className="text-xs text-gray-400">
                          {new Date(String(todo.createdOn || todo.createdAt)).toLocaleString("zh-CN")}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isDone && (
                    <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      处理
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Approval Tab ────────────────────────────────────────────────── */

function ApprovalTab() {
  const [approvals, setApprovals] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listNotifications();
      const d = data as Record<string, unknown>;
      const items = Array.isArray(d)
        ? d
        : ((d.data || d.items || d.notifications || []) as TodoItem[]);
      // Filter approval type items
      const approvalItems = items.filter(
        (item) =>
          item.type === "approval" ||
          item.type === "1" ||
          item.messageType === "approval" ||
          item.messageType === "1"
      );
      setApprovals(approvalItems.length > 0 ? approvalItems : items.slice(0, 3));
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const filteredApprovals = approvals.filter((a) => {
    if (filter === "all") return true;
    const status = a.approvalState || a.status || a.state;
    if (filter === "pending") return !status || status === "PENDING" || status === "0";
    if (filter === "approved") return status === "APPROVED" || status === "1";
    return status === "REJECTED" || status === "-1";
  });

  const getStateBadge = (item: TodoItem) => {
    const status = item.approvalState || item.status || item.state;
    if (status === "APPROVED" || status === "1")
      return { text: "已通过", color: "bg-green-100 text-green-700" };
    if (status === "REJECTED" || status === "-1")
      return { text: "已拒绝", color: "bg-red-100 text-red-700" };
    return { text: "待审批", color: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-full transition ${
              filter === f
                ? "bg-blue-100 text-blue-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all"
              ? "全部"
              : f === "pending"
                ? "待审批"
                : f === "approved"
                  ? "已通过"
                  : "已拒绝"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-500">暂无审批记录</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((item, idx) => {
            const badge = getStateBadge(item);
            const isPending =
              !item.approvalState && !item.status && !item.state ||
              item.approvalState === "PENDING" ||
              item.status === "0";
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-lg">✅</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {(item.title || item.subject || item.message || "审批事项") as string}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    {(item.content || item.body) && (
                      <p className="text-sm text-gray-500 mt-1">
                        {String(item.content || item.body)}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {(item.createdOn || item.createdAt) && (
                        <span>
                          提交时间: {new Date(String(item.createdOn || item.createdAt)).toLocaleString("zh-CN")}
                        </span>
                      )}
                      {item.approvalName && (
                        <span>流程: {String(item.approvalName)}</span>
                      )}
                    </div>
                  </div>
                  {isPending && (
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        通过
                      </button>
                      <button className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        拒绝
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
