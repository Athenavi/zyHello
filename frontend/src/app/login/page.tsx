"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

/* ── SSO Provider Icons ────────────────────────────────────────── */
const SSO_PROVIDERS = [
  { key: "dingtalk", label: "钉钉", href: "/user/sso?protocol=dingtalk", color: "#0089FF" },
  { key: "wxwork", label: "企业微信", href: "/user/sso?protocol=wxwork", color: "#07C160" },
  { key: "feishu", label: "飞书", href: "/user/sso?protocol=feishu", color: "#3370FF" },
];

/* ── Login Page ────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaUrl, setCaptchaUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [ssoProviders, setSsoProviders] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const captchaImgRef = useRef<HTMLImageElement>(null);

  // Load initial data
  useEffect(() => {
    // Check remembered username
    const rememberedUser = localStorage.getItem("remembered_user");
    if (rememberedUser) {
      setUsername(rememberedUser);
      setRememberMe(true);
    }

    // Fetch SSO providers
    api.getSsoProviders().then((data) => {
      const providers = data?.data || data;
      if (Array.isArray(providers)) {
        setSsoProviders(providers);
      } else if (providers && typeof providers === "object") {
        setSsoProviders(Object.keys(providers).filter((k) => providers[k]));
      }
    }).catch(() => {});

    // Fetch announcement
    api.getLoginAnnouncement().then((data) => {
      const msg = data?.msg || data?.data?.msg;
      if (msg) setAnnouncement(msg);
    }).catch(() => {});

    // Check if captcha is needed (try to load captcha image)
    refreshCaptcha();
  }, []);

  const refreshCaptcha = () => {
    const url = api.getCaptchaUrl();
    setCaptchaUrl(url);
    // Pre-check if captcha endpoint returns an image
    fetch(url, { method: "HEAD" })
      .then((res) => {
        setShowCaptcha(res.ok && res.headers.get("content-type")?.includes("image"));
      })
      .catch(() => setShowCaptcha(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password, showCaptcha ? captcha : undefined);

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("remembered_user", username);
      } else {
        localStorage.removeItem("remembered_user");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "登录失败";
      setError(msg);
      if (showCaptcha) refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = (href: string) => {
    window.location.href = href;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-100 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 px-4">
        {/* Announcement banner */}
        {announcement && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span dangerouslySetInnerHTML={{ __html: announcement }} />
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Rebuild</h1>
            <p className="text-gray-500 mt-1 text-sm">业务管理系统</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名 (或邮箱)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                  placeholder="请输入用户名"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                  placeholder="请输入密码"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Captcha */}
            {showCaptcha && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                    placeholder="请输入验证码"
                    maxLength={6}
                    autoComplete="off"
                  />
                  <div
                    className="flex-shrink-0 w-28 h-10 bg-gray-100 rounded-lg overflow-hidden cursor-pointer border border-gray-300 hover:border-blue-400 transition-colors flex items-center justify-center"
                    onClick={refreshCaptcha}
                    title="点击刷新验证码"
                  >
                    {captchaUrl ? (
                      <img
                        ref={captchaImgRef}
                        src={captchaUrl}
                        alt="验证码"
                        className="w-full h-full object-cover"
                        onError={() => setShowCaptcha(false)}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">加载中...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded transition-all peer-checked:border-blue-600 peer-checked:bg-blue-600 group-hover:border-blue-400">
                    {rememberMe && (
                      <svg className="w-3 h-3 text-white m-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">记住登录</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                找回密码
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                "登 录"
              )}
            </button>

            {/* Signup link */}
            <div className="text-center text-sm text-gray-500">
              还没有账号？
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium ml-1 transition-colors">
                立即注册
              </Link>
            </div>
          </form>

          {/* SSO Login */}
          {ssoProviders.length > 0 && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-400">第三方登录</span>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                {SSO_PROVIDERS.filter((p) => ssoProviders.includes(p.key)).map((provider) => (
                  <button
                    key={provider.key}
                    onClick={() => handleSsoLogin(provider.href)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg"
                    style={{ backgroundColor: provider.color + "15" }}
                    title={provider.label}
                  >
                    <span className="text-sm font-bold" style={{ color: provider.color }}>
                      {provider.label[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Rebuild CRM — Python FastAPI + Next.js
          </p>
        </div>
      </div>
    </div>
  );
}
