"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface FilterField {
  field: string;
  label: string;
  type?: string;
  op?: string;
}

export default function ListFilterpanePage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;

  const [fields, setFields] = useState<FilterField[]>([]);
  const [allFields, setAllFields] = useState<{ name: string; label: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [filterpaneData, fieldsData] = await Promise.all([
        api.getListFilterpane(entity),
        api.listEntityFields(entity),
      ]);
      const fd = filterpaneData as Record<string, unknown>;
      setFields((fd.data || fd.items || filterpaneData || []) as FilterField[]);

      const fld = fieldsData as Record<string, unknown>;
      const fieldList = (fld.data || fld.items || fieldsData || []) as { name: string; label: string; type: string }[];
      setAllFields(Array.isArray(fieldList) ? fieldList : []);
    } catch {
      setFields([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    if (allFields.length === 0) return;
    const firstField = allFields[0];
    setFields([...fields, { field: firstField.name, label: firstField.label, type: firstField.type }]);
  };

  const handleUpdate = (index: number, fieldName: string) => {
    const f = allFields.find((af) => af.name === fieldName);
    if (!f) return;
    const updated = [...fields];
    updated[index] = { field: f.name, label: f.label, type: f.type };
    setFields(updated);
  };

  const handleRemove = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveListFilterpane(entity, { fields: fields.map((f) => f.field) });
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
          <h1 className="text-xl font-bold text-gray-800">查询字段配置</h1>
          <p className="text-gray-500 mt-1 text-sm">实体: {entity}</p>
        </div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <span className="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">查询字段列表</h2>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
          >
            <span className="mdi mdi-plus mr-1"></span>
            添加
          </button>
        </div>
        <div className="p-4 space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无查询字段，点击"添加"配置</p>
          ) : (
            fields.map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="mdi mdi-drag text-gray-400 cursor-grab"></span>
                <span className="text-sm text-gray-500 w-8">{idx + 1}</span>
                <select
                  className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={f.field}
                  onChange={(e) => handleUpdate(idx, e.target.value)}
                >
                  {allFields.map((af) => (
                    <option key={af.name} value={af.name}>
                      {af.label} ({af.name})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">{f.type}</span>
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
