"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ConfigSection {
  key: string;
  label: string;
  value: string | boolean | number;
  type: "text" | "boolean" | "select" | "textarea" | "number" | "password";
  tip?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
}

const SECTION_DEFINITIONS: Record<string, { title: string; fields: Omit<ConfigSection, "value">[] }> = {
  general: {
    title: "通用",
    fields: [
      { key: "AppName", label: "名称", type: "text" },
      { key: "HomeURL", label: "主页地址/域名", type: "text", tip: "所有外部链接将以此作为前缀" },
      { key: "DefaultLanguage", label: "默认语言", type: "select", options: [
        { value: "zh_CN", label: "简体中文" },
        { value: "en", label: "English" },
        { value: "ja", label: "日本語" },
      ]},
      { key: "PageFooter", label: "页脚", type: "textarea", optional: true, tip: "支持 MD 语法" },
      { key: "LiveWallpaper", label: "登录页每日一图", type: "boolean" },
    ],
  },
  security: {
    title: "安全使用",
    fields: [
      { key: "MarkWatermark", label: "显示页面水印", type: "boolean" },
      { key: "FileSharable", label: "允许分享文件", type: "boolean" },
      { key: "OpenSignUp", label: "公开注册", type: "boolean", tip: "允许用户自助注册" },
      { key: "LoginCaptchaPolicy", label: "登录验证码显示模式", type: "select", options: [
        { value: "0", label: "不启用" },
        { value: "1", label: "自动" },
        { value: "2", label: "总是显示" },
      ]},
      { key: "PasswordPolicy", label: "登录密码等级", type: "select", options: [
        { value: "1", label: "低 (最低6位，无字符类型限制)" },
        { value: "2", label: "中 (最低6位，必须同时包含数字、字母)" },
        { value: "3", label: "高 (最低10位，必须同时包含数字、字母、特殊字符)" },
      ]},
      { key: "PasswordExpiredDays", label: "登录密码过期时间 (天)", type: "number", tip: "0 表示不启用" },
      { key: "Login2FAMode", label: "启用两步验证", type: "select", options: [
        { value: "0", label: "不启用" },
        { value: "1", label: "手机或邮箱" },
        { value: "2", label: "仅手机" },
        { value: "3", label: "仅邮箱" },
      ]},
    ],
  },
  dataSecurity: {
    title: "数据安全",
    fields: [
      { key: "DBBackupsEnable", label: "数据自动备份", type: "boolean", tip: "每日 0 点备份到数据目录" },
      { key: "DBBackupsKeepingDays", label: "备份保留时间 (天)", type: "number" },
      { key: "RevisionHistoryKeepingDays", label: "变更历史保留时间 (天)", type: "number" },
      { key: "RecycleBinKeepingDays", label: "回收站保留时间 (天)", type: "number" },
    ],
  },
  preview: {
    title: "文档预览",
    fields: [
      { key: "OnlyofficeServer", label: "ONLYOFFICE 服务地址", type: "text", optional: true },
      { key: "OnlyofficeJwt", label: "ONLYOFFICE JWT", type: "password", optional: true },
      { key: "PortalOfficePreviewUrl", label: "文档预览服务地址", type: "text", optional: true, tip: "与 ONLYOFFICE 二选一即可" },
    ],
  },
  other: {
    title: "其他",
    fields: [
      { key: "ShowViewHistory", label: "在详情页显示修改历史", type: "boolean" },
      { key: "PortalUploadMaxSize", label: "文件上传大小限制 (MB)", type: "number", optional: true },
      { key: "PortalBaiduMapAk", label: "百度地图 AK", type: "text", optional: true },
    ],
  },
};

