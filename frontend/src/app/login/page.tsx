"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  Shield,
  ArrowRight,
  Zap,
  Globe,
  Building2,
  Sparkles,
} from "lucide-react";

const SSO_PROVIDERS = [
  { key: "dingtalk", label: "钉钉", color: "#0089FF", icon: "🔵" },
  { key: "wxwork", label: "企业微信", color: "#07C160", icon: "🟢" },
  { key: "feishu", label: "飞书", color: "#3370FF", icon: "🔷" },
];

const FEATURES = [
  { icon: Zap, title: "高性能架构", desc: "基于 FastAPI + Next.js，响应速度极快" },
  { icon: Shield, title: "企业级安全", desc: "完善的角色权限与数据隔离机制" },
  { icon: Globe, title: "灵活集成", desc: "支持钉钉、企微、飞书等多平台对接" },
  { icon: Building2, title: "元数据驱动", desc: "低代码配置，快速搭建业务流程" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [mounted, setMounted] = useState(false);

  const captchaImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setMounted(true);
    const rememberedUser = localStorage.getItem("remembered_user");
    if (rememberedUser) {
      setUsername(rememberedUser);
      setRememberMe(true);
    }

    api.getSsoProviders().then((data) => {
      const providers = data?.data || data;
      if (Array.isArray(providers)) setSsoProviders(providers);
      else if (providers && typeof providers === "object")
        setSsoProviders(Object.keys(providers).filter((k) => providers[k]));
    }).catch(() => {});

    api.getLoginAnnouncement().then((data) => {
      const msg = data?.msg || data?.data?.msg;
      if (msg) setAnnouncement(msg);
    }).catch(() => {});

    refreshCaptcha();
  }, []);

  const refreshCaptcha = () => {
    const url = api.getCaptchaUrl();
    setCaptchaUrl(url);
    fetch(url, { method: "HEAD" })
      .then((res) => {
        setShowCaptcha(!!(res.ok && res.headers.get("content-type")?.includes("image")));
      })
      .catch(() => setShowCaptcha(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password, showCaptcha ? captcha : undefined);
      if (rememberMe) {
        localStorage.setItem("remembered_user", username);
      } else {
        localStorage.removeItem("remembered_user");
      }
      toast.success("登录成功", { description: "欢迎回来！" });
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "登录失败";
      setError(msg);
      toast.error("登录失败", { description: msg });
      if (showCaptcha) refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-indigo-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 dot-pattern opacity-[0.03]" />
      </div>

      {/* Left Panel - Features (desktop only) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative">
        <div className={`max-w-lg transition-all duration-1000 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Rebuild</h1>
              <p className="text-xs text-muted-foreground">下一代业务管理平台</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            重新定义
            <br />
            <span className="gradient-text">企业级业务管理</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            集 CRM、项目管理、工作流自动化、AI 助手于一体的
            <br />
            现代化低代码平台
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-500 hover:shadow-md hover:border-primary/20 ${
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${300 + idx * 100}ms` }}
                >
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 relative z-10">
        <div className={`w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Announcement */}
          {announcement && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl flex items-start gap-2 animate-fade-down">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span dangerouslySetInnerHTML={{ __html: announcement }} />
            </div>
          )}

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Rebuild</span>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl border p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground">欢迎回来</h2>
              <p className="text-sm text-muted-foreground mt-1">登录你的账户以继续</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 flex items-start gap-2 mb-4 animate-fade-down">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">用户名</label>
                <Input
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名或邮箱"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">密码</label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    忘记密码？
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    icon={<Lock className="w-4 h-4" />}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              {showCaptcha && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">验证码</label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      placeholder="请输入验证码"
                      maxLength={6}
                      autoComplete="off"
                      className="flex-1"
                    />
                    <div
                      className="flex-shrink-0 w-28 h-9 bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary/50 transition-colors flex items-center justify-center"
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
                        <span className="text-xs text-muted-foreground">加载中...</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border-2 border-input rounded transition-all peer-checked:border-primary peer-checked:bg-primary group-hover:border-primary/50">
                    {rememberMe && (
                      <svg className="w-3 h-3 text-primary-foreground m-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">记住登录</span>
              </label>

              {/* Submit */}
              <Button type="submit" loading={loading} className="w-full h-11 text-base" size="lg">
                {loading ? "登录中..." : "登 录"}
                {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>

              {/* Signup */}
              <div className="text-center text-sm text-muted-foreground">
                还没有账号？
                <Link href="/signup" className="text-primary hover:text-primary/80 font-medium ml-1 transition-colors">
                  立即注册
                </Link>
              </div>
            </form>

            {/* SSO */}
            {ssoProviders.length > 0 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">或使用第三方登录</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  {SSO_PROVIDERS.filter((p) => ssoProviders.includes(p.key)).map((p) => (
                    <a
                      key={p.key}
                      href={`/user/sso?protocol=${p.key}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-all text-sm font-medium"
                    >
                      <span>{p.icon}</span>
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            © {new Date().getFullYear()} Rebuild. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
