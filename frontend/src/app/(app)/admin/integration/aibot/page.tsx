"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "select" | "boolean";
  tip?: string;
  options?: { value: string; label: string }[];
}

const AIBOT_FIELDS: ConfigField[] = [
  { key: "AibotName", label: "名称", type: "text" },
  { key: "AibotApiUrl", label: "API 地址", type: "text", tip: "OpenAI 兼容的 API 地址" },
  { key: "AibotApiKey", label: "API 密钥", type: "password" },
  { key: "AibotBaseDefModel", label: "默认模型", type: "text", tip: "如 gpt-4o, claude-3-sonnet 等" },
  { key: "AibotDefaultPrompt", label: "默认提示词", type: "textarea", tip: "AI 助手的系统提示词" },
];

export default function AibotConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationConfig("aibot");
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const cfg = (d.data || d.config || d) as Record<string, string>;
        setConfig(cfg);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditValues({ ...config });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValues({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveIntegrationConfig("aibot", editValues);
      setConfig({ ...editValues });
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-12">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 助手配置</h1>
          <p className="text-sm text-gray-500 mt-1">配置 AI 助手的 API 地址、密钥和模型</p>
        </div>
        {!editing && (
          <button onClick={startEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            编辑
          </button>
        )}
      </div>

      <div className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">AI 助手设置</h3>
          </div>
          <div className="p-5">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                {AIBOT_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td className="py-3 pr-4 text-sm text-gray-700 w-40 align-top">
                      <div className="font-medium">{field.label}</div>
                      {field.tip && <div className="text-xs text-gray-400 mt-0.5">{field.tip}</div>}
                    </td>
                    <td className="py-3">
                      {editing ? (
                        field.type === "textarea" ? (
                          <textarea
                            value={editValues[field.key] || ""}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : field.type === "select" ? (
                          <select
                            value={editValues[field.key] || ""}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">请选择</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={editValues[field.key] || ""}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )
                      ) : (
                        <div className="text-sm text-gray-900">
                          {field.type === "password" ? (config[field.key] ? "••••••••" : "-") : (config[field.key] || "-")}
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
