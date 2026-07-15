"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [vcode, setVcode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  // Auto-generate username from full name
  const handleFullNameBlur = useCallback(async () => {
    if (!fullName || username) return;
    try {
      const res = await api.checkoutName(fullName);
      if (res.data) setUsername(res.data);
    } catch {
      // ignore
    }
  }, [fullName, username]);

  const handleSendVcode = async () => {
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    setError("");
    setSending(true);
    try {
      await api.sendSignupEmailVcode(email);
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("请输入姓名");
    if (!username.trim()) return setError("请输入用户名");
    if (!email.trim()) return setError("请输入邮箱");
    if (!vcode.trim()) return setError("请输入邮箱验证码");

    setLoading(true);
    try {
      await api.signupConfirm({
        login_name: username,
        full_name: fullName,
        email: email,
        vcode: vcode,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header accent */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />

          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">ZyHello</h1>
              <p className="text-gray-500 mt-2">创建新账号</p>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  注册信息已提交
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  审核结果将通过邮件通知你
                </p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  返回登录
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={handleFullNameBlur}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                    placeholder="请输入真实姓名"
                    autoComplete="name"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    管理员将审核你的注册信息，请正确填写
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                    placeholder="请输入用户名"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                    placeholder="请输入邮箱"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱验证码
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={vcode}
                      onChange={(e) => setVcode(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                      placeholder="请输入验证码"
                      autoComplete="one-time-code"
                    />
                    <button
                      type="button"
                      onClick={handleSendVcode}
                      disabled={sending || countdown > 0}
                      className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                    >
                      {countdown > 0
                        ? `重新获取 (${countdown}s)`
                        : sending
                          ? "发送中..."
                          : "获取验证码"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? "提交中..." : "提交注册"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <span>已有账号？</span>
              <Link
                href="/login"
                className="text-amber-600 hover:text-amber-700 font-medium ml-1"
              >
                返回登录
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
