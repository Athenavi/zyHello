"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package, CheckCircle2, XCircle, Loader2, AlertTriangle,
  ArrowLeft, ExternalLink, Sparkles
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RbSystemItem {
  file: string;
  name: string;
  desc?: string;
  source?: string;
}

type InstallState = "loading" | "select" | "installing" | "success" | "error";

export default function RbsystemPage() {
  const [installState, setInstallState] = useState<InstallState>("loading");
  const [items, setItems] = useState<RbSystemItem[]>([]);
  const [installError, setInstallError] = useState("");
  const [confirmItem, setConfirmItem] = useState<RbSystemItem | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const res = await api.loadRbSystems();
        const data = (res as any) || [];
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
        setInstallState("select");
      } catch {
        setInstallState("select");
      }
    };
    loadSystems();
  }, []);

  useEffect(() => {
    if (!confirmItem) return;
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirmItem]);

  const handleInstallClick = (item: RbSystemItem) => setConfirmItem(item);

  const handleConfirmInstall = async () => {
    if (!confirmItem) return;
    setConfirmItem(null);
    setInstallState("installing");
    setInstallError("");
    try {
      const res = await api.installRbsystem(confirmItem.file);
      if ((res as any)?.success || (res as any)?.error_code === 0) {
        setInstallState("success");
      } else {
        setInstallError((res as any)?.error_msg || (res as any)?.error || "安装失败");
        setInstallState("error");
      }
    } catch (err: unknown) {
      setInstallError(err instanceof Error ? err.message : "安装请求失败");
      setInstallState("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className={cn("w-full max-w-lg", mounted ? "animate-fade-up" : "opacity-0")}>
          <Card className="overflow-hidden shadow-xl shadow-black/5">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRhMiAyIDAgMSAxLTQgMCAyIDIgMCAwIDEgNCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              <div className="text-white text-3xl font-bold tracking-wider relative">
                ZyHello
              </div>
              <p className="text-white/70 text-sm mt-1">低代码平台 · 系统模板安装</p>
            </div>

            <CardContent className="p-8 text-center">
              {/* Loading */}
              {installState === "loading" && (
                <div className="py-8 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">正在加载可用模板...</p>
                </div>
              )}

              {/* Select system template */}
              {installState === "select" && (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Package className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">选择系统模版</h2>
                  </div>
                  {items.length === 0 ? (
                    <div className="py-8">
                      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">暂无可用模版</p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-left">
                      {items.map((item, idx) => (
                        <button
                          key={item.file}
                          onClick={() => handleInstallClick(item)}
                          className={cn(
                            "w-full block border rounded-xl px-5 py-4 transition-all duration-200 text-left group",
                            "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
                            "animate-fade-up"
                          )}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {item.name}
                              </h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.desc || item.name}
                              </p>
                            </div>
                            {item.source && (
                              <a
                                href={item.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 shrink-0 ml-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                详情
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Installing */}
              {installState === "installing" && (
                <div className="py-8 space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">正在安装</h2>
                    <p className="text-sm text-muted-foreground mt-1">请稍候，正在配置系统模版...</p>
                  </div>
                </div>
              )}

              {/* Success */}
              {installState === "success" && (
                <div className="py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-semibold">安装成功</h2>
                  <p className="text-sm text-muted-foreground">系统模版已成功安装，可以开始使用了</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      进入系统
                    </Link>
                  </Button>
                </div>
              )}

              {/* Error */}
              {installState === "error" && (
                <div className="py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <XCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h2 className="text-xl font-semibold">安装失败</h2>
                  <Button variant="outline" asChild>
                    <Link href="/admin/setup/rbsystem">重试安装</Link>
                  </Button>
                  {installError && (
                    <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-left">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">{installError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copyright */}
          <div className="text-center mt-6 text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://marklume.cn/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary transition-colors"
            >
              ZyHello Apps
            </a>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!confirmItem} onOpenChange={(open) => { if (!open) setConfirmItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              危险操作确认
            </DialogTitle>
            <DialogDescription className="sr-only">确认安装系统模版</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-foreground leading-relaxed">
                安装系统模版将<strong className="text-destructive">清空</strong>您现有系统的所有数据，包括系统配置、业务实体、数据以及附件等。安装前强烈建议您做好系统备份。
              </p>
            </div>
            {confirmItem && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">{confirmItem.name}</Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmInstall}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `清空并安装 (${countdown}s)` : "清空并安装"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
