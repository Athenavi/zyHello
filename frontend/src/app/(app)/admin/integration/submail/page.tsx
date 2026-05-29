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

const SUBMAIL_FIELDS: ConfigField[] = [
  // 短信配置
  { key: "SmsAccount", label: "短信账号", type: "text", section: "sms" },
  { key: "SmsPassword", label: "短信密钥", type: "password", section: "sms" },
  { key: "SmsSign", label: "短信签名", type: "text", section: "sms", tip: "短信模板中的签名" },
  { key: "SmsServer", label: "短信服务器", type: "text", section: "sms", tip: "为空则使用默认服务器" },
  // 邮件配置
  { key: "MailAccount", label: "邮箱账号", type: "text", section: "mail" },
  { key: "MailPassword", label: "邮箱密码", type: "password", section: "mail" },
  { key: "MailFrom", label: "发件人地址", type: "text", section: "mail" },
  { key: "MailFromName", label: "发件人名称", type: "text", section: "mail" },
  { key: "MailServer", label: "SMTP服务器", type: "text", section: "mail" },
  { key: "MailPort", label: "端口", type: "text", section: "mail" },
  { key: "MailSsl", label: "SSL/TLS", type: "boolean", section: "mail" },
];

const SECTION_TITLES: Record<string, string> = {
  sms: "短信配置 (SUBMAIL)",
  mail: "邮件配置 (SMTP)",
};

export default function SubmailConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationConfig("submail");
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
      await api.saveIntegrationConfig("submail", editValues);
      setConfig({ ...editValues });
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><div className="text-center text-gray-400 py-12">加载中...</div></div>;

  const sections = [...new Set(SUBMAIL_FIELDS.map((f) => f.section))];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">短信/邮件配置</h1>
          <p className="text-sm text-gray-500 mt-1">配置 SUBMAIL 短信服务和 SMTP 邮件服务</p>
        </div>
        {!editing && <button onClick={startEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button>}
      </div>

      <div className="max-w-3xl space-y-4">
        {sections.map((section) => (
          <div key={section} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-3 border-b"><h3 className="text-sm font-semibold text-gray-700">{SECTION_TITLES[section] || section}</h3></div>
            <div className="p-5">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {SUBMAIL_FIELDS.filter((f) => f.section === section).map((field) => (
                    <tr key={field.key}>
                      <td className="py-3 pr-4 text-sm text-gray-700 w-40 align-top">
                        <div className="font-medium">{field.label}</div>
                        {field.tip && <div className="text-xs text-gray-400 mt-0.5">{field.tip}</div>}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          field.type === "boolean" ? (
                            <select value={editValues[field.key] || "false"} onChange={(e) => updateValue(field.key, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                              <option value="true">启用</option><option value="false">禁用</option>
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
