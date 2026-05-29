"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface StatField {
  field: string;
  label: string;
  calcMode: string;
}

const CALC_MODES = [
  { value: "COUNT", label: "计数" },
  { value: "SUM", label: "求和" },
  { value: "AVG", label: "平均" },
  { value: "MAX", label: "最大" },
  { value: "MIN", label: "最小" },
];

export default function ListStatsPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;

  const [stats, setStats] = useState<StatField[]>([]);
  const [allFields, setAllFields] = useState<{ name: string; label: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, fieldsData] = await Promise.all([
        api.getListStats(entity),
        api.listEntityFields(entity),
      ]);
      const sd = statsData as Record<string, unknown>;
      setStats((sd.data || sd.items || statsData || []) as StatField[]);

      const fld = fieldsData as Record<string, unknown>;
      const fieldList = (fld.data || fld.items || fieldsData || []) as { name: string; label: string; type: string }[];
      setAllFields(Array.isArray(fieldList) ? fieldList : []);
    } catch {
      setStats([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    if (allFields.length === 0) return;
    const firstField = allFields[0];
    setStats([...stats, { field: firstField.name, label: firstField.label, calcMode: "COUNT" }]);
  };

  const handleUpdate = (index: number, updates: Partial<StatField>) => {
    const updated = [...stats];
    updated[index] = { ...updated[index], ...updates };
    if (updates.field) {
      const f = allFields.find((af) => af.name === updates.field);
      if (f) updated[index].label = f.label;
    }
    setStats(updated);
  };

  const handleRemove = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveListStats(entity, { stats });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400 py-20">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">统计列配置</h1>
          <p className="text-gray-500 mt-1 text-sm">实体: {entity}</p>
        </div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <span className="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">统计列列表</h2>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
          >
            <span className="mdi mdi-plus mr-1"></span>
            添加
          </button>
        </div>
        <div className="p-4 space-y-3">
          {stats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无统计列，点击"添加"配置</p>
          ) : (
            stats.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="mdi mdi-drag text-gray-400 cursor-grab"></span>
                <span className="text-sm text-gray-500 w-8">{idx + 1}</span>
                <select
                  className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={s.field}
                  onChange={(e) => handleUpdate(idx, { field: e.target.value })}
                >
                  {allFields.map((af) => (
                    <option key={af.name} value={af.name}>
                      {af.label} ({af.name})
                    </option>
                  ))}
                </select>
                <select
                  className="w-28 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={s.calcMode}
                  onChange={(e) => handleUpdate(idx, { calcMode: e.target.value })}
                >
                  {CALC_MODES.map((cm) => (
                    <option key={cm.value} value={cm.value}>{cm.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <span className="mdi mdi-delete text-sm"></span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-5 py-2 text-gray-600 border text-sm rounded-lg hover:bg-gray-50 transition"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
