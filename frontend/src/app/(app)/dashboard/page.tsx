"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import Link from "next/link";

/* ── 类型定义 ─────────────────────────────────────────── */
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

/* ── 主页面组件 ───────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<DashboardData | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<number | null>(null);
  const [filterUser, setFilterUser] = useState("0");
  const [filterDate, setFilterDate] = useState("0");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddChart, setShowAddChart] = useState(false);
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, entityRes] = await Promise.all([
        api.getDashboards().catch(() => []),
        api.getEntities().catch(() => []),
      ]);
      const dashList = Array.isArray(dashRes) ? dashRes : ((dashRes as Record<string, unknown>).data || []) as DashboardData[];
      setDashboards(dashList);
      setEntities(Array.isArray(entityRes) ? entityRes : []);
      if (dashList.length > 0) {
        setActiveDashboard(dashList[0]);
        // 加载图表数据
        const chartList = (dashList[0] as Record<string, unknown>).charts || (dashList[0] as Record<string, unknown>).items || [];
        setCharts(Array.isArray(chartList) ? chartList as ChartData[] : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  // 自动刷新
  useEffect(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (autoRefresh && autoRefresh > 0) {
      refreshTimer.current = setInterval(() => {
        fetchDashboards();
      }, autoRefresh * 1000);
    }
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [autoRefresh, fetchDashboards]);

  /* ── 操作处理 ─────────────────────────────────────── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  const handleSelectDashboard = (dash: DashboardData) => {
    setActiveDashboard(dash);
    const chartList = (dash as Record<string, unknown>).charts || (dash as Record<string, unknown>).items || [];
    setCharts(Array.isArray(chartList) ? chartList as ChartData[] : []);
  };

  const refreshLabels: Record<number, string> = {
    30: "30秒",
    60: "1分钟",
    300: "5分钟",
    600: "10分钟",
    1800: "30分钟",
  };

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      {/* 工具栏 */}
      <div className={`border-b px-6 py-3 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 仪表盘选择 */}
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                仪表盘
              </h1>
              {dashboards.length > 1 && (
                <select
                  value={activeDashboard?.id || ""}
                  onChange={(e) => {
                    const dash = dashboards.find(
                      (d) => (d.id || (d as Record<string, unknown>).dashboardId) === e.target.value
                    );
                    if (dash) handleSelectDashboard(dash);
                  }}
                  className={`px-2 py-1 text-sm border rounded ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {dashboards.map((d, idx) => (
                    <option key={idx} value={(d.id || (d as Record<string, unknown>).dashboardId || "") as string}>
                      {d.title || (d as Record<string, unknown>).name || `仪表盘 ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 暗色模式 */}
            <button
              onClick={handleDarkMode}
              className={`p-2 rounded-lg transition ${
                darkMode ? "text-yellow-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"
              }`}
              title={darkMode ? "亮色模式" : "暗色模式"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* 过滤条件 */}
            <div className="relative group">
              <button
                className={`p-2 rounded-lg transition ${
                  darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"
                }`}
                title="过滤条件"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-50 py-1 hidden group-hover:block">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">所属用户</div>
                {[["0", "全部"], ["SFU", "本人"], ["SFB", "本部门"], ["SFD", "本部门及子部门"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilterUser(val)}
                    className={`w-full text-left px-4 py-1.5 text-sm ${
                      filterUser === val ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className="border-t my-1" />
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">创建时间</div>
                {[["0", "全部"], ["CUM", "本月"], ["PUM", "上月"], ["CUY", "本年"], ["PUY", "去年"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilterDate(val)}
                    className={`w-full text-left px-4 py-1.5 text-sm ${
                      filterDate === val ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 全屏 */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg transition ${
                darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"
              }`}
              title="全屏"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* 自动刷新 */}
            <div className="relative group">
              <button
                className={`p-2 rounded-lg transition flex items-center gap-1 ${
                  darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"
                } ${autoRefresh ? "text-blue-500" : ""}`}
                title="自动刷新"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {autoRefresh && (
                  <span className="text-xs">{refreshLabels[autoRefresh] || ""}</span>
                )}
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-50 py-1 hidden group-hover:block">
                {Object.entries(refreshLabels).map(([sec, label]) => (
                  <button
                    key={sec}
                    onClick={() => setAutoRefresh(Number(sec))}
                    className={`w-full text-left px-4 py-1.5 text-sm ${
                      autoRefresh === Number(sec) ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setAutoRefresh(null)}
                  className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* 添加图表 */}
            <button
              onClick={() => setShowAddChart(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                darkMode
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              + 添加图表
            </button>
          </div>
        </div>
      </div>

      {/* 图表网格 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`rounded-xl shadow-sm border p-6 animate-pulse ${
                  darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
                }`}
              >
                <div className={`h-4 rounded w-1/3 mb-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                <div className={`h-40 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`} />
              </div>
            ))}
          </div>
        ) : charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              欢迎使用仪表盘
            </h3>
            <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              添加图表来可视化您的业务数据
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddChart(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                添加图表
              </button>
              <Link
                href="/entities"
                className={`px-4 py-2 border rounded-lg transition text-sm ${
                  darkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                浏览实体
              </Link>
            </div>

            {/* 实体快速访问 */}
            {entities.length > 0 && (
              <div className="mt-10 w-full max-w-2xl">
                <h4 className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  快速访问
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {entities.slice(0, 8).map((entity, idx) => (
                    <a
                      key={idx}
                      href={`/entities/${String((entity as Record<string, unknown>).entity || (entity as Record<string, unknown>).name || "")}`}
                      className={`block p-3 rounded-lg border transition ${
                        darkMode
                          ? "border-gray-700 hover:border-blue-500 hover:bg-gray-800"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                        {String(
                          (entity as Record<string, unknown>).entityLabel ||
                          (entity as Record<string, unknown>).label ||
                          (entity as Record<string, unknown>).entity ||
                          "未命名"
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {charts.map((chart, idx) => (
              <ChartCard key={chart.id || idx} chart={chart} darkMode={darkMode} />
            ))}
          </div>
        )}
      </div>

      {/* 添加图表弹窗 */}
      {showAddChart && (
        <AddChartModal
          darkMode={darkMode}
          onClose={() => setShowAddChart(false)}
          onAdd={(chartId) => {
            setShowAddChart(false);
            fetchDashboards();
          }}
        />
      )}
    </div>
  );
}

/* ── 图表卡片组件 ─────────────────────────────────────── */
function ChartCard({ chart, darkMode }: { chart: ChartData; darkMode: boolean }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chart.id) {
      api
        .getChartData(chart.id)
        .then((res) => setData(res as Record<string, unknown>))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [chart.id]);

  const chartType = (chart.type || (chart as Record<string, unknown>).chartType || "TABLE") as string;

  return (
    <div
      className={`rounded-xl shadow-sm border overflow-hidden ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
      }`}
    >
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        darkMode ? "border-gray-700" : ""
      }`}>
        <h3 className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
          {chart.title || (chart as Record<string, unknown>).name || "未命名图表"}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded ${
          darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500"
        }`}>
          {chartType}
        </span>
      </div>
      <div className="p-4">
        {loading ? (
          <div className={`h-40 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-100"}`} />
        ) : data ? (
          <ChartDataDisplay data={data} type={chartType} darkMode={darkMode} />
        ) : (
          <div className={`h-40 flex items-center justify-center ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            暂无数据
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 图表数据展示组件 ─────────────────────────────────── */
function ChartDataDisplay({
  data,
  type,
  darkMode,
}: {
  data: Record<string, unknown>;
  type: string;
  darkMode: boolean;
}) {
  const items = ((data.data || data.items || data.rows || []) as Record<string, unknown>[]) || [];
  const cols = ((data.columns || data.headers || []) as string[]) || [];

  if (type === "TABLE" || type === "DATALIST2") {
    if (items.length === 0) {
      return <div className={`text-center py-8 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>暂无数据</div>;
    }
    const keys = cols.length > 0 ? cols : Object.keys(items[0] || {});
    return (
      <div className="overflow-x-auto max-h-60">
        <table className="w-full text-sm">
          <thead>
            <tr className={darkMode ? "border-gray-700" : "border-gray-200"}>
              {keys.map((k, i) => (
                <th
                  key={i}
                  className={`px-2 py-1.5 text-left text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}>
            {items.slice(0, 10).map((row, idx) => (
              <tr key={idx}>
                {keys.map((k, i) => (
                  <td
                    key={i}
                    className={`px-2 py-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {String(
                      typeof row[k] === "object"
                        ? (row[k] as Record<string, unknown>)?.text || JSON.stringify(row[k])
                        : row[k] ?? "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "INDEX") {
    const val = data.value ?? data.total ?? data.count ?? "-";
    const label = data.label ?? data.title ?? "";
    return (
      <div className="text-center py-8">
        <div className={`text-4xl font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
          {String(val)}
        </div>
        {label && (
          <div className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {String(label)}
          </div>
        )}
      </div>
    );
  }

  // LINE, BAR, PIE 等图表类型用简单数据展示
  if (items.length > 0) {
    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.slice(0, 8).map((item, idx) => {
          const label = String(
            item.label || item.name || item[Object.keys(item)[0]] || `项 ${idx + 1}`
          );
          const value = Number(item.value || item.count || item[Object.keys(item)[1]] || 0);
          const maxVal = Math.max(
            ...items.map((i) => Number(i.value || i.count || i[Object.keys(i)[1]] || 0)),
            1
          );
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-20 text-xs truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {label}
              </div>
              <div className="flex-1">
                <div
                  className={`h-4 rounded ${darkMode ? "bg-blue-900" : "bg-blue-100"}`}
                  style={{ width: `${(value / maxVal) * 100}%` }}
                >
                  <div
                    className={`h-full rounded ${darkMode ? "bg-blue-500" : "bg-blue-500"}`}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div className={`w-12 text-xs text-right ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {value}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <div className={`text-center py-8 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>暂无数据</div>;
}

/* ── 添加图表弹窗 ─────────────────────────────────────── */
function AddChartModal({
  darkMode,
  onClose,
  onAdd,
}: {
  darkMode: boolean;
  onClose: () => void;
  onAdd: (chartId: string) => void;
}) {
  const [chartName, setChartName] = useState("");
  const [chartType, setChartType] = useState("TABLE");
  const [saving, setSaving] = useState(false);

  const chartTypes = [
    { value: "TABLE", label: "表格", icon: "📊" },
    { value: "INDEX", label: "指标", icon: "🔢" },
    { value: "LINE", label: "折线图", icon: "📈" },
    { value: "BAR", label: "柱状图", icon: "📊" },
    { value: "PIE", label: "饼图", icon: "🥧" },
    { value: "FUNNEL", label: "漏斗图", icon: "🔻" },
    { value: "RADAR", label: "雷达图", icon: "🎯" },
    { value: "TREEMAP", label: "树图", icon: "🌳" },
  ];

  const handleCreate = async () => {
    if (!chartName.trim()) return;
    setSaving(true);
    try {
      await api.post("/dashboard/chart-create", {
        title: chartName,
        type: chartType,
      });
      onAdd(chartName);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`rounded-xl shadow-2xl w-full max-w-md ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          darkMode ? "border-gray-700" : ""
        }`}>
          <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
            添加新图表
          </h3>
          <button onClick={onClose} className={darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              图表名称
            </label>
            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              placeholder="输入图表名称"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              图表类型
            </label>
            <div className="grid grid-cols-4 gap-2">
              {chartTypes.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setChartType(ct.value)}
                  className={`p-3 rounded-lg border text-center transition ${
                    chartType === ct.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : darkMode
                      ? "border-gray-600 hover:border-gray-500 text-gray-300"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xl mb-1">{ct.icon}</div>
                  <div className="text-xs">{ct.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
          darkMode ? "border-gray-700" : ""
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm border rounded-lg ${
              darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !chartName.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
