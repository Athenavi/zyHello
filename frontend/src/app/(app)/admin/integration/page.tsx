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
      setSystemConfig((sys || {}) as Record<string, unknown>);
      setStorageConfig((storage || {}) as Record<string, unknown>);
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                系统配置
              </h3>
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
              <p className="text-gray-400">
                请在系统配置中设置 {tabs.find((t) => t.key === activeTab)?.label} 相关参数
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
