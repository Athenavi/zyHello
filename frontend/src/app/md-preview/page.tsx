"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

function MdPreviewContent() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Markdown 编辑器");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const id = searchParams.get("id") || "";
  const editable = searchParams.get("editable") !== "false";

  useEffect(() => {
    if (id) {
      loadContent();
    }
  }, [id]);

  const loadContent = async () => {
    try {
      const { default: api } = await import("@/lib/api");
      const data = await api.request(`/filex/md/${id}`) as { content?: string; name?: string };
      setContent(data.content || "");
      setTitle(data.name || "Markdown 编辑器");
    } catch {
      setContent("# 加载失败");
    }
  };

  const renderPreview = async (md: string) => {
    try {
      const { marked } = await import("marked");
      const html = await marked(md);
      setPreviewHtml(html as string);
    } catch {
      setPreviewHtml(`<p>${md}</p>`);
    }
  };

  useEffect(() => {
    renderPreview(content);
  }, [content]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { default: api } = await import("@/lib/api");
      await api.post(`/filex/md/${id}`, { content });
      setEditMode(false);
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setContent((prev) => prev.substring(0, start) + "  " + prev.substring(end));
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b bg-gray-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                editMode ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {editMode ? "预览模式" : "编辑模式"}
            </button>
          )}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {editMode ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 border-r">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 text-sm font-mono resize-none focus:outline-none"
              placeholder="输入 Markdown 内容..."
              spellCheck={false}
            />
          </div>
          {/* Preview */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="prose prose-sm max-w-none p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div
            className="prose prose-sm max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}
    </div>
  );
}

export default function MdPreviewPage() {
  return (
    <Suspense>
      <MdPreviewContent />
    </Suspense>
  );
}
