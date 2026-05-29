"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function UrlSafeContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [nosafe, setNosafe] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = searchParams.get("url") || "";
    const ns = searchParams.get("nosafe") === "true";
    setUrl(u);
    setNosafe(ns);
  }, [searchParams]);

  useEffect(() => {
    if (nosafe && url) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = url;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [nosafe, url]);

  const domain = url ? (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })() : "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          外部链接安全提示
        </h1>

        {/* URL info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">您即将离开本站，访问以下外部链接：</p>
          <div className="url text-blue-600 font-mono text-sm break-all bg-blue-50 rounded p-2 mt-2">
            {url || "未提供链接"}
          </div>
          {domain && (
            <p className="text-xs text-gray-400 mt-2">
              目标域名：{domain}
            </p>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
          <p className="text-sm text-yellow-800">
            ⚠️ 请注意：外部网站的内容不受本站控制，访问时请谨慎操作，注意保护个人信息安全。
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {nosafe ? (
            <>
              <button
                onClick={() => window.location.href = url}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                继续访问 ({countdown}s)
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                返回
              </button>
            </>
          ) : (
            <>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                继续访问
              </a>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                返回
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UrlSafePage() {
  return (
    <Suspense>
      <UrlSafeContent />
    </Suspense>
  );
}
