"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "500";
  const message = searchParams.get("message") || "";

  const errorMap: Record<string, { title: string; desc: string }> = {
    "400": { title: "请求错误", desc: "你的请求无法被服务器理解，请检查请求参数。" },
    "401": { title: "未授权", desc: "你尚未登录或登录已过期，请重新登录。" },
    "403": { title: "禁止访问", desc: "你没有权限访问此页面，请联系管理员。" },
    "404": { title: "页面未找到", desc: "你访问的页面不存在，请检查 URL 是否正确。" },
    "500": { title: "服务器错误", desc: "服务器内部错误，请稍后再试。" },
    "502": { title: "网关错误", desc: "网关或代理服务器收到无效响应。" },
    "503": { title: "服务不可用", desc: "服务器暂时无法处理请求，请稍后再试。" },
  };

  const info = errorMap[code] || {
    title: `错误 ${code}`,
    desc: message || "发生未知错误，请稍后再试。",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="text-center max-w-lg">
        <div className="text-9xl font-bold text-gray-200 select-none mb-4">
          {code}
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">{info.title}</h1>
        <p className="text-gray-500 mb-2">{info.desc}</p>
        {message && (
          <p className="text-sm text-gray-400 mb-6 font-mono bg-gray-100 p-3 rounded-lg inline-block">
            {message}
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            返回首页
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            返回上页
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
