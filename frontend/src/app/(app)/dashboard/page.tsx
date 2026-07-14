"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Activity,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  Plus,
  MoreHorizontal,
  Moon,
  Sun,
  Filter,
  ArrowUpRight,
  BarChart3,
  PieChart,
  LineChart,
  CalendarDays,
  Zap,
  CheckCircle2,
  AlertCircle,
  Timer,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartData {
  id: string;
  title: string;
  type: string;
  data?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface DashboardData {
  id: string;
  title: string;
  charts?: ChartData[];
}

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  href?: string;
}

const QUICK_ACTIONS = [
  { label: "新建记录", icon: Plus, href: "/entities", color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
  { label: "查看报表", icon: BarChart3, href: "/dashboard/chart-design", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  { label: "消息通知", icon: Activity, href: "/notifications", color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
  { label: "文件管理", icon: FileText, href: "/files", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<DashboardData | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<Record<string, unknown>[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, entityRes, chartRes, statsRes, feedsRes] = await Promise.all([
        api.getDashboards().catch(() => []),
        api.getEntities().catch(() => []),
        api.listCharts().catch(() => ({ data: [] })),
        api.get("/dashboard/stats").catch(() => ({ data: {} })),
        api.listFeeds(1).catch(() => ({ data: [] })),
      ]);
      const dashList = Array.isArray(dashRes) ? dashRes : ((dashRes as Record<string, unknown>).data || []) as DashboardData[];
      setDashboards(dashList);
      setEntities(Array.isArray(entityRes) ? entityRes : []);

      const chartRaw = (chartRes as Record<string, unknown>)?.data || chartRes;
      const chartArr = Array.isArray(chartRaw) ? chartRaw : [];
      const mappedCharts: ChartData[] = chartArr.map((c: Record<string, unknown>) => ({
        id: (c.chart_id || c.id) as string,
        title: (c.title || c.name) as string,
        type: (c.chart_type || c.type) as string,
        config: c.config as Record<string, unknown> | undefined,
      }));
      setCharts(mappedCharts);

      if (dashList.length > 0) setActiveDashboard(dashList[0]);

      // Real stats from API
      const statsData = ((statsRes as Record<string, unknown>)?.data || {}) as Record<string, number>;
      setStats(statsData);

      // Real recent activities from feeds
      const feedsData = (feedsRes as Record<string, unknown>)?.data || feedsRes;
      const feedList = Array.isArray(feedsData) ? feedsData : (feedsData as Record<string, unknown>)?.data || [];
      setActivities(Array.isArray(feedList) ? feedList.slice(0, 5) : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboards(); }, [fetchDashboards]);

  useEffect(() => {
    if (refreshTimer.current) { clearInterval(refreshTimer.current); refreshTimer.current = null; }
    if (autoRefresh && autoRefresh > 0) {
      refreshTimer.current = setInterval(fetchDashboards, autoRefresh * 1000);
    }
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [autoRefresh, fetchDashboards]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 12) return "早上好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  };

  const refreshLabels: Record<number, string> = {
    30: "30秒", 60: "1分钟", 300: "5分钟", 600: "10分钟", 1800: "30分钟",
  };

  return (
    <div ref={containerRef} className="flex flex-col min-h-full bg-background">
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn("text-2xl font-bold text-foreground transition-all duration-500", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
              {getGreeting()}，{user?.full_name || user?.login_name} 👋
            </h1>
            <p className={cn("text-sm text-muted-foreground mt-1 transition-all duration-500 delay-100", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
              这是你的工作台概览，祝你今天工作顺利
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto refresh */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn(autoRefresh && "text-primary border-primary/30")}>
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", autoRefresh && "animate-spin-slow")} />
                  {autoRefresh ? refreshLabels[autoRefresh] || "自动刷新" : "刷新"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(refreshLabels).map(([sec, label]) => (
                  <DropdownMenuItem key={sec} onClick={() => setAutoRefresh(Number(sec))}>
                    {autoRefresh === Number(sec) && <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-primary" />}
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAutoRefresh(null)}>关闭自动刷新</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button variant="outline" size="icon-sm" onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          {[
            { label: "用户数", value: stats.total_users?.toLocaleString() || "-", icon: Users, color: "from-emerald-500 to-emerald-600", href: "/admin/users" },
            { label: "任务总数", value: stats.total_tasks?.toLocaleString() || "-", icon: FileText, color: "from-blue-500 to-blue-600", href: "/projects" },
            { label: "待处理任务", value: stats.pending_tasks?.toLocaleString() || "-", icon: Timer, color: "from-amber-500 to-amber-600", href: "/projects" },
            { label: "未读通知", value: stats.unread_notifications?.toLocaleString() || "-", icon: Activity, color: "from-violet-500 to-violet-600", href: "/notifications" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return stat.href ? (
              <Link key={idx} href={stat.href}>
                <Card hover className={cn("group overflow-hidden", mounted ? "animate-fade-up" : "")} style={{ animationDelay: `${idx * 100}ms` }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                      </div>
                      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", stat.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <div key={idx}>
                <Card hover className={cn("group overflow-hidden", mounted ? "animate-fade-up" : "")} style={{ animationDelay: `${idx * 100}ms` }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                      </div>
                      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", stat.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className={cn("transition-all duration-700 delay-200", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <h2 className="text-sm font-semibold text-foreground mb-3">快捷操作</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  href={action.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", action.color)}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">数据图表</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/chart-design">
                  管理图表
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-1/3 mb-4" />
                      <Skeleton className="h-40 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : charts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-3">暂无图表数据</p>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/chart-design">
                      <Plus className="w-4 h-4 mr-1" />
                      创建图表
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charts.slice(0, 6).map((chart) => (
                  <Card key={chart.id} hover>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{chart.title}</CardTitle>
                        <Badge variant="outline" className="text-[10px]">
                          {chart.type === "BAR" ? "柱状图" : chart.type === "LINE" ? "折线图" : chart.type === "PIE" ? "饼图" : chart.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-40 flex items-center justify-center bg-muted/30 rounded-lg">
                        <div className="text-center text-muted-foreground">
                          {chart.type === "BAR" ? <BarChart3 className="w-8 h-8 mx-auto mb-1 opacity-30" /> :
                           chart.type === "PIE" ? <PieChart className="w-8 h-8 mx-auto mb-1 opacity-30" /> :
                           <LineChart className="w-8 h-8 mx-auto mb-1 opacity-30" />}
                          <p className="text-xs">图表预览</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">最近动态</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/feeds">
                  查看全部
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {activities.length > 0 ? activities.map((activity: Record<string, unknown>, idx: number) => {
                    const displayText = String(activity.content || activity.message || "");
                    return (
                    <div key={String(activity.feeds_id || activity.id || idx)} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        {String(activity.created_by || "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{displayText.slice(0, 80) || "暂无内容"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.created_on ? String(activity.created_on).slice(0, 16) : ""}
                        </p>
                      </div>
                    </div>
                    );
                  }) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">暂无最近动态</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Entity Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">业务实体</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {entities.slice(0, 5).map((entity, idx) => {
                    const e = entity as Record<string, unknown>;
                    const name = (e.entity_label || e.entityLabel || e.label || e.entity || e.name || "") as string;
                    const entityName = (e.entity || e.name || "") as string;
                    return (
                      <Link
                        key={idx}
                        href={`/entities/${entityName}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <span className="text-sm text-foreground">{name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    );
                  })}
                  {entities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
