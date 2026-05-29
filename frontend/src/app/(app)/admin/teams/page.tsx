"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface Team {
  id: string;
  name: string;
  principal?: { id: string; fullName: string; loginName: string };
  members?: number;
  createdOn?: string;
  modifiedOn?: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, unknown>[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");

  const fetchTeams = useCallback(async (p: number, q?: string) => {
    setLoading(true);
    try {
      const data = await api.listTeams(p, 20, q);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const items = (d.data || d.items || d.teams || (Array.isArray(data) ? data : [])) as Team[];
        setTeams(items);
        setTotalPages(((d.totalPages as number) || Math.ceil(((d.totalRecords as number) || items.length) / 20)) || 1);
      }
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(page, query);
  }, [page, query, fetchTeams]);

  const handleSearch = () => {
    setPage(1);
    fetchTeams(1, query);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.saveTeam({ name: newName.trim() });
      setShowCreate(false);
      setNewName("");
      fetchTeams(1);
      setPage(1);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm("确认删除此团队？")) return;
    try {
      await api.deleteTeam(teamId);
      fetchTeams(page, query);
      if (selectedTeam?.id === teamId) setSelectedTeam(null);
    } catch {
      // ignore
    }
  };

  const handleViewTeam = async (team: Team) => {
    setSelectedTeam(team);
    setEditMode(false);
    try {
      const data = await api.getTeam(team.id);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        setTeamMembers(((d.members || (d.data as any)?.members || []) as Record<string, unknown>[]) || []);
        if (d.name) setSelectedTeam({ ...team, name: d.name as string });
      }
    } catch {
      setTeamMembers([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTeam || !editName.trim()) return;
    try {
      await api.saveTeam({ id: selectedTeam.id, name: editName.trim() });
      setEditMode(false);
      fetchTeams(page, query);
      setSelectedTeam({ ...selectedTeam, name: editName.trim() });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full">
      {/* Team List */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">团队管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理系统团队与成员</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + 新建团队
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="搜索团队名称..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">搜索</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">团队名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成员数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
                ) : teams.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">暂无团队数据</td></tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className={`hover:bg-gray-50 cursor-pointer ${selectedTeam?.id === team.id ? "bg-blue-50" : ""}`}
                      onClick={() => handleViewTeam(team)}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{team.principal?.fullName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{team.members ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{team.createdOn ? new Date(team.createdOn).toLocaleDateString("zh-CN") : "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}
                          className="text-red-600 hover:text-red-800 text-xs">删除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Detail Sidebar */}
      {selectedTeam && (
        <div className="w-80 border-l bg-white p-5 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">团队详情</h3>
            <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {editMode ? (
            <div className="space-y-3 mb-4">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
                <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">取消</button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">团队名称</div>
              <div className="text-base font-medium">{selectedTeam.name}</div>
            </div>
          )}

          <div className="space-y-3 text-sm mb-6">
            <div>
              <div className="text-gray-500 mb-1">负责人</div>
              <div>{selectedTeam.principal?.fullName || "未指定"}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">创建时间</div>
              <div>{selectedTeam.createdOn ? new Date(selectedTeam.createdOn).toLocaleString("zh-CN") : "-"}</div>
            </div>
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">成员列表</h4>
              <span className="text-xs text-gray-500">{teamMembers.length} 人</span>
            </div>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-400">暂无成员</p>
            ) : (
              <ul className="space-y-2">
                {teamMembers.map((m, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs">
                      {((m.fullName as string) || (m.loginName as string) || "?").charAt(0)}
                    </span>
                    <span>{(m.fullName as string) || (m.loginName as string)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setEditMode(true); setEditName(selectedTeam.name); }}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button>
            <button onClick={() => handleDelete(selectedTeam.id)}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">删除</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">新建团队</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5">
              <label className="block text-sm text-gray-700 mb-1">团队名称</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="请输入团队名称" autoFocus
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
