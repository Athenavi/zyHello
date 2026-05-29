"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
  displayType?: string;
  nullable?: boolean;
  creatable?: boolean;
}

function DockFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [entity, setEntity] = useState("");
  const [recordId, setRecordId] = useState("");
  const [fields, setFields] = useState<EntityField[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entityLabel, setEntityLabel] = useState("");
  const [maximized, setMaximized] = useState(false);
  const [postAction, setPostAction] = useState<string>("view");

  useEffect(() => {
    const e = searchParams.get("entity") || "";
    const id = searchParams.get("id") || "";
    const pa = searchParams.get("postAction") || "view";
    setEntity(e);
    setRecordId(id);
    setPostAction(pa);

    if (e) {
      loadFields(e, id);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadFields = async (entityName: string, rid: string) => {
    try {
      const fieldsData = await api.getFields(entityName);
      const fieldsList = (Array.isArray(fieldsData) ? fieldsData : (fieldsData as Record<string, unknown>).fields || []) as EntityField[];
      setFields(fieldsList.filter((f) => f.creatable !== false));
      
      // Load entity meta
      try {
        const meta = await api.getEntityMeta(entityName) as Record<string, unknown>;
        setEntityLabel((meta.entityLabel || meta.label || entityName) as string);
      } catch {
        setEntityLabel(entityName);
      }

      // If editing, load record
      if (rid) {
        const record = await api.getRecord(entityName, rid) as Record<string, unknown>;
        setFormData(record as Record<string, unknown>);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = recordId ? { ...formData, id: recordId } : formData;
      const res = await api.saveRecord(entity, payload) as Record<string, unknown>;
      const newId = (res.id || res.recordId || recordId) as string;

      switch (postAction) {
        case "view":
          if (newId) router.replace(`/entities/${entity}/${newId}`);
          break;
        case "edit":
          // Stay on form
          break;
        case "list":
          router.replace(`/entities/${entity}`);
          break;
        case "close":
          window.close();
          break;
        case "reload":
          window.location.reload();
          break;
        default:
          if (newId) router.replace(`/entities/${entity}/${newId}`);
      }
    } catch (e) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const renderField = (field: EntityField, idx: number) => {
    const name = field.field || field.name || "";
    const label = field.fieldLabel || field.label || name;
    const type = field.displayType || field.type || "TEXT";
    const value = (formData[name] as string) || "";

    return (
      <div key={idx} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {!field.nullable && <span className="text-red-500 ml-0.5">*</span>}
        </label>

        {type === "TEXTAREA" || type === "NTEXT" ? (
          <textarea
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        ) : type === "BOOL" ? (
          <select
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">--</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        ) : type === "DATE" || type === "DATETIME" ? (
          <input
            type={type === "DATETIME" ? "datetime-local" : "date"}
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : type === "NUMBER" || type === "DECIMAL" ? (
          <input
            type="number"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : type === "EMAIL" ? (
          <input
            type="email"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : type === "PHONE" || type === "TEL" ? (
          <input
            type="tel"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : type === "URL" ? (
          <input
            type="url"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${maximized ? "fixed inset-0 z-50 bg-white" : "min-h-screen bg-gray-50"}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">
              {recordId ? "编辑" : "新建"} {entityLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Post action selector */}
            <select
              value={postAction}
              onChange={(e) => setPostAction(e.target.value)}
              className="text-xs border rounded px-2 py-1 text-gray-600"
            >
              <option value="view">保存后查看</option>
              <option value="edit">继续编辑</option>
              <option value="list">返回列表</option>
              <option value="close">关闭窗口</option>
              <option value="reload">刷新页面</option>
            </select>
            <button
              onClick={() => setMaximized(!maximized)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title={maximized ? "还原" : "最大化"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {maximized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {fields.length === 0 ? (
                <p className="text-center text-gray-400 py-10">无可编辑字段</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {fields.map((field, idx) => renderField(field, idx))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-end gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DockFormPage() {
  return (
    <Suspense>
      <DockFormContent />
    </Suspense>
  );
}
