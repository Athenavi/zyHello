"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function OoPreviewContent() {
  const searchParams = useSearchParams();
  const [fileUrl, setFileUrl] = useState("");
  const [title, setTitle] = useState("Office 文档预览");

  const url = searchParams.get("url") || "";
  const name = searchParams.get("name") || "";

  useEffect(() => {
    if (url) {
      setFileUrl(decodeURIComponent(url));
    }
    if (name) {
      setTitle(decodeURIComponent(name));
    }
  }, [url, name]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b bg-gray-50 flex items-center px-4">
        <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-700 mr-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-medium text-gray-700 truncate">{title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1">
        {fileUrl ? (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">未指定文档地址</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OoPreviewPage() {
  return (
    <Suspense>
      <OoPreviewContent />
    </Suspense>
  );
}
