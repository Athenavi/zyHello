"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

interface FormField {
  field: string;
  label: string;
  isFull: boolean;
  required?: boolean;
  readonly?: boolean;
}

interface FormSection {
  name: string;
  fields: FormField[];
}

export default function FormDesignPage() {
  const { entity } = useParams<{ entity: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"design" | "advanced">("design");
  const [sections, setSections] = useState<FormSection[]>([]);
  const [availableFields, setAvailableFields] = useState<{ field: string; label: string }[]>([]);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"fields" | "new">("fields");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [formDesign, fieldsData] = await Promise.all([
        api.getFormDesign(entity),
        api.getEntityFields(entity),
      ]);
      const fd = formDesign as Record<string, unknown>;
      setSections((fd.sections || fd.data || []) as FormSection[]);
      const flds = fieldsData as Record<string, unknown>;
      const allFields = (flds.fields || flds.data || fieldsData || []) as { field: string; fieldName: string; fieldLabel: string; label: string }[];
      setAvailableFields(allFields.map((f) => ({ field: f.field || f.fieldName, label: f.label || f.fieldLabel })));
    } catch {
      setSections([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveFormDesign(entity, { sections });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleAddSection = () => {
    setSections([...sections, { name: `分组 ${sections.length + 1}`, fields: [] }]);
  };

  const handleRemoveSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const handleRemoveField = (sectionIdx: number, fieldIdx: number) => {
    const newSections = [...sections];
    newSections[sectionIdx].fields = newSections[sectionIdx].fields.filter((_, i) => i !== fieldIdx);
    setSections(newSections);
  };

  const handleToggleFull = (sectionIdx: number, fieldIdx: number) => {
    const newSections = [...sections];
    newSections[sectionIdx].fields[fieldIdx].isFull = !newSections[sectionIdx].fields[fieldIdx].isFull;
    setSections(newSections);
  };

  const handleDrop = (sectionIdx: number) => {
    if (!dragItem) return;
    const newSections = [...sections];
    if (!newSections[sectionIdx].fields.find((f) => f.field === dragItem)) {
      const af = availableFields.find((f) => f.field === dragItem);
      newSections[sectionIdx].fields.push({
        field: dragItem,
        label: af?.label || dragItem,
        isFull: false,
      });
    }
    setSections(newSections);
    setDragItem(null);
  };

  const usedFields = new Set(sections.flatMap((s) => s.fields.map((f) => f.field)));
  const unusedFields = availableFields.filter((f) => !usedFields.has(f.field));

  return (
    <div className="flex h-full">
      <EntitySidebar active="form-design" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">表单设计</h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => setActiveTab("design")}
                className={`px-4 py-1.5 text-sm ${activeTab === "design" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                表单布局
              </button>
              <button
                onClick={() => setActiveTab("advanced")}
                className={`px-4 py-1.5 text-sm border-l ${activeTab === "advanced" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                高级控制
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <span className="mdi mdi-undo"></span>
                撤销
              </button>
              <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <span className="mdi mdi-redo"></span>
                重做
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Main form design area */}
          <div className="flex-1 px-6 pb-6">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <span className="mdi mdi-loading mdi-spin text-2xl"></span>
              </div>
            ) : activeTab === "design" ? (
              <div className="space-y-4">
                {sections.map((section, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-white rounded-xl shadow-sm border"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(sIdx)}
                  >
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sIdx].name = e.target.value;
                          setSections(newSections);
                        }}
                        className="text-sm font-medium text-gray-800 bg-transparent border-none focus:outline-none"
                      />
                      <button onClick={() => handleRemoveSection(sIdx)} className="text-gray-400 hover:text-red-500">
                        <span className="mdi mdi-delete text-sm"></span>
                      </button>
                    </div>
                    <div className="p-4">
                      {section.fields.length === 0 ? (
                        <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed rounded-lg">
                          拖放字段到这里
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {section.fields.map((field, fIdx) => (
                            <div
                              key={fIdx}
                              className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border group ${
                                field.isFull ? "col-span-2" : ""
                              }`}
                            >
                              <span className="mdi mdi-drag-vertical text-gray-300 cursor-move"></span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700 truncate">{field.label}</div>
                                <div className="text-xs text-gray-400 font-mono">{field.field}</div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleToggleFull(sIdx, fIdx)}
                                  className="p-1 text-gray-400 hover:text-blue-500"
                                  title={field.isFull ? "半宽" : "全宽"}
                                >
                                  <span className={`mdi ${field.isFull ? "mdi-arrow-collapse" : "mdi-arrow-expand"} text-sm`}></span>
                                </button>
                                <button
                                  onClick={() => handleRemoveField(sIdx, fIdx)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                  title="移除"
                                >
                                  <span className="mdi mdi-close text-sm"></span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddSection}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-300 text-sm flex items-center justify-center gap-1"
                >
                  <span className="mdi mdi-plus"></span>
                  添加分组
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">字段</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "100px" }}>新建时</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "100px" }}>编辑时</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "100px" }}>详情时</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sections.flatMap((s) => s.fields).map((field, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{field.label}</td>
                        <td className="px-4 py-2 text-center">
                          <label className="inline-flex items-center">
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <label className="inline-flex items-center">
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <label className="inline-flex items-center">
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right sidebar - available fields */}
          <div className="w-64 bg-white border-l min-h-screen flex-shrink-0">
            <div className="border-b flex">
              <button
                onClick={() => setRightTab("fields")}
                className={`flex-1 px-3 py-2.5 text-xs font-medium ${rightTab === "fields" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              >
                字段列表
              </button>
              <button
                onClick={() => setRightTab("new")}
                className={`flex-1 px-3 py-2.5 text-xs font-medium ${rightTab === "new" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              >
                新建字段
              </button>
            </div>
            <div className="p-3 space-y-1 overflow-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
              {rightTab === "fields" ? (
                unusedFields.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">所有字段已使用</p>
                ) : (
                  unusedFields.map((f) => (
                    <div
                      key={f.field}
                      draggable
                      onDragStart={() => setDragItem(f.field)}
                      onDragEnd={() => setDragItem(null)}
                      className="px-3 py-2 text-sm bg-gray-50 rounded-lg border cursor-grab hover:bg-blue-50 hover:border-blue-200"
                    >
                      <div className="font-medium text-gray-700">{f.label}</div>
                      <div className="text-xs text-gray-400 font-mono">{f.field}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="text-xs text-gray-400 text-center py-4">请在字段管理中添加新字段</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
