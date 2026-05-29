"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function FramePage() {
  return (
    <Suspense>
      <FrameContent />
    </Suspense>
  );
}

function FrameContent() {
  const searchParams = useSearchParams();
  const [frameUrl, setFrameUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    setFrameUrl(searchParams.get("url") || "");
    setTitle(searchParams.get("title") || "嵌入页面");
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b bg-gray-50 flex items-center px-4">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-700 mr-3"
          title="返回"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-medium text-gray-700 truncate">{title}</h1>
        {frameUrl && (
          <a
            href={frameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-600 hover:text-blue-800"
          >
            在新窗口打开 ↗
          </a>
        )}
      </div>

      {/* iframe */}
      <div className="flex-1">
        {frameUrl ? (
          <iframe
            src={frameUrl}
            className="w-full h-full border-0"
            allow="fullscreen; clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">未指定页面地址</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
