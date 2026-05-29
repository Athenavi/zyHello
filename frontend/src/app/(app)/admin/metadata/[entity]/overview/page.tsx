"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

interface FieldInfo {
  fieldName: string;
  fieldLabel: string;
  displayType: string;
  nullable?: boolean;
  buildin?: boolean;
}

export default function EntityOverviewPage() {
  const { entity } = useParams<{ entity: string }>();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [entityInfo, setEntityInfo] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<"treemap" | "ergraph">("treemap");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, fieldsData] = await Promise.all([
        api.getEntityDetail(entity),
        api.getEntityFields(entity),
      ]);
      setEntityInfo(detail as Record<string, unknown>);
      const d = fieldsData as Record<string, unknown>;
      setFields((d.fields || d.data || fieldsData || []) as FieldInfo[]);
    } catch {
      setFields([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group fields by type for treemap visualization
  const fieldsByType = fields.reduce<Record<string, FieldInfo[]>>((acc, f) => {
    const t = f.displayType || "OTHER";
    if (!acc[t]) acc[t] = [];
    acc[t].push(f);
    return acc;
  }, {});

  const typeColors: Record<string, string> = {
    TEXT: "#3b82f6",
    NTEXT: "#6366f1",
    NUMBER: "#10b981",
    DECIMAL: "#14b8a6",
    DATE: "#f59e0b",
    DATETIME: "#f97316",
    TIME: "#fb923c",
    BOOL: "#8b5cf6",
    PICKLIST: "#ec4899",
    MULTISELECT: "#f43f5e",
    REFERENCE: "#06b6d4",
    N2NREFERENCE: "#0891b2",
    IMAGE: "#84cc16",
    FILE: "#a3e635",
    CLASSIFICATION: "#d946ef",
    SERIES: "#64748b",
    LOCATION: "#78716c",
    AVATAR: "#a78bfa",
    OTHER: "#94a3b8",
  };

  return (
    <div className="flex h-full">
      <EntitySidebar active="overview" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">技术全览</h1>
          <div className="flex bg-white rounded-lg border overflow-hidden">
            <button
              onClick={() => setActiveTab("treemap")}
              className={`px-4 py-1.5 text-sm ${activeTab === "treemap" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              字段分布
            </button>
            <button
              onClick={() => setActiveTab("ergraph")}
              className={`px-4 py-1.5 text-sm border-l ${activeTab === "ergraph" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              ER关系图
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <span className="mdi mdi-loading mdi-spin text-2xl"></span>
            </div>
          ) : activeTab === "treemap" ? (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-medium text-gray-700 mb-4">字段类型分布 ({fields.length} 个字段)</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(fieldsByType).map(([type, items]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: typeColors[type] || typeColors.OTHER }}></div>
                    <span className="text-xs text-gray-600">
                      {type} ({items.length})
                    </span>
                  </div>
                ))}
              </div>

              {/* Treemap visualization */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(fieldsByType).map(([type, items]) => (
                  <div
                    key={type}
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: `${typeColors[type] || typeColors.OTHER}15`,
                      borderColor: `${typeColors[type] || typeColors.OTHER}30`,
                    }}
                  >
                    <div className="text-sm font-bold" style={{ color: typeColors[type] || typeColors.OTHER }}>
                      {type}
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{items.length}</div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 5).map((f) => (
                        <div key={f.fieldName} className="text-xs text-gray-500 truncate">
                          {f.fieldLabel}
                        </div>
                      ))}
                      {items.length > 5 && <div className="text-xs text-gray-400">+{items.length - 5} 更多</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fields detail table */}
              <div className="mt-8">
                <h2 className="text-sm font-medium text-gray-700 mb-3">字段列表</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">字段名称</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">内部标识</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">允许为空</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">内置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fields.map((f) => (
                        <tr key={f.fieldName} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{f.fieldLabel}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{f.fieldName}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{f.displayType}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {f.nullable !== false ? (
                              <span className="mdi mdi-check text-green-500"></span>
                            ) : (
                              <span className="mdi mdi-close text-gray-300"></span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {f.buildin ? <span className="mdi mdi-check text-yellow-500"></span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-medium text-gray-700 mb-4">ER 关系图</h2>
              <div className="border-2 border-dashed border-gray-200 rounded-lg" style={{ height: "600px" }}>
                <iframe
                  src={`/admin/metadata/entity-overview?entity=${entity}&mode=ergraph`}
                  className="w-full h-full border-0"
                  title="ER Graph"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