export default function AdminSystemCfgPage() {
  const [settings, setSettings] = useState<Record<string, string | boolean | number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [maintenanceInfo, setMaintenanceInfo] = useState<{ time?: string; reason?: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const raw = await api.getSystemSettings();
      if (raw && typeof raw === "object") {
        // Unwrap {error_code, data} wrapper if present (old API format)
        let d = raw as Record<string, unknown>;
        if ("error_code" in d && "data" in d && typeof d.data === "object" && d.data !== null) {
          d = d.data as Record<string, unknown>;
        }
        const s: Record<string, string | boolean | number> = {};
        Object.keys(SECTION_DEFINITIONS).forEach((section) => {
          SECTION_DEFINITIONS[section].fields.forEach((f) => {
            if (f.key in d) {
              s[f.key] = d[f.key] as string | boolean | number;
            }
          });
        });
        // Also get any extra keys from the response
        Object.keys(d).forEach((k) => {
          if (!(k in s) && typeof d[k] !== "object") {
            s[k] = d[k] as string | boolean | number;
          }
        });
        setSettings(s);
        if (d.Version) setVersion(d.Version as string);
        if (d.LicenseType) setLicenseType(d.LicenseType as string);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSystemSettings(settings);
      setEditing(false);
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleBackup = async () => {
    try {
      await api.post("/admin/system/backup-now");
      alert("备份任务已启动");
    } catch {
      alert("备份失败");
    }
  };

  const handleMaintenance = () => {
    const time = prompt("计划维护时间 (如: 2024-01-01 00:00 ~ 2024-01-01 06:00)");
    if (!time) return;
    const reason = prompt("维护原因") || "";
    setMaintenanceInfo({ time, reason });
  };

  const renderField = (field: Omit<ConfigSection, "value">) => {
    const value = settings[field.key];
    const displayValue = value === undefined || value === null || value === "" ? (field.optional ? "无" : "-") : String(value);

    if (!editing) {
      // Display mode
      if (field.type === "boolean") {
        return <span>{value ? "是" : "否"}</span>;
      }
      if (field.type === "select" && field.options) {
        const opt = field.options.find((o) => o.value === String(value));
        return <span>{opt?.label || displayValue}</span>;
      }
      if (field.type === "textarea") {
        return <span className="whitespace-pre-wrap">{displayValue}</span>;
      }
      return <span>{displayValue}</span>;
    }

    // Edit mode
    if (field.type === "boolean") {
      return (
        <select
          value={value ? "true" : "false"}
          onChange={(e) => updateSetting(field.key, e.target.value === "true")}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      );
    }
    if (field.type === "select" && field.options) {
      return (
        <select
          value={String(value || "")}
          onChange={(e) => updateSetting(field.key, e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if (field.type === "textarea") {
      return (
        <textarea
          value={String(value || "")}
          onChange={(e) => updateSetting(field.key, e.target.value)}
          rows={3}
          className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }
    if (field.type === "number") {
      return (
        <input
          type="number"
          value={String(value || "")}
          onChange={(e) => updateSetting(field.key, Number(e.target.value))}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
        />
      );
    }
    return (
      <input
        type={field.type === "password" ? "password" : "text"}
        value={String(value || "")}
        onChange={(e) => updateSetting(field.key, e.target.value)}
        className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统配置</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); loadSettings(); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              修改
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Config */}
        <div className="lg:col-span-3 space-y-6">
          {Object.entries(SECTION_DEFINITIONS).map(([sectionKey, section]) => (
            <div key={sectionKey} className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
              </div>
              <div className="px-6 py-4">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    {section.fields.map((field) => (
                      <tr key={field.key}>
                        <td className="py-3 text-sm text-gray-600 w-2/5 align-top">
                          <div>{field.label}</div>
                          {field.tip && <div className="text-xs text-gray-400 mt-0.5">{field.tip}</div>}
                        </td>
                        <td className="py-3 text-sm text-gray-800">
                          {renderField(field)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Version & License */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-bold text-gray-700">版本与授权</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">系统版本</span>
                <span className="font-medium">{version || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">授权类型</span>
                <span className="font-medium">{licenseType || "-"}</span>
              </div>
              <hr />
              <div className="space-y-1">
                <a href="/server-status" className="block text-blue-500 hover:underline">系统状态</a>
                <a href="https://marklume.cn/docs/" target="_blank" rel="noopener noreferrer" className="block text-blue-500 hover:underline">帮助文档</a>
                <a href="https://marklume.cn/" target="_blank" rel="noopener noreferrer" className="block text-blue-500 hover:underline">技术支持</a>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4">
              <button
                onClick={handleMaintenance}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                开启维护计划
              </button>
              {maintenanceInfo && (
                <div className="mt-3 text-sm space-y-1">
                  <div><span className="text-gray-500">计划维护时间:</span> {maintenanceInfo.time}</div>
                  <div><span className="text-gray-500">维护原因:</span> {maintenanceInfo.reason || "无"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-bold text-gray-700">快捷操作</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={handleBackup}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                立即备份数据库
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
