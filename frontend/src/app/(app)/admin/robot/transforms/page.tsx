"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Transform {
  id: string;
  name: string;
  sourceEntity: string;
  sourceEntityLabel?: string;
  targetEntity: string;
  targetEntityLabel?: string;
  enabled: boolean;
  modifiedOn?: string;
}

export default function TransformsPage() {
  const router = useRouter();
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [entities, setEntities] = useState<string[]>([]);

  const fetchTransforms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTransforms(selectedEntity === "ALL" ? undefined : selectedEntity);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as Transform[];
      setTransforms(list);
      const entitySet = new Set(list.map((t) => t.sourceEntity));
      setEntities(Array.from(entitySet).sort());
    } catch {
      setTransforms([]);
    }
    setLoading(false);
  }, [selectedEntity]);

  useEffect(() => {
    fetchTransforms();
  }, [fetchTransforms]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此记录转换？")) return;
    try {
      await api.delete(`/admin/robot/transform/${id}`);
      fetchTransforms();
    } catch {
      alert("删除失败");
    }
  };

  const filtered = transforms.filter(
    (t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Left sidebar - source entity filter */}
      <aside className="w-56 min-h-screen bg-white border-r flex-shrink-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold text-gray-800">源实体</h3>
        </div>
        <nav className="py-2">
          <button
            onClick={() => setSelectedEntity("ALL")}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
              selectedEntity === "ALL" ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="mdi mdi-view-list text-base"></span>
            全部实体
          </button>
          {entities.map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                selectedEntity === ent ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="mdi mdi-table text-base"></span>
              {ent}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">记录转换</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="查询..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => router.push("/admin/robot/transform-design/new")}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <span className="mdi mdi-plus"></span>
              添加
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">源实体</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">目标实体</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500" style={{ width: "80px" }}>启用</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "120px" }}>修改时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" style={{ width: "80px" }}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-loading mdi-spin text-2xl"></span>
                      <p className="mt-1 text-sm">加载中...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-transfer text-3xl"></span>
                      <p className="mt-2 text-sm">暂无记录转换</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((transform) => (
                    <tr key={transform.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => router.push(`/admin/robot/transform-design/${transform.id}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {transform.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{transform.sourceEntityLabel || transform.sourceEntity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{transform.targetEntityLabel || transform.targetEntity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`mdi ${transform.enabled ? "mdi-check-circle text-green-500" : "mdi-close-circle text-gray-300"} text-lg`}></span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{transform.modifiedOn || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => handleDelete(transform.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <span className="mdi mdi-delete text-base"></span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
