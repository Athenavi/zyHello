"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface NavItem {
  id?: string;
  name: string;
  icon?: string;
  type: "ENTITY" | "URL";
  value?: string;
  entity?: string;
  url?: string;
  parentId?: string;
  shareToAll?: boolean;
  filterId?: string;
  children?: NavItem[];
}

function NavSettingsContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NavItem[]>([]);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entities, setEntities] = useState<{ name: string; label: string }[]>([]);
  const [editTab, setEditTab] = useState<"ENTITY" | "URL">("ENTITY");
  const [dragItem, setDragItem] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [navData, entitiesData] = await Promise.all([
        api.request("/nav-settings/items").catch(() => []),
        api.getEntities().catch(() => []),
      ]);
      setItems(Array.isArray(navData) ? navData as NavItem[] : []);
      setEntities(Array.isArray(entitiesData) ? entitiesData as { name: string; label: string }[] : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/nav-settings/items", items);
      if (window.opener) {
        window.opener.postMessage({ type: "nav-settings-saved" }, "*");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem: NavItem = {
      name: "新菜单项",
      type: "ENTITY",
      icon: "mdi-folder",
    };
    setItems((prev) => [...prev, newItem]);
    setEditing(newItem);
    setEditTab("ENTITY");
  };

  const handleDelete = (idx: number) => {
    if (!confirm("确定删除此菜单项？")) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (editing === items[idx]) setEditing(null);
  };

  const handleEdit = (item: NavItem, idx: number) => {
    setEditing({ ...item, _idx: idx } as NavItem & { _idx: number });
    setEditTab(item.type || "ENTITY");
  };

  const handleEditSave = () => {
    if (!editing) return;
    const idx = (editing as NavItem & { _idx: number })._idx;
    if (idx !== undefined) {
      setItems((prev) => {
        const next = [...prev];
        next[idx] = { ...editing };
        delete (next[idx] as Record<string, unknown>)._idx;
        return next;
      });
    }
    setEditing(null);
  };

  const handleDragStart = (idx: number) => setDragItem(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (dragItem === null || dragItem === targetIdx) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragItem, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragItem(null);
  };

  const moveItem = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Menu list */}
        <div className="w-2/5 border-r flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">菜单列表</h2>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + 添加
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                暂无菜单项，点击"添加"创建
              </div>
            ) : (
              <div className="p-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    onClick={() => handleEdit(item, idx)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition ${
                      editing && (editing as NavItem & { _idx: number })._idx === idx
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <svg className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    <span className={`mdi ${item.icon || "mdi-folder"} text-lg text-gray-500 flex-shrink-0`} />
                    <span className="text-sm text-gray-800 flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.type}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveItem(idx, "up"); }} className="p-0.5 text-gray-400 hover:text-blue-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveItem(idx, "down"); }} className="p-0.5 text-gray-400 hover:text-blue-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} className="p-0.5 text-gray-400 hover:text-red-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Edit panel */}
        <div className="w-3/5 flex flex-col overflow-hidden">
          {editing ? (
            <>
              <div className="p-4 border-b">
                <h3 className="text-base font-semibold text-gray-800">编辑菜单项</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Type tabs */}
                <div className="flex gap-1 border-b">
                  {(["ENTITY", "URL"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setEditTab(tab)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                        editTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
                      }`}
                    >
                      {tab === "ENTITY" ? "实体" : "URL链接"}
                    </button>
                  ))}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                  <div className="flex items-center gap-2">
                    <span className={`mdi ${editing.icon || "mdi-folder"} text-2xl text-gray-500`} />
                    <input
                      type="text"
                      value={editing.icon || ""}
                      onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="mdi-folder"
                    />
                    <a
                      href="/search-icon"
                      target="_blank"
                      className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      选择
                    </a>
                  </div>
                </div>

                {/* Entity tab content */}
                {editTab === "ENTITY" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">绑定实体</label>
                    <select
                      value={editing.entity || ""}
                      onChange={(e) => setEditing({ ...editing, entity: e.target.value, type: "ENTITY" })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- 选择实体 --</option>
                      <optgroup label="系统内置">
                        <option value="$FEEDS$">动态</option>
                        <option value="$FILEMRG$">文件</option>
                        <option value="$PROJECT$">项目</option>
                        <option value="$AUDITLOG$">审计日志</option>
                      </optgroup>
                      {entities.length > 0 && (
                        <optgroup label="业务实体">
                          {entities.map((e) => (
                            <option key={e.name} value={e.name}>{e.label || e.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Parent menu option */}
                    <div className="mt-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!editing.parentId}
                          onChange={(e) => setEditing({ ...editing, parentId: e.target.checked ? "root" : "" })}
                          className="rounded"
                        />
                        <span className="text-gray-700">设为子菜单</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* URL tab content */}
                {editTab === "URL" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL地址</label>
                    <input
                      type="url"
                      value={editing.url || ""}
                      onChange={(e) => setEditing({ ...editing, url: e.target.value, type: "URL" })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {/* Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">绑定过滤条件</label>
                  <input
                    type="text"
                    value={editing.filterId || ""}
                    onChange={(e) => setEditing({ ...editing, filterId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="过滤条件ID（可选）"
                  />
                </div>

                {/* Share */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editing.shareToAll}
                      onChange={(e) => setEditing({ ...editing, shareToAll: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-700">共享给所有用户</span>
                  </label>
                </div>
              </div>

              {/* Edit footer */}
              <div className="border-t px-4 py-3 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                  取消
                </button>
                <button onClick={handleEditSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
                  确定
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <p className="text-lg">选择左侧菜单项进行编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-4 py-3 flex justify-end gap-2 bg-gray-50">
        <button onClick={() => window.close()} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

export default function NavSettingsPage() {
  return (
    <Suspense>
      <NavSettingsContent />
    </Suspense>
  );
}
