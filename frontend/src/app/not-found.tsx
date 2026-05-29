"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <Card className="max-w-lg w-full shadow-xl shadow-black/5 relative z-10 animate-fade-up overflow-hidden">
        <CardContent className="p-0">
          {/* Top gradient banner */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />

          <div className="p-8 text-center space-y-6">
            {/* 404 number */}
            <div className="relative">
              <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary/20 to-primary/5 select-none">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-12 h-12 text-primary/40" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">页面未找到</h1>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                您访问的页面不存在或已被移除。请检查 URL 是否正确，或使用下方导航返回。
              </p>
            </div>

            {/* Decorative separator */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-8 h-px bg-border" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              <div className="w-8 h-px bg-border" />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gap-2">
                <Link href="/dashboard">
                  <Home className="w-4 h-4" />
                  返回首页
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回上页
              </Button>
            </div>

            {/* Helpful links */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">您可能在寻找：</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { href: "/dashboard", label: "仪表盘" },
                  { href: "/entities", label: "实体管理" },
                  { href: "/projects", label: "项目" },
                  { href: "/contacts", label: "联系人" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
