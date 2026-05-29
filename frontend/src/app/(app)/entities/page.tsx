"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  Database,
  ArrowRight,
  Grid3X3,
  List,
  Plus,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ENTITY_ICONS: Record<string, string> = {
  "Account": "🏢",
  "Contact": "👤",
  "Opportunity": "💰",
  "Lead": "🎯",
  "Case": "📋",
  "Task": "✅",
  "Event": "📅",
  "Product": "📦",
  "Campaign": "📣",
  "Contract": "📄",
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    api
      .getEntities()
      .then((res) => {
        const data = (res as Record<string, unknown>)?.data ?? res;
        setEntities(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entities.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = ((e.entity_label || e.entityLabel || e.label || e.entity || e.name || "") as string).toLowerCase();
    const entityName = ((e.entity || e.name || "") as string).toLowerCase();
    return name.includes(q) || entityName.includes(q);
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur px-6 py-5">
        <div className={cn("transition-all duration-500", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
          <h1 className="text-2xl font-bold text-foreground">业务实体</h1>
          <p className="text-sm text-muted-foreground mt-1">查看和管理所有业务实体数据</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={cn("px-6 py-4 border-b bg-muted/30 flex items-center gap-3 transition-all duration-500 delay-100", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索实体..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-background">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        <Badge variant="secondary">{filtered.length} 个实体</Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm border border-destructive/20">
            {error}
          </div>
        )}

        {loading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-2/3 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Database className="w-8 h-8 text-muted-foreground/40" />}
            title={search ? "未找到匹配的实体" : "暂无业务实体"}
            description={search ? "请尝试其他搜索关键词" : "联系管理员创建业务实体"}
          />
        ) : viewMode === "grid" ? (
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all", mounted ? "animate-fade-up" : "")}>
            {filtered.map((entity, idx) => {
              const e = entity as Record<string, unknown>;
              const entityName = (e.entity || e.name || "") as string;
              const label = (e.entity_label || e.entityLabel || e.label || entityName) as string;
              const desc = String(e.comments || e.description || "");
              const icon = ENTITY_ICONS[entityName] || "📋";

              return (
                <Link
                  key={idx}
                  href={`/entities/${entityName}`}
                  className="group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <Card hover className="h-full overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {label}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                            {entityName}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 flex-shrink-0 mt-1" />
                      </div>
                      {desc && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={cn("space-y-2 transition-all", mounted ? "animate-fade-up" : "")}>
            {filtered.map((entity, idx) => {
              const e = entity as Record<string, unknown>;
              const entityName = (e.entity || e.name || "") as string;
              const label = (e.entity_label || e.entityLabel || e.label || entityName) as string;
              const desc = String(e.comments || e.description || "");
              const icon = ENTITY_ICONS[entityName] || "📋";

              return (
                <Link key={idx} href={`/entities/${entityName}`} className="group block">
                  <Card hover>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {label}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground font-mono">{entityName}</span>
                          {desc && <span className="text-xs text-muted-foreground truncate">· {desc}</span>}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
