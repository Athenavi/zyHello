"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "boolean";
  tip?: string;
  options?: { value: string; label: string }[];
}

const STORAGE_FIELDS: ConfigField[] = [
  { key: "QiniuAccessKey", label: "Access Key", type: "text" },
  { key: "QiniuSecretKey", label: "Secret Key", type: "password" },
  { key: "QiniuBucket", label: "Bucket", type: "text", tip: "七牛云存储空间名称" },
  { key: "QiniuUpHost", label: "上传域名", type: "text", tip: "如 https://up.qiniup.com" },
  { key: "QiniuUrlDomain", label: "访问域名", type: "text", tip: "文件访问域名，如 https://cdn.example.com" },
  { key: "QiniuRegion", label: "存储区域", type: "select", options: [
    { value: "z0", label: "华东" },
    { value: "z1", label: "华北" },
    { value: "z2", label: "华南" },
    { value: "na0", label: "北美" },
    { value: "as0", label: "东南亚" },
  ]},
];

export default function StorageQiniuConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationConfig("storage");
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        setConfig(((d.data || d.config || d) as Record<string, string>) || {});
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const startEdit = () => { setEditValues({ ...config }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setEditValues({}); };
  const updateValue = (key: string, value: string) => setEditValues((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveIntegrationConfig("storage", editValues);
      setConfig({ ...editValues });
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><div className="text-center text-gray-400 py-12">加载中...</div></div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">七牛云存储配置</h1>
          <p className="text-sm text-gray-500 mt-1">配置七牛云对象存储服务</p>
        </div>
        {!editing && <button onClick={startEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button>}
      </div>

      <div className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">七牛云存储设置</h3>
          </div>
          <div className="p-5">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                {STORAGE_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td className="py-3 pr-4 text-sm text-gray-700 w-40 align-top">
                      <div className="font-medium">{field.label}</div>
                      {field.tip && <div className="text-xs text-gray-400 mt-0.5">{field.tip}</div>}
                    </td>
                    <td className="py-3">
                      {editing ? (
                        field.type === "select" ? (
                          <select value={editValues[field.key] || ""} onChange={(e) => updateValue(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">请选择</option>
                            {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input type={field.type} value={editValues[field.key] || ""} onChange={(e) => updateValue(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        )
                      ) : (
                        <div className="text-sm text-gray-900">
                          {field.type === "password" ? (config[field.key] ? "••••••••" : "-") :
                           field.type === "select" ? (field.options?.find((o) => o.value === config[field.key])?.label || config[field.key] || "-") :
                           (config[field.key] || "-")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && (
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={cancelEdit} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
