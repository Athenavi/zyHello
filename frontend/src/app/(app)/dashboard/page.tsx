"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEntities()
      .then((data) => setEntities(Array.isArray(data) ? data : []))
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          欢迎回来，{user?.full_name || user?.login_name}
        </h1>
        <p className="text-gray-500 mt-1">Rebuild 业务管理系统仪表盘</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-sm text-gray-500">业务实体</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {loading ? "..." : entities.length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-sm text-gray-500">系统状态</div>
          <div className="text-3xl font-bold text-green-600 mt-1">正常</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-sm text-gray-500">用户</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">
            {user?.login_name}
          </div>
        </div>
      </div>

      {/* Entity quick access */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">业务实体</h2>
        {loading ? (
          <div className="text-gray-400">加载中...</div>
        ) : entities.length === 0 ? (
          <div className="text-gray-400">暂无实体数据</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {entities.map((entity, idx) => (
              <a
                key={idx}
                href={`/entities/${String((entity as Record<string, unknown>).entity || (entity as Record<string, unknown>).name || "")}`}
                className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
              >
                <div className="text-sm font-medium text-gray-800">
                  {String(
                    (entity as Record<string, unknown>).entityLabel ||
                    (entity as Record<string, unknown>).label ||
                    (entity as Record<string, unknown>).entity ||
                    (entity as Record<string, unknown>).name ||
                    "未命名"
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {String(
                    (entity as Record<string, unknown>).entity ||
                    (entity as Record<string, unknown>).name ||
                    ""
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
