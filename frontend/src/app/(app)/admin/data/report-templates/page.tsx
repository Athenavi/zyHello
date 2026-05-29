"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

interface ReportTemplate {
  id: string;
  name: string;
  entity: string;
  entityLabel?: string;
  templateType?: string;
  enabled: boolean;
  modifiedOn?: string;
  filterData?: string;
}

export default function ReportTemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [entities, setEntities] = useState<string[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listReportTemplates(selectedEntity === "ALL" ? undefined : selectedEntity, searchQuery || undefined);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as ReportTemplate[];
      setTemplates(list);
      // Extract unique entities
      const entitySet = new Set(list.map((t) => t.entity));
      setEntities(Array.from(entitySet).sort());
    } catch {
      setTemplates([]);
    }
    setLoading(false);
  }, [selectedEntity, searchQuery]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此报表模板？")) return;
    try {
      await api.delete(`/admin/data/report-templates/${id}`);
      fetchTemplates();
    } catch {
      alert("删除失败");
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await api.put(`/admin/data/report-templates/${id}`, { enabled: !enabled });
      fetchTemplates();
    } catch {
      alert("操作失败");
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "excel":
        return "bg-green-100 text-green-700";
      case "word":
        return "bg-blue-100 text-blue-700";
      case "html":
      case "html5":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

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
          <h1 className="text-lg font-bold text-gray-800">报表模板</h1>
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
            <button className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <span className="mdi mdi-plus"></span>
              添加
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "30%" }}>名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">应用实体</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">使用条件</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "80px" }}>启用</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "120px" }}>修改时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" style={{ width: "120px" }}>操作</th>
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
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-microsoft-excel text-3xl"></span>
                      <p className="mt-2 text-sm">暂无报表模板</p>
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${getTypeBadge(tpl.templateType)}`}>
                            {tpl.templateType?.toUpperCase() || "EXCEL"}
                          </span>
                          <span className="font-medium text-gray-800">{tpl.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tpl.entityLabel || tpl.entity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tpl.filterData || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleEnabled(tpl.id, tpl.enabled)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${tpl.enabled ? "bg-blue-600" : "bg-gray-300"}`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                              tpl.enabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          ></div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tpl.modifiedOn || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                            <span className="mdi mdi-pencil text-base"></span>
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <span className="mdi mdi-delete text-base"></span>
                          </button>
                        </div>
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
