"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface ServerInfo {
  label: string;
  value: string;
  status?: "ok" | "warn" | "error";
}

export default function ServerStatusPage() {
  const [serverInfo, setServerInfo] = useState<ServerInfo[]>([]);
  const [runtimeInfo, setRuntimeInfo] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Try to get system config as a health check
      const data = await api.getSystemConfig();
      setOnline(true);
      setServerInfo([
        { label: "系统版本", value: data?.version || "N/A" },
        { label: "Java 版本", value: data?.javaVersion || "N/A" },
        { label: "操作系统", value: data?.osName || "N/A" },
        { label: "服务器时间", value: new Date().toLocaleString("zh-CN") },
      ]);
      setRuntimeInfo([
        { label: "内存使用", value: data?.memoryUsed || "N/A", status: "ok" },
        { label: "内存总量", value: data?.memoryTotal || "N/A" },
        { label: "CPU 核心数", value: data?.cpuCores || "N/A" },
        { label: "系统负载", value: data?.systemLoad || "N/A" },
      ]);
    } catch {
      setOnline(false);
      setServerInfo([]);
      setRuntimeInfo([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">服务器状态</h1>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </div>

      {/* Status indicator */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full ${
              loading
                ? "bg-yellow-400 animate-pulse"
                : online
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {loading ? "检测中..." : online ? "服务运行正常" : "服务不可用"}
            </h2>
            <p className="text-sm text-gray-500">
              上次检查: {new Date().toLocaleString("zh-CN")}
            </p>
          </div>
          {!loading && (
            <span
              className={`ml-auto px-3 py-1 text-sm rounded-full ${
                online
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {online ? "正常" : "异常"}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : online ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Server info */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700">服务器信息</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {serverInfo.map((info, idx) => (
                <div key={idx} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-gray-500">{info.label}</span>
                  <span className="text-sm font-medium text-gray-800">
                    {info.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Runtime info */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700">运行时信息</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {runtimeInfo.map((info, idx) => (
                <div key={idx} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-gray-500">{info.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {info.value}
                    </span>
                    {info.status === "ok" && (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                    {info.status === "warn" && (
                      <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                    {info.status === "error" && (
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            无法连接到服务器
          </h3>
          <p className="text-gray-500 text-sm">
            请检查后端服务是否正常运行
          </p>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-8">
        状态信息每 30 秒自动刷新
      </p>
    </div>
  );
}
