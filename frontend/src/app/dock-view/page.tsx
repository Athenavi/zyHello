"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function DockViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [iframeUrl, setIframeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const entity = searchParams.get("entity") || "";
    const id = searchParams.get("id") || "";
    const t = searchParams.get("title") || "";

    if (entity && id) {
      setIframeUrl(`/entities/${entity}/${id}`);
      setTitle(t || `${entity} 详情`);
    } else {
      const url = searchParams.get("url") || "";
      if (url) {
        setIframeUrl(decodeURIComponent(url));
        setTitle(t || "详情");
      }
    }
  }, [searchParams]);

  return (
    <div className={`flex flex-col ${maximized ? "fixed inset-0 z-50 bg-white" : "min-h-screen bg-gray-50"}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.close();
                }
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-sm font-medium text-gray-700 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            {iframeUrl && (
              <a
                href={iframeUrl}
                target="_blank"
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="在新窗口打开"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={() => setMaximized(!maximized)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title={maximized ? "还原" : "最大化"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {maximized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Quick filter tabs */}
      <div className="flex-shrink-0 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0">
            {["基本信息", "相关记录", "修改历史"].map((tab) => (
              <button
                key={tab}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-blue-500 transition"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">未指定内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DockViewPage() {
  return (
    <Suspense>
      <DockViewContent />
    </Suspense>
  );
}
