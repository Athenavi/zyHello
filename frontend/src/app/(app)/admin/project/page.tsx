"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface ProjectItem {
  configId?: string;
  projectId?: string;
  id?: string;
  projectName?: string;
  projectCode?: string;
  scope?: number;
  status?: number;
  createdBy?: string;
  members?: string;
  [key: string]: unknown;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.listProjects();
      const d = (res as Record<string, unknown>)?.data || res;
      const list = (Array.isArray(d) ? d : []) as ProjectItem[];
      setProjects(list);
    } catch {
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.saveAdminProject("", { projectName: newName });
      const d = res as Record<string, unknown>;
      const id = (d?.data as Record<string, unknown>)?.projectId || d?.projectId || "";
      setShowCreate(false);
      setNewName("");
      if (id) {
        router.push(`/admin/project/${id}`);
      } else {
        loadProjects();
      }
    } catch {
      alert("创建失败");
    }
    setCreating(false);
  };

  const handleDelete = async (project: ProjectItem) => {
    const id = project.configId || project.projectId || project.id;
    if (!id) return;
    if (!confirm(`确定删除项目「${project.projectName || id}」？此操作不可恢复。`)) return;
    try {
      await api.deleteAdminProject(id);
      loadProjects();
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">项目管理</h1>
          <p className="text-gray-500 mt-1">管理系统中的所有项目</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建项目
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">项目名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编码</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">范围</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无项目</td>
              </tr>
            ) : (
              projects.map((proj, idx) => {
                const id = proj.configId || proj.projectId || proj.id || idx;
                return (
                  <tr key={id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {proj.projectName || "未命名"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {proj.projectCode || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${proj.scope === 1 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {proj.scope === 1 ? "公开" : "私有"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${proj.status === 2 ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                        {proj.status === 2 ? "已归档" : "进行中"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/project/${id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(proj)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">新建项目</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入项目名称"
                autoFocus
              />
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => { setShowCreate(false); setNewName(""); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">取消</button>
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
