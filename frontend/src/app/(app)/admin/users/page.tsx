"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [departments, setDepartments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    api
      .listDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listUsers(page, pageSize)
      .then((data) => {
        const d = data as Record<string, unknown>;
        setUsers(
          (d.data || d.items || d.users || []) as Record<string, unknown>[]
        );
        setTotal(((d.total || d.totalCount || 0) as number) || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
        <p className="text-gray-500 mt-1">管理系统用户和部门</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Departments summary */}
      {departments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">部门</h3>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {(dept.name || dept.label || dept.departmentName || "部门") as string}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                用户
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                登录名
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                邮箱
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                部门
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user, idx) => {
                const u = user as Record<string, unknown>;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {((u.fullName || u.loginName || "U") as string)
                            .charAt(0)
                            .toUpperCase()}
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
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          u.disabled
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {u.disabled ? "禁用" : "启用"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
    </div>
  );
}
