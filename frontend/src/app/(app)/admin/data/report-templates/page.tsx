"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", entity: "", templateType: "EXCEL" });
  const [availableEntities, setAvailableEntities] = useState<{ name: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listReportTemplates(selectedEntity === "ALL" ? undefined : selectedEntity, searchQuery || undefined);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as ReportTemplate[];
      setTemplates(list);
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

  // Load available entities for the form
  useEffect(() => {
    if (showForm) {
      (async () => {
        try {
          const data = await api.listEntities();
          const list = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data || []) as { name: string; label: string }[];
          setAvailableEntities(list);
        } catch {
          setAvailableEntities([]);
        }
      })();
    }
  }, [showForm]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此报表模板？")) return;
    try {
      await api.deleteReportTemplate(id);
      fetchTemplates();
    } catch {
      alert("删除失败");
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await api.post("/admin/data/report-templates/toggle", { id, enabled: !enabled });
      fetchTemplates();
    } catch {
      alert("操作失败");
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.entity) {
      alert("请填写名称并选择实体");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/data/report-templates/save", {
        name: formData.name,
        belongEntity: formData.entity,
        templateType: formData.templateType === "EXCEL" ? 1 : formData.templateType === "WORD" ? 3 : 4,
      });
      setShowForm(false);
      setFormData({ name: "", entity: "", templateType: "EXCEL" });
      fetchTemplates();
    } catch {
      alert("创建失败");
    }
    setSaving(false);
  };

  const getTypeBadge = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "excel": return "bg-green-100 text-green-700";
      case "word": return "bg-blue-100 text-blue-700";
      case "html": case "html5": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8" />
              </svg>
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
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="mt-1 text-sm">加载中...</p>
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
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
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${tpl.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tpl.modifiedOn || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* Add dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新建报表模板</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入模板名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">应用实体</label>
                <select
                  value={formData.entity}
                  onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择实体</option>
                  {availableEntities.map((e) => (
                    <option key={e.name} value={e.name}>{e.label || e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板类型</label>
                <select
                  value={formData.templateType}
                  onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EXCEL">Excel</option>
                  <option value="WORD">Word</option>
                  <option value="HTML5">HTML5</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">取消</button>
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
