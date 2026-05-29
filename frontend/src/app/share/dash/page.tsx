"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface ChartData {
  chartId: string;
  title: string;
  type: string;
  data?: { items?: Record<string, unknown>[]; [key: string]: unknown };
  option?: Record<string, unknown>;
  axis?: { dimension?: string[]; numerical?: string[] };
}

function SharedDashContent() {
  const searchParams = useSearchParams();
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [title, setTitle] = useState("共享仪表盘");

  const shareId = searchParams.get("id") || "";

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      return;
    }
    api
      .request(`/dashboard/shared/${shareId}`)
      .then((data: Record<string, unknown>) => {
        const dashData = data as { title?: string; charts?: ChartData[] };
        setTitle(dashData.title || "共享仪表盘");
        setCharts(dashData.charts || []);
      })
      .catch(() => {
        setCharts([]);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b backdrop-blur ${darkMode ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">{title}</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
            title={darkMode ? "浅色模式" : "深色模式"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-xl h-64 animate-pulse ${darkMode ? "bg-gray-800" : "bg-white"}`} />
            ))}
          </div>
        ) : charts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <p className={darkMode ? "text-gray-400" : "text-gray-500"}>暂无图表数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {charts.map((chart, idx) => (
              <div
                key={chart.chartId || idx}
                className={`rounded-xl border p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm`}
              >
                <h3 className="text-sm font-semibold mb-3">{chart.title || "未命名图表"}</h3>
                <div className="h-48 flex items-center justify-center">
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {chart.type === "TABLE" ? "📋 数据表格" : `📊 ${chart.type} 图表`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedDashPage() {
  return (
    <Suspense>
      <SharedDashContent />
    </Suspense>
  );
}
