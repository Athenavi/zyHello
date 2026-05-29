"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface PicklistItem {
  id: string;
  text: string;
  code?: string;
  color?: string;
  isHide?: boolean;
  seq?: number;
}

function PicklistEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const field = searchParams.get("field") || "";
  const entity = searchParams.get("entity") || "";

  const [items, setItems] = useState<PicklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("#4A90D9");
  const [saving, setSaving] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!entity || !field) return;
    setLoading(true);
    try {
      const data = await api.get(`/admin/metadata/${entity}/field/${field}/picklist`);
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as PicklistItem[];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [entity, field]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/metadata/${entity}/field/${field}/picklist`, {
        text: newText,
        color: newColor,
      });
      setNewText("");
      fetchItems();
    } catch {
      alert("添加失败");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此选项？")) return;
    try {
      await api.post(`/admin/metadata/${entity}/field/${field}/picklist/delete`, { id });
      fetchItems();
    } catch {
      alert("删除失败");
    }
  };

  const handleToggleHide = async (item: PicklistItem) => {
    try {
      await api.post(`/admin/metadata/${entity}/field/${field}/picklist`, {
        id: item.id,
        text: item.text,
        isHide: !item.isHide,
      });
      fetchItems();
    } catch {
      alert("操作失败");
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/metadata/${entity}/field/${field}/picklist`, {
        ids: items.map((i) => i.id),
      });
      alert("排序已保存");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const activeItems = items.filter((i) => !i.isHide);
  const disabledItems = items.filter((i) => i.isHide);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-20">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">下拉列表编辑</h1>
          <p className="text-gray-500 mt-1 text-sm">
            字段: <span className="font-mono">{field}</span>
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Items */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold text-gray-700">选项列表</h2>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {activeItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无选项</p>
            ) : (
              activeItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded group">
                  <span className="mdi mdi-drag text-gray-400 cursor-grab"></span>
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color || "#4A90D9" }}
                  ></div>
                  <span className="text-sm flex-1">{item.text}</span>
                  {item.code && <span className="text-xs text-gray-400 font-mono">{item.code}</span>}
                  <button
                    onClick={() => handleToggleHide(item)}
                    className="text-gray-400 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"
                    title="停用"
                  >
                    <span className="mdi mdi-eye-off text-sm"></span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    title="删除"
                  >
                    <span className="mdi mdi-delete text-sm"></span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add form */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-8 h-8 border rounded cursor-pointer"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="输入选项名称"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newText.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* Disabled Items */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold text-gray-700">已停用选项</h2>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {disabledItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">无停用选项</p>
            ) : (
              disabledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded group">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 opacity-50"
                    style={{ backgroundColor: item.color || "#4A90D9" }}
                  ></div>
                  <span className="text-sm text-gray-500 line-through flex-1">{item.text}</span>
                  <button
                    onClick={() => handleToggleHide(item)}
                    className="text-gray-400 hover:text-green-500 opacity-0 group-hover:opacity-100 transition"
                    title="启用"
                  >
                    <span className="mdi mdi-eye text-sm"></span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    title="删除"
                  >
                    <span className="mdi mdi-delete text-sm"></span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSaveOrder}
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

export default function PicklistEditorPage() {
  return (
    <Suspense>
      <PicklistEditorContent />
    </Suspense>
  );
}
