"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminMetadataPage() {
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEntity, setNewEntity] = useState({ entityName: "", entityLabel: "" });
  const [creating, setCreating] = useState(false);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const data = await api.listEntities();
      const list = (data as Record<string, unknown>)?.data ?? data;
      setEntities(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleCreate = async () => {
    if (!newEntity.entityName || !newEntity.entityLabel) return;
    setCreating(true);
    try {
      await api.createEntity({
        entityName: newEntity.entityName,
        label: newEntity.entityLabel,
      });
      setShowCreate(false);
      setNewEntity({ entityName: "", entityLabel: "" });
      fetchEntities();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">元数据管理</h1>
          <p className="text-gray-500 mt-1">管理业务实体和字段定义</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          + 新建实体
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">新建实体</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="实体名称 (英文)"
              value={newEntity.entityName}
              onChange={(e) =>
                setNewEntity({ ...newEntity, entityName: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="显示名称"
              value={newEntity.entityLabel}
              onChange={(e) =>
                setNewEntity({ ...newEntity, entityLabel: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {creating ? "创建中..." : "确认创建"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Entity table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                实体名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                显示名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            ) : entities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  暂无实体
                </td>
              </tr>
            ) : (
              entities.map((entity, idx) => {
                const e = entity as Record<string, unknown>;
                const entityName = (e.entity_name || e.entity || e.name || "") as string;
                const label = (e.entity_label || e.entityLabel || e.label || entityName) as string;
                return (
                  <tr
                    key={idx}
                    onClick={() => window.location.href = `/admin/metadata/${entityName}/fields`}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 hover:text-blue-800">
                      {entityName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      业务实体
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        启用
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
