"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "select" | "boolean";
  tip?: string;
  section: string;
  options?: { value: string; label: string }[];
}

const DINGTALK_FIELDS: ConfigField[] = [
  // 应用凭证
  { key: "DingtalkAgentId", label: "AgentId", type: "text", section: "credentials" },
  { key: "DingtalkAppKey", label: "AppKey", type: "text", section: "credentials" },
  { key: "DingtalkAppSecret", label: "AppSecret", type: "password", section: "credentials" },
  { key: "DingtalkCorpId", label: "CorpId", type: "text", section: "credentials" },
  { key: "DingtalkRobotCode", label: "RobotCode", type: "text", section: "credentials" },
  // 钉钉侧配置
  { key: "DingtalkHomeUrl", label: "应用首页地址", type: "text", section: "dingtalk", tip: "钉钉中打开的应用首页URL" },
  { key: "DingtalkCallbackDomain", label: "回调域名", type: "text", section: "dingtalk", tip: "钉钉回调使用的域名" },
  // 数据同步
  { key: "DingtalkSyncUsers", label: "自动同步用户", type: "boolean", section: "sync" },
  { key: "DingtalkSyncUsersMatch", label: "用户匹配方式", type: "select", section: "sync", tip: "通过何种方式匹配已存在用户，如无匹配则新建",
    options: [
      { value: "1", label: "用户名匹配" },
      { value: "2", label: "邮箱匹配" },
      { value: "3", label: "手机匹配" },
    ]
  },
  { key: "DingtalkSyncUsersRole", label: "新用户默认角色", type: "text", section: "sync" },
];

const SECTION_TITLES: Record<string, string> = {
  credentials: "应用凭证",
  dingtalk: "钉钉侧配置",
  sync: "数据同步",
};

export default function DingtalkConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationConfig("dingtalk");
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
      await api.saveIntegrationConfig("dingtalk", editValues);
      setConfig({ ...editValues });
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><div className="text-center text-gray-400 py-12">加载中...</div></div>;

  const sections = [...new Set(DINGTALK_FIELDS.map((f) => f.section))];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">钉钉集成</h1>
          <p className="text-sm text-gray-500 mt-1">配置钉钉应用凭证和数据同步</p>
        </div>
        {!editing && <button onClick={startEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button>}
      </div>

      <div className="max-w-3xl space-y-4">
        {sections.map((section) => (
          <div key={section} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">{SECTION_TITLES[section] || section}</h3>
            </div>
            <div className="p-5">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {DINGTALK_FIELDS.filter((f) => f.section === section).map((field) => (
                    <tr key={field.key}>
                      <td className="py-3 pr-4 text-sm text-gray-700 w-44 align-top">
                        <div className="font-medium">{field.label}</div>
                        {field.tip && <div className="text-xs text-gray-400 mt-0.5">{field.tip}</div>}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          field.type === "boolean" ? (
                            <select value={editValues[field.key] || "false"} onChange={(e) => updateValue(field.key, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                              <option value="true">启用</option>
                              <option value="false">禁用</option>
                            </select>
                          ) : field.type === "select" ? (
                            <select value={editValues[field.key] || ""} onChange={(e) => updateValue(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                              <option value="">请选择</option>
                              {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input type={field.type} value={editValues[field.key] || ""} onChange={(e) => updateValue(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          )
                        ) : (
                          <div className="text-sm text-gray-900">
                            {field.type === "boolean" ? (config[field.key] === "true" ? "启用" : "禁用") :
                             field.type === "password" ? (config[field.key] ? "••••••••" : "-") :
                             (config[field.key] || "-")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {editing && (
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">取消</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
