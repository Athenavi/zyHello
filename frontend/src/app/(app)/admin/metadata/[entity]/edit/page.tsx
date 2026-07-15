"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

export default function EntityEditPage() {
  const { entity } = useParams<{ entity: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entityLabel: "",
    entityName: "",
    comments: "",
    icon: "",
    nameField: "",
    nameFieldLabel: "",
    detailEntity: false,
    mainEntity: false,
    advancedAttrs: false,
  });

  const fetchEntity = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEntityDetail(entity);
      const d = data as Record<string, unknown>;
      setForm({
        entityLabel: (d.entityLabel as string) || "",
        entityName: (d.entityName as string) || entity,
        comments: (d.comments as string) || "",
        icon: (d.icon as string) || "",
        nameField: (d.nameField as string) || "",
        nameFieldLabel: (d.nameFieldLabel as string) || "",
        detailEntity: (d.detailEntity as boolean) || false,
        mainEntity: (d.mainEntity as boolean) || false,
        advancedAttrs: false,
      });
    } catch {
      setForm((prev) => ({ ...prev, entityName: entity }));
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/admin/metadata/entity-update", {
        entityName: entity,
        label: form.entityLabel,
        comments: form.comments,
        icon: form.icon,
      });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full">
      <EntitySidebar active="edit" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2">
          <h1 className="text-lg font-bold text-gray-800">基本信息</h1>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <span className="mdi mdi-loading mdi-spin text-2xl"></span>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 space-y-6">
                {/* Entity icon & name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-3xl text-blue-600">
                    <span className={`mdi ${form.icon || "mdi-table"}`}></span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{form.entityLabel || form.entityName}</h2>
                    <p className="text-sm text-gray-500 font-mono">{form.entityName}</p>
                  </div>
                </div>

                {/* Basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实体名称</label>
                    <input
                      type="text"
                      value={form.entityLabel}
                      onChange={(e) => setForm({ ...form, entityLabel: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">内部标识</label>
                    <input
                      type="text"
                      value={form.entityName}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                    <div className="flex items-center gap-2">
                      <span className={`mdi ${form.icon || "mdi-table"} text-2xl text-blue-600`}></span>
                      <input
                        type="text"
                        value={form.icon}
                        onChange={(e) => setForm({ ...form, icon: e.target.value })}
                        placeholder="mdi-table"
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称字段</label>
                    <input
                      type="text"
                      value={form.nameFieldLabel || form.nameField}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Advanced options toggle */}
                <div>
                  <button
                    onClick={() => setForm({ ...form, advancedAttrs: !form.advancedAttrs })}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span className={`mdi ${form.advancedAttrs ? "mdi-chevron-up" : "mdi-chevron-down"}`}></span>
                    高级选项
                  </button>
                </div>

                {form.advancedAttrs && (
                  <div className="border-t pt-4 space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>允许重复</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>启用审计日志</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>允许分类标签</span>
                    </label>
                  </div>
                )}

                {/* Save button */}
                <div className="border-t pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
