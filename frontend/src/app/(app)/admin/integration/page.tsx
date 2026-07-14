"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminIntegrationPage() {
  const [systemConfig, setSystemConfig] = useState<Record<string, unknown>>({});
  const [storageConfig, setStorageConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("system");

  useEffect(() => {
    Promise.all([
      api.getSystemConfig().catch(() => ({})),
      api.getStorageConfig().catch(() => ({})),
    ]).then(([sys, storage]) => {
      // API returns {error_code: 0, data: {...}} — extract the data field
      const sysData = ((sys as Record<string, unknown>)?.data || sys || {}) as Record<string, unknown>;
      const storageData = ((storage as Record<string, unknown>)?.data || storage || {}) as Record<string, unknown>;
      setSystemConfig(sysData);
      setStorageConfig(storageData);
      setLoading(false);
    });
  }, []);

  const tabs = [
    { key: "system", label: "系统配置" },
    { key: "storage", label: "存储配置" },
    { key: "dingtalk", label: "钉钉" },
    { key: "wxwork", label: "企业微信" },
    { key: "feishu", label: "飞书" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统集成</h1>
        <p className="text-gray-500 mt-1">管理系统配置和第三方集成</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-100 rounded" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {activeTab === "system" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  系统配置
                </h3>
                <a
                  href="/admin/system-cfg"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  前往修改
                </a>
              </div>
              <div className="space-y-4">
                {Object.keys(systemConfig).length === 0 ? (
                  <p className="text-gray-400">暂无系统配置</p>
                ) : (
                  Object.entries(systemConfig).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 border-b border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-600">
                        {key}
                      </span>
                      <span className="text-sm text-gray-800 font-mono">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "-")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "storage" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                存储配置
              </h3>
              <div className="space-y-4">
                {Object.keys(storageConfig).length === 0 ? (
                  <p className="text-gray-400">暂无存储配置</p>
                ) : (
                  Object.entries(storageConfig).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 border-b border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-600">
                        {key}
                      </span>
                      <span className="text-sm text-gray-800 font-mono truncate max-w-xs">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "-")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(activeTab === "dingtalk" ||
            activeTab === "wxwork" ||
            activeTab === "feishu") && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {tabs.find((t) => t.key === activeTab)?.label} 集成
              </h3>
              <p className="text-gray-500 mb-4">
                请前往专用配置页面设置参数
              </p>
              <a
                href={`/admin/integration/${activeTab}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                前往 {tabs.find((t) => t.key === activeTab)?.label} 配置
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
