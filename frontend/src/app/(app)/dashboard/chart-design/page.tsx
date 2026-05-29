"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
}

interface AxisItem {
  field: string;
  label: string;
  calc?: string;
  sort?: string;
  maxItems?: number;
  style?: string;
}

interface ChartConfig {
  chartId?: string;
  title: string;
  type: string;
  entity: string;
  axis: { dimension: AxisItem[]; numerical: AxisItem[] };
  option: Record<string, unknown>;
}

const CHART_TYPES = [
  { key: "TABLE", label: "表格", icon: "📋" },
  { key: "INDEX", label: "指标", icon: "📊" },
  { key: "LINE", label: "折线图", icon: "📈" },
  { key: "BAR", label: "柱状图", icon: "📊" },
  { key: "BAR2", label: "条形图", icon: "📊" },
  { key: "BAR3", label: "堆叠图", icon: "📊" },
  { key: "PARETO", label: "帕累托图", icon: "📊" },
  { key: "PIE", label: "饼图", icon: "🥧" },
  { key: "FUNNEL", label: "漏斗图", icon: "🔽" },
  { key: "TREEMAP", label: "矩形树图", icon: "🌳" },
  { key: "RADAR", label: "雷达图", icon: "🎯" },
  { key: "SCATTER", label: "散点图", icon: "⚬" },
  { key: "CNMAP", label: "中国地图", icon: "🗺️" },
  { key: "DATALIST2", label: "数据列表", icon: "📋" },
];

const CALC_OPTIONS = [
  { value: "COUNT", label: "计数" },
  { value: "SUM", label: "求和" },
  { value: "AVG", label: "平均值" },
  { value: "MAX", label: "最大值" },
  { value: "MIN", label: "最小值" },
  { value: "COUNT2", label: "去重计数" },
];

function ChartDesignContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [config, setConfig] = useState<ChartConfig>({
    title: "新建图表",
    type: "BAR",
    entity: "",
    axis: { dimension: [], numerical: [] },
    option: {},
  });
  const [fields, setFields] = useState<EntityField[]>([]);
  const [fieldSearch, setFieldSearch] = useState("");
  const [entities, setEntities] = useState<{ name: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<unknown>(null);

  const chartId = searchParams.get("id") || "";
  const entityParam = searchParams.get("entity") || "";

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const entitiesData = await api.getEntities().catch(() => []);
      setEntities(Array.isArray(entitiesData) ? entitiesData as { name: string; label: string }[] : []);

      if (chartId) {
        const data = await api.request(`/chart/${chartId}`) as Record<string, unknown>;
        setConfig({
          chartId: data.chartId as string,
          title: (data.title as string) || "图表",
          type: (data.type as string) || "BAR",
          entity: (data.entity as string) || "",
          axis: (data.axis as ChartConfig["axis"]) || { dimension: [], numerical: [] },
          option: (data.option as Record<string, unknown>) || {},
        });
        if (data.entity) loadFields(data.entity as string);
      } else if (entityParam) {
        setConfig((prev) => ({ ...prev, entity: entityParam }));
        loadFields(entityParam);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async (entityName: string) => {
    try {
      const data = await api.getFields(entityName);
      const list = Array.isArray(data) ? data : ((data as Record<string, unknown>).fields || []);
      setFields(list as EntityField[]);
    } catch {
      setFields([]);
    }
  };

  const handleEntityChange = (entityName: string) => {
    setConfig((prev) => ({
      ...prev,
      entity: entityName,
      axis: { dimension: [], numerical: [] },
    }));
    if (entityName) loadFields(entityName);
  };

  const addDimension = (field: EntityField) => {
    const name = field.field || field.name || "";
    const label = field.fieldLabel || field.label || name;
    setConfig((prev) => ({
      ...prev,
      axis: {
        ...prev.axis,
        dimension: [...prev.axis.dimension, { field: name, label }],
      },
    }));
  };

  const addNumerical = (field: EntityField) => {
    const name = field.field || field.name || "";
    const label = field.fieldLabel || field.label || name;
    setConfig((prev) => ({
      ...prev,
      axis: {
        ...prev.axis,
        numerical: [...prev.axis.numerical, { field: name, label, calc: "COUNT" }],
      },
    }));
  };

  const removeDimension = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      axis: { ...prev.axis, dimension: prev.axis.dimension.filter((_, i) => i !== idx) },
    }));
  };

  const removeNumerical = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      axis: { ...prev.axis, numerical: prev.axis.numerical.filter((_, i) => i !== idx) },
    }));
  };

  const updateDimension = (idx: number, updates: Partial<AxisItem>) => {
    setConfig((prev) => ({
      ...prev,
      axis: {
        ...prev.axis,
        dimension: prev.axis.dimension.map((d, i) => (i === idx ? { ...d, ...updates } : d)),
      },
    }));
  };

  const updateNumerical = (idx: number, updates: Partial<AxisItem>) => {
    setConfig((prev) => ({
      ...prev,
      axis: {
        ...prev.axis,
        numerical: prev.axis.numerical.map((n, i) => (i === idx ? { ...n, ...updates } : n)),
      },
    }));
  };

  const updateOption = (key: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      option: { ...prev.option, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!config.entity) {
      alert("请选择数据实体");
      return;
    }
    setSaving(true);
    try {
      await api.post("/chart/save", config);
      router.push("/dashboard");
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!config.entity) return;
    try {
      const data = await api.post("/chart/preview", config);
      setPreviewData(data);
    } catch {
      setPreviewData(null);
    }
  };

  const filteredFields = fields.filter((f) => {
    const name = f.field || f.name || "";
    const label = f.fieldLabel || f.label || name;
    const q = fieldSearch.toLowerCase();
    return name.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  });

  const currentType = config.type;
  const isTableType = ["TABLE", "DATALIST2"].includes(currentType);
  const needsNumerical = !isTableType && currentType !== "INDEX";

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b bg-gray-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
            className="text-base font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition">
            预览
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Data source */}
        <aside className="w-64 border-r bg-gray-50 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-white">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">数据实体</h3>
            <select
              value={config.entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择实体</option>
              {entities.map((e) => (
                <option key={e.name} value={e.name}>{e.label || e.name}</option>
              ))}
            </select>
          </div>
          <div className="p-3 border-b">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="搜索字段..."
                className="w-full pl-7 pr-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredFields.map((field, idx) => {
              const name = field.field || field.name || "";
              const label = field.fieldLabel || field.label || name;
              const type = field.type || "TEXT";
              const isNumeric = ["NUMBER", "DECIMAL", "INT", "LONG"].includes(type.toUpperCase());

              return (
                <div key={idx} className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white text-sm group">
                  <span className="flex-1 truncate text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">{type}</span>
                  {!isTableType && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => addDimension(field)}
                        className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="添加为维度"
                      >
                        维
                      </button>
                      {isNumeric && (
                        <button
                          onClick={() => addNumerical(field)}
                          className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          title="添加为指标"
                        >
                          值
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {fields.length === 0 && config.entity && (
              <p className="text-center text-gray-400 text-sm py-4">加载字段中...</p>
            )}
            {!config.entity && (
              <p className="text-center text-gray-400 text-sm py-4">请先选择数据实体</p>
            )}
          </div>
        </aside>

        {/* Center: Axis editor & Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Axis editor */}
          <div className="flex-shrink-0 border-b p-4">
            <div className="flex gap-6">
              {/* Dimension axis */}
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  维度轴 {isTableType && "(列字段)"}
                </h4>
                <div className="border rounded-lg min-h-[60px] p-2 space-y-1">
                  {config.axis.dimension.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 text-center">从左侧拖入字段</p>
                  ) : (
                    config.axis.dimension.map((dim, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded px-2 py-1.5 text-sm">
                        <span className="text-blue-700 font-medium flex-1 truncate">{dim.label}</span>
                        <select
                          value={dim.sort || ""}
                          onChange={(e) => updateDimension(idx, { sort: e.target.value })}
                          className="text-xs border rounded px-1 py-0.5"
                        >
                          <option value="">默认排序</option>
                          <option value="ASC">升序</option>
                          <option value="DESC">降序</option>
                        </select>
                        <input
                          type="number"
                          value={dim.maxItems || ""}
                          onChange={(e) => updateDimension(idx, { maxItems: parseInt(e.target.value) || undefined })}
                          placeholder="条数"
                          className="w-16 text-xs border rounded px-1 py-0.5"
                        />
                        <button onClick={() => removeDimension(idx)} className="text-gray-400 hover:text-red-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Numerical axis */}
              {needsNumerical && (
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">数值轴</h4>
                  <div className="border rounded-lg min-h-[60px] p-2 space-y-1">
                    {config.axis.numerical.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 text-center">从左侧拖入数值字段</p>
                    ) : (
                      config.axis.numerical.map((num, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-green-50 rounded px-2 py-1.5 text-sm">
                          <span className="text-green-700 font-medium flex-1 truncate">{num.label}</span>
                          <select
                            value={num.calc || "COUNT"}
                            onChange={(e) => updateNumerical(idx, { calc: e.target.value })}
                            className="text-xs border rounded px-1 py-0.5"
                          >
                            {CALC_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <button onClick={() => removeNumerical(idx)} className="text-gray-400 hover:text-red-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {previewData ? (
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{config.title} - 预览</h3>
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>图表预览（需要 ECharts 渲染）</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-5xl mb-4">📊</div>
                  <p>配置图表参数后点击"预览"查看效果</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chart options */}
        <aside className="w-72 border-l bg-gray-50 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-white">
            <h3 className="text-sm font-semibold text-gray-700">图表配置</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Chart type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">图表类型</label>
              <div className="grid grid-cols-4 gap-1">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => setConfig((prev) => ({ ...prev, type: ct.key }))}
                    className={`flex flex-col items-center p-2 rounded text-xs transition ${
                      config.type === ct.key
                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                        : "hover:bg-white text-gray-600"
                    }`}
                  >
                    <span className="text-lg mb-0.5">{ct.icon}</span>
                    <span className="truncate w-full text-center">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Common options */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">通用选项</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.showLegend}
                    onChange={(e) => updateOption("showLegend", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">显示图例</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.showLabel}
                    onChange={(e) => updateOption("showLabel", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">显示标签</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.showGrid}
                    onChange={(e) => updateOption("showGrid", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">显示网格</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.dataZoom}
                    onChange={(e) => updateOption("dataZoom", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">数据缩放</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.sortByValue}
                    onChange={(e) => updateOption("sortByValue", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">按值排序</span>
                </label>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">主题风格</label>
              <select
                value={(config.option.themeStyle as string) || "default"}
                onChange={(e) => updateOption("themeStyle", e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-sm"
              >
                <option value="default">默认</option>
                <option value="dark">暗色</option>
                <option value="roma">罗马</option>
                <option value="infographic">信息图</option>
                <option value="macarons">马卡龙</option>
                <option value="vintage">复古</option>
              </select>
            </div>

            {/* Background color */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">背景颜色</label>
              <input
                type="color"
                value={(config.option.bgColor as string) || "#ffffff"}
                onChange={(e) => updateOption("bgColor", e.target.value)}
                className="w-full h-8 border rounded cursor-pointer"
              />
            </div>

            {/* INDEX-specific options */}
            {currentType === "INDEX" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">指标颜色</label>
                  <input
                    type="color"
                    value={(config.option.indexColor as string) || "#2563eb"}
                    onChange={(e) => updateOption("indexColor", e.target.value)}
                    className="w-full h-8 border rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">指标图标</label>
                  <input
                    type="text"
                    value={(config.option.indexIcon as string) || ""}
                    onChange={(e) => updateOption("indexIcon", e.target.value)}
                    placeholder="mdi-chart-line"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  />
                </div>
              </>
            )}

            {/* CNMAP-specific options */}
            {currentType === "CNMAP" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">地图主题</label>
                <select
                  value={(config.option.mapTheme as string) || "blue"}
                  onChange={(e) => updateOption("mapTheme", e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="blue">蓝色</option>
                  <option value="green">绿色</option>
                  <option value="red">红色</option>
                  <option value="yellow">黄色</option>
                </select>
              </div>
            )}

            {/* TABLE-specific options */}
            {isTableType && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.showNo}
                    onChange={(e) => updateOption("showNo", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">显示序号</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.option.showSums}
                    onChange={(e) => updateOption("showSums", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700">显示合计</span>
                </label>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ChartDesignPage() {
  return (
    <Suspense>
      <ChartDesignContent />
    </Suspense>
  );
}
