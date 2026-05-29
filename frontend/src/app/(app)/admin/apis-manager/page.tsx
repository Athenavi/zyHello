"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface ApiKey {
  id: string;
  appId: string;
  appSecret: string;
  bindUser?: string;
  bindRole?: string;
  ipWhitelist?: string;
  callCount?: number;
  createdOn?: string;
  [key: string]: unknown;
}

export default function AdminApisManagerPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBindUser, setNewBindUser] = useState("");
  const [newIpWhitelist, setNewIpWhitelist] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listApiKeys();
      if (Array.isArray(data)) {
        setKeys(data as ApiKey[]);
      } else if (data && typeof data === "object" && "data" in data) {
        setKeys(((data as Record<string, unknown>).data || []) as ApiKey[]);
      } else {
        setKeys([]);
      }
    } catch {
      setKeys([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createApiKey({
        bindUser: newBindUser || undefined,
        ipWhitelist: newIpWhitelist || undefined,
      });
      setShowCreate(false);
      setNewBindUser("");
      setNewIpWhitelist("");
      fetchKeys();
    } catch {
      alert("创建失败");
    }
    setCreating(false);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm(`确定要删除 API Key [${appId}] 吗？此操作不可恢复。`)) return;
    try {
      await api.deleteApiKey(appId);
      fetchKeys();
    } catch {
      alert("删除失败");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const maskSecret = (secret: string) => {
    if (!secret || secret.length <= 8) return secret;
    return secret.substring(0, 4) + "****" + secret.substring(secret.length - 4);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">OpenAPI 密钥</h1>
          <p className="text-sm text-gray-500 mt-1">管理 API 访问密钥，用于第三方系统集成</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加
        </button>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">APP ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">APP SECRET</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">绑定用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">IP 白名单</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">调用量 (90天)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div>
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <p>暂无 OpenAPI 密钥</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.appId || k.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-800">{k.appId}</span>
                        <button
                          onClick={() => copyToClipboard(k.appId, `id-${k.appId}`)}
                          className="text-gray-400 hover:text-gray-600"
                          title="复制"
                        >
                          {copiedId === `id-${k.appId}` ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-600">{maskSecret(k.appSecret)}</span>
                        <button
                          onClick={() => copyToClipboard(k.appSecret, `secret-${k.appId}`)}
                          className="text-gray-400 hover:text-gray-600"
                          title="复制完整密钥"
                        >
                          {copiedId === `secret-${k.appId}` ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{k.bindUser || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {k.ipWhitelist ? (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{k.ipWhitelist}</span>
                      ) : (
                        <span className="text-gray-400">不限</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{k.callCount ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(k.createdOn)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(k.appId)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">添加 OpenAPI 密钥</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">绑定用户</label>
                <input
                  type="text"
                  value={newBindUser}
                  onChange={(e) => setNewBindUser(e.target.value)}
                  placeholder="用户名 (可选，不填则使用管理员)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP 白名单</label>
                <input
                  type="text"
                  value={newIpWhitelist}
                  onChange={(e) => setNewIpWhitelist(e.target.value)}
                  placeholder="如: 192.168.1.* (可选，不填则不限制)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">多个 IP 用逗号分隔，支持通配符 *</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewBindUser(""); setNewIpWhitelist(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
