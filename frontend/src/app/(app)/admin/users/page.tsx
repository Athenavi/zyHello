"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface DeptNode {
  id: string;
  name: string;
  children?: DeptNode[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [departments, setDepartments] = useState<DeptNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(0); // 0=all, 1=active, 2=inactive, 3=disabled
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [tab, setTab] = useState<"users" | "departments">("users");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserLoginName, setNewUserLoginName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const pageSize = 20;

  const filterLabels = ["全部用户", "可用用户", "未激活的", "已禁用的"];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listUsers(page, pageSize, selectedDept || undefined, filter);
      const d = data as Record<string, unknown>;
      setUsers((d.data || d.items || d.users || []) as Record<string, unknown>[]);
      setTotal(((d.total || d.totalCount || 0) as number) || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, selectedDept, filter]);

  useEffect(() => {
    api
      .getDepartmentTree()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {
        api
          .listDepartments()
          .then((data) => {
            const arr = Array.isArray(data) ? data : [];
            setDepartments(arr.map((d: Record<string, unknown>) => ({
              id: (d.id || d.departmentId || "") as string,
              name: (d.name || d.departmentName || "") as string,
            })));
          })
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    if (!newUserLoginName.trim()) return;
    try {
      await api.saveUser({
        loginName: newUserLoginName,
        fullName: newUserName,
        email: newUserEmail,
        deptId: selectedDept || undefined,
      });
      setShowCreateUser(false);
      setNewUserName("");
      setNewUserLoginName("");
      setNewUserEmail("");
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    try {
      await api.saveDepartment({ name: newDeptName, parentId: selectedDept || undefined });
      setShowCreateDept(false);
      setNewDeptName("");
      // Refresh tree
      const data = await api.getDepartmentTree();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  };

  const handleToggleUser = async (userId: string, disabled: boolean) => {
    try {
      await api.enableUser(userId, !disabled);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const renderDeptTree = (nodes: DeptNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          onClick={() => { setSelectedDept(node.id); setPage(1); }}
          className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
            selectedDept === node.id
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {level > 0 && <span className="text-gray-400 mr-1">└</span>}
          {node.name}
        </button>
        {node.children && node.children.length > 0 && renderDeptTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
        <p className="text-gray-500 mt-1">管理系统用户和部门</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border-b">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "users"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          用户
        </button>
        <button
          onClick={() => setTab("departments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "departments"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          部门
        </button>
      </div>

      <div className="flex gap-4">
        {/* Department Tree Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase">部门</h3>
            </div>
            <div className="p-2 max-h-[600px] overflow-y-auto">
              <button
                onClick={() => { setSelectedDept(""); setPage(1); }}
                className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedDept === ""
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                全部
              </button>
              {departments.length > 0 && renderDeptTree(departments)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {tab === "users" ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchUsers(); } }}
                    placeholder="快速查询..."
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filter dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-white transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {filterLabels[filter]}
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {filterLabels.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setFilter(idx); setPage(1); }}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          filter === idx ? "text-blue-600 font-medium" : "text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  新建用户
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">用户</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">登录名</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">邮箱</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">部门</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                          <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            加载中...
                          </div>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无用户</td>
                      </tr>
                    ) : (
                      users.map((user, idx) => {
                        const u = user as Record<string, unknown>;
                        const uid = (u.id || u.userId || "") as string;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {((u.fullName || u.loginName || "U") as string).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-800">
                                  {(u.fullName || u.loginName || "") as string}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                              {(u.loginName || "") as string}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {(u.email || "-") as string}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {(u.department || u.deptName || "-") as string}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                u.disabled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              }`}>
                                {u.disabled ? "禁用" : "启用"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <button
                                onClick={() => handleToggleUser(uid, !!u.disabled)}
                                className={`text-xs px-2 py-1 rounded ${
                                  u.disabled
                                    ? "text-green-600 hover:bg-green-50"
                                    : "text-red-600 hover:bg-red-50"
                                }`}
                              >
                                {u.disabled ? "启用" : "禁用"}
                              </button>
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
                    共 {total} 个用户，第 {page}/{totalPages} 页
                  </div>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Departments Tab */
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">部门列表</h3>
                <button
                  onClick={() => setShowCreateDept(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  新建部门
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {departments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">暂无部门</div>
                ) : (
                  departments.map((dept, idx) => (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{dept.name}</div>
                          {dept.children && dept.children.length > 0 && (
                            <div className="text-xs text-gray-400">{dept.children.length} 个子部门</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`确定删除部门「${dept.name}」？`)) {
                            try {
                              await api.deleteDepartment(dept.id);
                              const data = await api.getDepartmentTree();
                              setDepartments(Array.isArray(data) ? data : []);
                            } catch (e: unknown) {
                              setError(e instanceof Error ? e.message : "删除失败");
                            }
                          }
                        }}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新建用户</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">登录名 *</label>
                <input
                  type="text"
                  value={newUserLoginName}
                  onChange={(e) => setNewUserLoginName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入登录名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateUser(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleCreateUser} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新建部门</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部门名称 *</label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="请输入部门名称"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateDept(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleCreateDept} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
