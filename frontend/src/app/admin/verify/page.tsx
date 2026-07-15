"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, ArrowLeft, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function AdminVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nexturl = searchParams.get("nexturl") || "/admin/metadata";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("请输入管理员密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.adminVerify(password);
      const data = res as { success?: boolean; error_code?: number; token?: string; error_msg?: string };
      if (data?.success || data?.error_code === 0) {
        // Store the signed admin JWT token returned by backend
        const adminToken = data.token || "verified";
        document.cookie = `admin_token=${adminToken}; path=/; max-age=3600; SameSite=Lax;`;
        router.replace(nexturl);
      } else {
        setError(data?.error_msg || "验证失败，请检查密码");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "验证请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className={cn("w-full max-w-sm relative z-10", mounted ? "animate-fade-up" : "opacity-0")}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">管理员认证</h1>
          <p className="text-sm text-muted-foreground mt-1">请验证您的管理员身份以继续</p>
        </div>

        <Card className="overflow-hidden shadow-xl shadow-black/5">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  登录密码
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="请输入您的登录密码"
                  autoComplete="current-password"
                  autoFocus
                  className="h-11"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-11" loading={loading}>
                <Shield className="w-4 h-4 mr-2" />
                验证身份
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            返回
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AdminVerifyContent />
    </Suspense>
  );
}
