"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

function AdminVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nexturl = searchParams.get("nexturl") || "/admin/system-cfg";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.adminVerify(password);
      if ((res as any)?.success || (res as any)?.error_code === 0) {
        router.replace(nexturl);
      } else {
        setError((res as any)?.error_msg || "验证失败");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "验证请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-blue-600">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h4 className="text-lg font-semibold text-gray-800 text-center">
                需要验证你的管理员身份
              </h4>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="登录密码"
                    autoComplete="off"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="mb-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm"
                  >
                    {loading ? "验证中..." : "确定"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense>
      <AdminVerifyContent />
    </Suspense>
  );
}
