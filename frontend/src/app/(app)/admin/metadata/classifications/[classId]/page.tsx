"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface ClassificationItem {
  id: string;
  name: string;
  code?: string;
  parent?: string;
  level?: number;
  fullName?: string;
  isHide?: boolean;
  children?: ClassificationItem[];
}

export default function ClassificationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [name, setName] = useState("");
  const [openLevel, setOpenLevel] = useState(3);
  const [items, setItems] = useState<ClassificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemParent, setNewItemParent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClassification = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getClassification(classId);
      const d = data as Record<string, unknown>;
      setName((d.name as string) || "");
      setOpenLevel((d.openLevel as number) || 3);
      setItems((d.items as ClassificationItem[]) || []);
    } catch (e) {
      console.error("Failed to load classification", e);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    fetchClassification();
  }, [fetchClassification]);

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    setSaving(true);
    try {
      await api.saveClassification({
        id: classId,
        items: [...items, { name: newItemName, code: newItemCode, parent: newItemParent }],
      });
      setShowAddDialog(false);
      setNewItemName("");
      setNewItemCode("");
      setNewItemParent("");
      fetchClassification();
    } catch {
      alert("添加失败");
    }
    setSaving(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("确定删除此分类项？")) return;
    try {
      await api.post(`/admin/metadata/classification/${classId}/item-delete`, { id: itemId });
      fetchClassification();
    } catch {
      alert("删除失败");
    }
  };

  const handleImport = () => {
    alert("导入功能将在后续版本中实现");
  };

  const renderItems = (items: ClassificationItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} className={`${level > 0 ? "ml-6" : ""}`}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded group">
          {item.children && item.children.length > 0 && (
            <span className="mdi mdi-chevron-right text-gray-400 text-sm"></span>
          )}
          <span className="mdi mdi-tag-outline text-gray-400 text-sm"></span>
          <span className="text-sm text-gray-800">{item.name}</span>
          {item.code && (
            <span className="text-xs text-gray-400 font-mono">({item.code})</span>
          )}
          {item.isHide && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-500 rounded">隐藏</span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => {
                setNewItemParent(item.id);
                setShowAddDialog(true);
              }}
              className="text-gray-400 hover:text-blue-600 p-1"
              title="添加子项"
            >
              <span className="mdi mdi-plus text-sm"></span>
            </button>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-gray-400 hover:text-red-600 p-1"
              title="删除"
            >
              <span className="mdi mdi-delete text-sm"></span>
            </button>
          </div>
        </div>
        {item.children && item.children.length > 0 && renderItems(item.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-20">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/metadata/classifications")} className="text-gray-400 hover:text-gray-600">
            <span className="mdi mdi-arrow-left text-xl"></span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{name || "分类数据"}</h1>
            <p className="text-gray-500 mt-1">展开级别: {openLevel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition"
          >
            <span className="mdi mdi-import mr-1"></span>
            导入
          </button>
          <button
            onClick={() => { setNewItemParent(""); setShowAddDialog(true); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            <span className="mdi mdi-plus mr-1"></span>
            添加
          </button>
        </div>
      </div>

      {/* Items Tree */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="mdi mdi-tag-multiple text-4xl mb-2 block"></span>
              <p className="text-sm">暂无分类项，请点击"添加"开始创建</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {renderItems(items)}
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[400px]">
            <div className="p-4 border-b">
              <h3 className="text-base font-bold text-gray-800">添加分类项</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">名称 *</label>
                <input
                  type="text"
                  className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="分类项名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">编码</label>
                <input
                  type="text"
                  className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowAddDialog(false); setNewItemParent(""); setNewItemName(""); setNewItemCode(""); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
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
