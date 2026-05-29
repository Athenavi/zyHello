"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Classification {
  id: string;
  name: string;
  openLevel?: number;
  itemCount?: number;
}

export default function ClassificationsPage() {
  const router = useRouter();
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchClassifications();
  }, []);

  const fetchClassifications = async () => {
    setLoading(true);
    try {
      const data = await api.listClassifications();
      const d = data as Record<string, unknown>;
      const list = (d.data || d.items || data || []) as Classification[];
      setClassifications(Array.isArray(list) ? list : []);
    } catch {
      setClassifications([]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.saveClassification({ name: newName, openLevel: 3 });
      setShowCreate(false);
      setNewName("");
      fetchClassifications();
    } catch {
      alert("创建失败");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除分类数据 "${name}"？`)) return;
    try {
      await api.deleteClassification(id);
      fetchClassifications();
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">分类数据</h1>
          <p className="text-gray-500 mt-1">管理多级分类数据</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          <span className="mdi mdi-plus mr-1"></span>
          新建分类
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">加载中...</div>
      ) : classifications.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <span className="mdi mdi-tag-multiple text-5xl mb-3 block"></span>
          <p>暂无分类数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classifications.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/admin/metadata/classifications/${cls.id}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">
                  <span className="mdi mdi-tag mr-1 text-blue-500"></span>
                  {cls.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(cls.id, cls.name);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <span className="mdi mdi-delete text-sm"></span>
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  <span className="mdi mdi-layers mr-1"></span>
                  展开级别: {cls.openLevel ?? 3}
                </span>
                <span>
                  <span className="mdi mdi-format-list-bulleted mr-1"></span>
                  项目数: {cls.itemCount ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[400px]">
            <div className="p-4 border-b">
              <h3 className="text-base font-bold text-gray-800">新建分类数据</h3>
            </div>
            <div className="p-4">
              <label className="text-xs text-gray-500 block mb-1">名称</label>
              <input
                type="text"
                className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="分类数据名称"
                autoFocus
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {creating ? "创建中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
