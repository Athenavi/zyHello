"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
      </div>

      <Card className="max-w-md w-full shadow-xl shadow-black/5 relative z-10 animate-fade-up">
        <CardContent className="p-8 text-center space-y-6">
          {/* Error icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>

          {/* Error message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">出错了</h1>
            <p className="text-muted-foreground text-sm">
              页面加载过程中遇到了意外错误。请尝试刷新页面或返回首页。
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              重新加载
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <a href="/dashboard">
                <Home className="w-4 h-4" />
                返回首页
              </a>
            </Button>
          </div>

          {/* Technical details (collapsed) */}
          {process.env.NODE_ENV === "development" && (
            <details className="text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                技术详情（开发模式）
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground overflow-auto max-h-40">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
