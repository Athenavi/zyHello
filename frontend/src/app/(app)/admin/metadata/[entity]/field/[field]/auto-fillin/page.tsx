"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import EntitySidebar from "@/components/EntitySidebar";

interface AutoFillinItem {
  id: string;
  sourceField: string;
  targetField: string;
  extConfig?: Record<string, unknown>;
}

export default function AutoFillinPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;
  const field = params.field as string;

  const [items, setItems] = useState<AutoFillinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceEntity, setReferenceEntity] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<AutoFillinItem | null>(null);
  const [formSourceField, setFormSourceField] = useState("");
  const [formTargetField, setFormTargetField] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAutoFillins(entity, field);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as AutoFillinItem[];
      setItems(Array.isArray(list) ? list : []);
      if (d.referenceEntity) setReferenceEntity(d.referenceEntity as string);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [entity, field]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = () => {
    setEditItem(null);
    setFormSourceField("");
    setFormTargetField("");
    setShowDialog(true);
  };

  const handleEdit = (item: AutoFillinItem) => {
    setEditItem(item);
    setFormSourceField(item.sourceField);
    setFormTargetField(item.targetField);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此回填规则？")) return;
    try {
      await api.deleteAutoFillin(entity, field, id);
      fetchItems();
    } catch {
      alert("删除失败");
    }
  };

  const handleSave = async () => {
    if (!formSourceField || !formTargetField) {
      alert("请填写源字段和目标字段");
      return;
    }
    setSaving(true);
    try {
      await api.saveAutoFillin(entity, field, {
        id: editItem?.id,
        sourceField: formSourceField,
        targetField: formTargetField,
      });
      setShowDialog(false);
      fetchItems();
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full">
      <EntitySidebar active="fields" />

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b mb-4">
            <button
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
              onClick={() => router.push(`/admin/metadata/${entity}/fields`)}
            >
              字段信息
            </button>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              表单回填
            </button>
          </div>

          {/* Entity Info */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{entity}</span>
              <span className="mdi mdi-arrow-right text-gray-400"></span>
              <span className="text-sm font-medium text-gray-800">{field}</span>
              {referenceEntity && (
                <>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{referenceEntity}</span>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">回填规则</h2>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
              >
                <span className="mdi mdi-plus mr-1"></span>
                添加
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">目标字段</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">源字段</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">回填规则</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" style={{ width: "100px" }}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">加载中...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">暂无回填规则</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.targetField}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.sourceField}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:underline text-xs mr-2"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:underline text-xs"
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
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[80vh] overflow-auto">
            <div className="p-4 border-b">
              <h3 className="text-base font-bold text-gray-800">
                {editItem ? "编辑回填规则" : "添加回填规则"}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">目标字段 (当前实体)</label>
                <input
                  type="text"
                  className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formTargetField}
                  onChange={(e) => setFormTargetField(e.target.value)}
                  placeholder="目标字段名"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">源字段 (引用实体)</label>
                <input
                  type="text"
                  className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formSourceField}
                  onChange={(e) => setFormSourceField(e.target.value)}
                  placeholder="源字段名"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "保存中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
