"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Approval {
  id: string;
  name: string;
  entity: string;
  entityLabel?: string;
  enabled: boolean;
  modifiedOn?: string;
  usageCount?: number;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [entities, setEntities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listApprovals(selectedEntity === "ALL" ? undefined : selectedEntity);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as Approval[];
      setApprovals(list);
      const entitySet = new Set(list.map((a) => a.entity));
      setEntities(Array.from(entitySet).sort());
    } catch {
      setApprovals([]);
    }
    setLoading(false);
  }, [selectedEntity]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此审批流程？")) return;
    try {
      await api.delete(`/admin/robot/approval/${id}`);
      fetchApprovals();
    } catch {
      alert("删除失败");
    }
  };

  const filtered = approvals.filter(
    (a) => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Left sidebar - entity filter */}
      <aside className="w-56 min-h-screen bg-white border-r flex-shrink-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold text-gray-800">应用实体</h3>
        </div>
        <nav className="py-2">
          <button
            onClick={() => setSelectedEntity("ALL")}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
              selectedEntity === "ALL" ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="mdi mdi-view-list text-base"></span>
            全部实体
          </button>
          {entities.map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                selectedEntity === ent ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="mdi mdi-table text-base"></span>
              {ent}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">审批流程</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="查询..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="relative">
              <div className="flex">
                <button
                  onClick={() => router.push("/admin/robot/approval-design/new")}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-l-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <span className="mdi mdi-plus"></span>
                  添加
                </button>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-2 py-1.5 bg-blue-600 text-white text-sm rounded-r-lg hover:bg-blue-700 border-l border-blue-500"
                >
                  <span className="mdi mdi-chevron-down"></span>
                </button>
              </div>
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 w-40">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <span className="mdi mdi-account-arrow-right-outline"></span>
                    批量转审
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">应用实体</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">使用情况</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "80px" }}>启用</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "120px" }}>修改时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" style={{ width: "80px" }}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-loading mdi-spin text-2xl"></span>
                      <p className="mt-1 text-sm">加载中...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-progress-check text-3xl"></span>
                      <p className="mt-2 text-sm">暂无审批流程</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((approval) => (
                    <tr key={approval.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => router.push(`/admin/robot/approval-design/${approval.id}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {approval.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{approval.entityLabel || approval.entity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{approval.usageCount ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`mdi ${approval.enabled ? "mdi-check-circle text-green-500" : "mdi-close-circle text-gray-300"} text-lg`}></span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{approval.modifiedOn || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => handleDelete(approval.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <span className="mdi mdi-delete text-base"></span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
