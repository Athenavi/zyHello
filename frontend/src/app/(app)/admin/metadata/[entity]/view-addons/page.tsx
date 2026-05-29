"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface AddonItem {
  id: string;
  name: string;
  entity: string;
  enabled: boolean;
}

function ViewAddonsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const entity = params.entity as string;
  const type = searchParams.get("type") || "TAB";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shown, setShown] = useState<AddonItem[]>([]);
  const [hidden, setHidden] = useState<AddonItem[]>([]);

  // Extra options for TAB type
  const [relatedAutoHide, setRelatedAutoHide] = useState(false);
  const [relatedDefaultList, setRelatedDefaultList] = useState(false);
  const [relatedAutoExpand, setRelatedAutoExpand] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getViewAddons(entity, type);
      const data = res.data || (res as any) || {};
      const shownList: AddonItem[] = [];
      const hiddenList: AddonItem[] = [];
      const items = data.items || data.configs || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const addon: AddonItem = {
            id: item.id || item.entity || "",
            name: item.name || item.label || item.id || "",
            entity: item.entity || "",
            enabled: item.enabled !== false,
          };
          if (addon.enabled) {
            shownList.push(addon);
          } else {
            hiddenList.push(addon);
          }
        });
      }
      setShown(shownList);
      setHidden(hiddenList);

      if (type === "TAB") {
        setRelatedAutoHide(!!data.relatedAutoHide);
        setRelatedDefaultList(!!data.relatedDefaultList);
        setRelatedAutoExpand(!!data.relatedAutoExpand);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [entity, type]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const moveToHidden = (idx: number) => {
    const item = shown[idx];
    setShown((prev) => prev.filter((_, i) => i !== idx));
    setHidden((prev) => [...prev, { ...item, enabled: false }]);
  };

  const moveToShown = (idx: number) => {
    const item = hidden[idx];
    setHidden((prev) => prev.filter((_, i) => i !== idx));
    setShown((prev) => [...prev, { ...item, enabled: true }]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setShown((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    setShown((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: Record<string, any> = {
        items: shown.map((item) => ({ ...item, enabled: true })),
      };
      if (type === "TAB") {
        config.relatedAutoHide = relatedAutoHide;
        config.relatedDefaultList = relatedDefaultList;
        config.relatedAutoExpand = relatedAutoExpand;
      }
      await api.saveViewAddons(entity, type, config);
      window.close?.();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-800 mb-4">
          视图配置 ({type})
        </h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Shown column */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                  <h3 className="text-sm font-medium text-gray-700">
                    已显示
                  </h3>
                </div>
                <div className="p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {shown.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      无
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {shown.map((item, idx) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 group"
                        >
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => moveUp(idx)}
                              disabled={idx === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="上移"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveDown(idx)}
                              disabled={idx === shown.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="下移"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => moveToHidden(idx)}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="移除"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Hidden column */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                  <h3 className="text-sm font-medium text-gray-700">
                    未显示
                  </h3>
                </div>
                <div className="p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {hidden.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      无
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {hidden.map((item, idx) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 group"
                        >
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                          <button
                            onClick={() => moveToShown(idx)}
                            className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            添加
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Extra options for TAB type */}
            {type === "TAB" && (
              <div className="relative inline-block mb-4">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  ⚙ 更多选项
                </button>
                {showOptions && (
                  <div className="absolute left-0 top-8 bg-white border rounded-lg shadow-lg p-4 z-10 min-w-[240px]">
                    <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={relatedAutoHide}
                        onChange={(e) => setRelatedAutoHide(e.target.checked)}
                        className="rounded"
                      />
                      隐藏无记录项
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={relatedDefaultList}
                        onChange={(e) =>
                          setRelatedDefaultList(e.target.checked)
                        }
                        className="rounded"
                      />
                      默认列表视图
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={relatedAutoExpand}
                        onChange={(e) => setRelatedAutoExpand(e.target.checked)}
                        className="rounded"
                      />
                      自动展开记录 (卡片视图)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.close?.()}
                className="px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ViewAddonsPage() {
  return (
    <Suspense>
      <ViewAddonsContent />
    </Suspense>
  );
}
