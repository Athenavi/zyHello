"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface AdminFunction {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

function NavSettingsAdminContent() {
  const [functions, setFunctions] = useState<AdminFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFunctions();
  }, []);

  const loadFunctions = async () => {
    try {
      const data = await api.request("/nav-settings/admin/functions") as unknown as AdminFunction[];
      setFunctions(Array.isArray(data) ? data : []);
    } catch {
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setFunctions((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/nav-settings/admin/functions", functions);
      if (window.opener) {
        window.opener.postMessage({ type: "nav-admin-saved" }, "*");
      }
      window.close();
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <h2 className="text-lg font-bold text-gray-800">管理员菜单配置</h2>
        <p className="text-sm text-gray-500 mt-1">选择要在导航菜单中显示的功能模块</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : functions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无可配置的功能模块</p>
          </div>
        ) : (
          <div className="space-y-2">
            {functions.map((func) => (
              <label
                key={func.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                  func.enabled ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={func.enabled}
                  onChange={() => handleToggle(func.id)}
                  className="rounded w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{func.name}</p>
                  {func.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{func.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-4 py-3 flex justify-end gap-2 bg-gray-50">
        <button
          onClick={() => window.close()}
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
  );
}

export default function NavSettingsAdminPage() {
  return (
    <Suspense>
      <NavSettingsAdminContent />
    </Suspense>
  );
}
