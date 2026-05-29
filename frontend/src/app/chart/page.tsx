"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

export default function ChartPage() {
  return (
    <Suspense>
      <ChartContent />
    </Suspense>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [chartTitle, setChartTitle] = useState("");
  const [chartType, setChartType] = useState("");
  const [error, setError] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<unknown>(null);

  const chartId = searchParams.get("id") || "";

  useEffect(() => {
    if (!chartId) {
      setError("未指定图表ID");
      setLoading(false);
      return;
    }

    loadChart();
  }, [chartId]);

  const loadChart = async () => {
    setLoading(true);
    try {
      const data = await api.request(`/chart/data/${chartId}`) as Record<string, unknown>;
      setChartTitle((data.title as string) || "图表");
      setChartType((data.type as string) || "BAR");

      // Load ECharts dynamically
      if (typeof window !== "undefined") {
        const echarts = await import("echarts");
        echartsRef.current = echarts;
        renderChart(echarts, data);
      }
    } catch (e) {
      setError("加载图表失败");
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (echarts: typeof import("echarts"), data: Record<string, unknown>) => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    const type = data.type as string;
    const chartData = data.data as { items?: Record<string, unknown>[] } | undefined;
    const option = data.option as Record<string, unknown> | undefined;

    if (!chartData?.items?.length) return;

    const items = chartData.items;
    const firstItem = items[0];
    const keys = Object.keys(firstItem);
    const labelKey = keys[0];
    const valueKey = keys[1];

    const labels = items.map((r) => String(r[labelKey] || ""));
    const values = items.map((r) => Number(r[valueKey]) || 0);

    let chartOption: Record<string, unknown> = {};

    switch (type) {
      case "TABLE":
      case "DATALIST2":
        // No chart rendering for table type
        break;
      case "LINE":
        chartOption = {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ data: values, type: "line", smooth: true }],
        };
        break;
      case "BAR":
      case "BAR2":
      case "BAR3":
      case "PARETO":
        chartOption = {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ data: values, type: "bar" }],
        };
        break;
      case "PIE":
        chartOption = {
          tooltip: { trigger: "item" },
          series: [{
            data: labels.map((l, i) => ({ name: l, value: values[i] })),
            type: "pie",
            radius: "50%",
          }],
        };
        break;
      case "FUNNEL":
        chartOption = {
          tooltip: { trigger: "item" },
          series: [{
            data: labels.map((l, i) => ({ name: l, value: values[i] })),
            type: "funnel",
          }],
        };
        break;
      case "RADAR":
        chartOption = {
          tooltip: {},
          radar: { indicator: labels.map((l) => ({ name: l, max: Math.max(...values) * 1.2 })) },
          series: [{ type: "radar", data: [{ value: values }] }],
        };
        break;
      default:
        // Fallback to bar chart
        chartOption = {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ data: values, type: "bar" }],
        };
    }

    // Merge with custom options if provided
    if (option) {
      chartOption = { ...chartOption, ...option };
    }

    chart.setOption(chartOption);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b bg-gray-50 flex items-center px-4">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-700 mr-3"
          title="返回"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-medium text-gray-700 truncate">{chartTitle}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            <p>{error}</p>
          </div>
        ) : (chartType === "TABLE" || chartType === "DATALIST2") ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>表格类型图表请在数据列表中查看</p>
          </div>
        ) : (
          <div ref={chartRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
