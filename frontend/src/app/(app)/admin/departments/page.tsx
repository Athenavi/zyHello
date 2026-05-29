"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface DeptNode {
  id: string;
  name: string;
  parentId?: string;
  children?: DeptNode[];
  memberCount?: number;
  principal?: { id: string; fullName: string; loginName: string };
  createdOn?: string;
}

interface User {
  id: string;
  loginName: string;
  fullName: string;
  email?: string;
  dept?: { name: string };
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DeptNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<DeptNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "departments">("departments");
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listDepartments();
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const items = (d.data || d.items || d.departments || (Array.isArray(data) ? data : [])) as DeptNode[];
        setDepartments(items);
        // Auto expand first level
        if (items.length > 0) {
          const ids = new Set(items.map((d) => d.id));
          setExpandedIds(ids);
        }
      }
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeptUsers = useCallback(async (deptId?: string) => {
    setUsersLoading(true);
    try {
      const data = await api.listUsers(1, 100, deptId, 0);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        setUsers(((d.data || d.items || d.users || (Array.isArray(data) ? data : [])) as User[]) || []);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (tab === "users") {
      fetchDeptUsers(selectedDept?.id);
    }
  }, [tab, selectedDept, fetchDeptUsers]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.saveDepartment({ name: newName.trim(), parentId: selectedDept?.id });
      setShowCreate(false);
      setNewName("");
      fetchDepartments();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm("确认删除此部门？子部门也会被删除。")) return;
    try {
      await api.deleteDepartment(deptId);
      fetchDepartments();
      if (selectedDept?.id === deptId) setSelectedDept(null);
    } catch {
      // ignore
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDept || !editName.trim()) return;
    try {
      await api.saveDepartment({ id: selectedDept.id, name: editName.trim() });
      setEditMode(false);
      fetchDepartments();
    } catch {
      // ignore
    }
  };

  const renderDeptTree = (nodes: DeptNode[], level = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedDept?.id === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer text-sm rounded transition-colors ${
              isSelected ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-700"
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => { setSelectedDept(node); setEditMode(false); }}
          >
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600">
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4 h-4" />
            )}
            <span className="flex-1 truncate">{node.name}</span>
            {node.memberCount != null && (
              <span className="text-xs text-gray-400">{node.memberCount}</span>
            )}
          </div>
          {hasChildren && isExpanded && renderDeptTree(node.children!, level + 1)}
        </div>
      );
    });
  };

  const filterDepts = (nodes: DeptNode[], q: string): DeptNode[] => {
    if (!q) return nodes;
    return nodes
      .map((n) => {
        const children = n.children ? filterDepts(n.children, q) : [];
        if (n.name.toLowerCase().includes(q.toLowerCase()) || children.length > 0) {
          return { ...n, children };
        }
        return null;
      })
      .filter(Boolean) as DeptNode[];
  };

  const filteredDepts = query ? filterDepts(departments, query) : departments;

  return (
    <div className="flex h-full">
      {/* Dept Tree Sidebar */}
      <div className="w-64 border-r bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="搜索部门..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">加载中...</div>
          ) : filteredDepts.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">暂无部门</div>
          ) : (
            renderDeptTree(filteredDepts)
          )}
        </div>
        <div className="p-2 border-t">
          <button onClick={() => setShowCreate(true)}
            className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100">
            + 新建部门
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Tabs */}
        <ul className="flex border-b mb-4">
          {(["departments", "users"] as const).map((t) => (
            <li key={t} className={`px-4 py-2 text-sm cursor-pointer border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
            }`} onClick={() => setTab(t)}>
              {t === "departments" ? "部门管理" : "用户列表"}
            </li>
          ))}
        </ul>

        {!selectedDept ? (
          <div className="text-center text-gray-400 py-12">请从左侧选择一个部门</div>
        ) : tab === "departments" ? (
          /* Department Detail */
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm" />
                    <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">保存</button>
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-gray-100 rounded text-sm">取消</button>
                  </div>
                ) : (
                  <h2 className="text-xl font-bold text-gray-900">{selectedDept.name}</h2>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditMode(true); setEditName(selectedDept.name); }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100">编辑</button>
                <button onClick={() => handleDelete(selectedDept.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100">删除</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">负责人</div>
                <div>{selectedDept.principal?.fullName || "未指定"}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">成员数</div>
                <div>{selectedDept.memberCount ?? "-"}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">子部门数</div>
                <div>{selectedDept.children?.length ?? 0}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">创建时间</div>
                <div>{selectedDept.createdOn ? new Date(selectedDept.createdOn).toLocaleDateString("zh-CN") : "-"}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Users List */
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersLoading ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">暂无用户</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{user.loginName}</td>
                        <td className="px-4 py-3 text-sm font-medium">{user.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.dept?.name || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">新建部门</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {selectedDept && (
                <div className="text-sm text-gray-500">上级部门：<span className="text-gray-900">{selectedDept.name}</span></div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1">部门名称</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="请输入部门名称" autoFocus
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">取消</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
