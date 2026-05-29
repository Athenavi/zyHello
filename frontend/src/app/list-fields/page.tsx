"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
  displayType?: string;
}

interface ListFieldsModalProps {
  entity: string;
  selected: string[];
  allFields: EntityField[];
  onClose: () => void;
  onSave: (names: string[]) => void;
  shareToAll?: boolean;
}

function ListFieldsModal({ entity, selected, allFields, onClose, onSave, shareToAll }: ListFieldsModalProps) {
  const [showFields, setShowFields] = useState<string[]>([...selected]);
  const [hideFields, setHideFields] = useState<string[]>(
    allFields.filter((f) => !selected.includes(f.field || f.name || "")).map((f) => f.field || f.name || "")
  );
  const [dragItem, setDragItem] = useState<string | null>(null);

  const getFieldLabel = (name: string) => {
    const f = allFields.find((f) => (f.field || f.name) === name);
    return f ? (f.fieldLabel || f.label || name) : name;
  };

  const addToShow = (name: string) => {
    setHideFields((prev) => prev.filter((n) => n !== name));
    setShowFields((prev) => [...prev, name]);
  };

  const addToHide = (name: string) => {
    setShowFields((prev) => prev.filter((n) => n !== name));
    setHideFields((prev) => [...prev, name]);
  };

  const moveField = (name: string, direction: "up" | "down") => {
    setShowFields((prev) => {
      const idx = prev.indexOf(name);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleDragStart = (name: string) => setDragItem(name);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (target: string) => {
    if (!dragItem || dragItem === target) return;
    setShowFields((prev) => {
      const without = prev.filter((n) => n !== dragItem);
      const targetIdx = without.indexOf(target);
      if (targetIdx === -1) return prev;
      without.splice(targetIdx, 0, dragItem);
      return without;
    });
    setDragItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">列显示配置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex gap-6">
            {/* Show fields */}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">显示列（拖拽排序）</h4>
              <div className="border rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
                {showFields.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">暂无显示列</div>
                ) : (
                  showFields.map((name) => (
                    <div
                      key={name}
                      draggable
                      onDragStart={() => handleDragStart(name)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(name)}
                      className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-blue-50 cursor-grab active:cursor-grabbing"
                    >
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      <span className="text-sm flex-1 truncate">{getFieldLabel(name)}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveField(name, "up")} className="p-0.5 text-gray-400 hover:text-blue-600" title="上移">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => moveField(name, "down")} className="p-0.5 text-gray-400 hover:text-blue-600" title="下移">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => addToHide(name)} className="p-0.5 text-gray-400 hover:text-red-600" title="隐藏">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Hide fields */}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">隐藏列</h4>
              <div className="border rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
                {hideFields.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">暂无隐藏列</div>
                ) : (
                  hideFields.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-600 truncate">{getFieldLabel(name)}</span>
                      <button onClick={() => addToShow(name)} className="p-0.5 text-gray-400 hover:text-blue-600" title="显示">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            取消
          </button>
          <button onClick={() => onSave(showFields)} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function ListFieldsContent() {
  const searchParams = useSearchParams();
  const [entity, setEntity] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [allFields, setAllFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const e = searchParams.get("entity") || "";
    const fields = searchParams.get("fields") || "";
    setEntity(e);
    if (fields) setSelected(fields.split(","));

    if (e) {
      api.getFields(e).then((data) => {
        const list = Array.isArray(data) ? data : ((data as Record<string, unknown>).fields || []);
        setAllFields(list as EntityField[]);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handleSave = (names: string[]) => {
    // Send back to opener
    if (window.opener) {
      window.opener.postMessage({ type: "list-fields-saved", entity, fields: names }, "*");
    }
    // Also try URL-based callback
    const callback = searchParams.get("callback");
    if (callback) {
      window.location.href = `${callback}?fields=${names.join(",")}`;
    } else {
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ListFieldsModal
      entity={entity}
      selected={selected}
      allFields={allFields}
      onClose={() => window.close()}
      onSave={handleSave}
    />
  );
}

export default function ListFieldsPage() {
  return (
    <Suspense>
      <ListFieldsContent />
    </Suspense>
  );
}
