"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

const WHEN_OPTIONS = [
  { value: 1, label: "新建时" },
  { value: 4, label: "更新时" },
  { value: 2, label: "删除时" },
  { value: 16, label: "分配时" },
  { value: 32, label: "共享时" },
  { value: 64, label: "取消共享时" },
  { value: 128, label: "审批通过时" },
  { value: 256, label: "审批撤销时" },
  { value: 1024, label: "审批提交时" },
  { value: 2048, label: "审批驳回/撤回时" },
  { value: 512, label: "定期执行" },
];

const TIMER_OPTIONS = [
  { value: "D", label: "每天" },
  { value: "H", label: "每小时" },
  { value: "M", label: "每月" },
  { value: "cron", label: "高级表达式" },
];

const ACTION_TYPES: Record<string, string> = {
  "10": "发送通知",
  "20": "字段更新",
  "30": "分组聚合",
  "40": "数据校验",
  "50": "自动审批",
  "60": "自动撤销审批",
  "70": "发送Webhook",
  "80": "调用API",
  "90": "记录转换",
  "100": "创建跟进记录",
  "110": "自动分配",
};

export default function TriggerDesignPage() {
  const params = useParams();
  const router = useRouter();
  const triggerId = params.id as string;
  const isNew = triggerId === "new";

  const [name, setName] = useState("未命名");
  const [isDisabled, setIsDisabled] = useState(false);
  const [sourceEntity, setSourceEntity] = useState("");
  const [sourceEntityLabel, setSourceEntityLabel] = useState("");
  const [actionType, setActionType] = useState("");
  const [actionTypeLabel, setActionTypeLabel] = useState("");
  const [entities, setEntities] = useState<{ name: string; label: string }[]>([]);
  const [when, setWhen] = useState(0);
  const [whenTimer, setWhenTimer] = useState("");
  const [whenFilter, setWhenFilter] = useState<Record<string, unknown> | null>(null);
  const [actionContent, setActionContent] = useState<Record<string, unknown> | null>(null);
  const [priority, setPriority] = useState(1);
  const [asyncMode, setAsyncMode] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Timer state
  const [timerType, setTimerType] = useState("D");
  const [timerCount, setTimerCount] = useState("1");
  const [timerStartHour, setTimerStartHour] = useState("0");
  const [timerEndHour, setTimerEndHour] = useState("23");
  const [cronExpression, setCronExpression] = useState("0 0 * * * ?");

  // Update fields filter state
  const [updateFields, setUpdateFields] = useState<string[]>([]);

  const loadEntities = useCallback(async () => {
    try {
      const res = await api.getEntities();
      const d = (res as Record<string, unknown>)?.data || res;
      const list = (Array.isArray(d) ? d : []) as { name: string; label: string }[];
      setEntities(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  const fetchTrigger = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const data = await api.getTrigger(triggerId);
      const rawData = data as Record<string, unknown>;
      // Backend may wrap in { error_code, data } or return directly
      const d = (rawData.data || rawData) as Record<string, unknown>;
      setName((d.name as string) || "未命名");
      setIsDisabled(!!d.isDisabled);
      setSourceEntity((d.belongEntity as string) || (d.sourceEntity as string) || "");
      setSourceEntityLabel(d.belongEntity as string || d.sourceEntity as string || "");
      const at = String(d.actionType || "");
      setActionType(at);
      setActionTypeLabel(ACTION_TYPES[at] || at || "");
      setWhen((d.whenType as number) || (d.when as number) || 0);
      setWhenTimer((d.whenTimer as string) || "");
      setWhenFilter((d.whenFilter as Record<string, unknown>) || null);
      setActionContent((d.actionContent as Record<string, unknown>) || null);
      setPriority((d.priority as number) ?? 1);
      setAsyncMode(!!d.asyncMode);

      // Parse timer
      if (d.whenTimer && typeof d.whenTimer === "string") {
        const parts = d.whenTimer.split(":");
        if (parts.length >= 1) setTimerType(parts[0] || "D");
        if (parts.length >= 2) setTimerCount(parts[1] || "1");
        if (parts.length >= 3) setTimerStartHour(parts[2] || "0");
        if (parts.length >= 4) setTimerEndHour(parts[3] || "23");
        if (parts[0] === "cron" && parts.length >= 2) {
          setCronExpression(parts.slice(1).join(":") || "0 0 * * * ?");
        }
      }

      if (d.when && typeof d.when === "number") {
        const fields: string[] = [];
        const raw = d.when as number;
        // Update field flag is in higher bits
        if (raw & 4) {
          // Has update action - fields may be in extra data
        }
        setUpdateFields(fields);
      }
    } catch (e) {
      console.error("Failed to load trigger", e);
    }
    setLoading(false);
  }, [triggerId, isNew]);

  useEffect(() => {
    fetchTrigger();
  }, [fetchTrigger]);

  const handleWhenToggle = (value: number) => {
    setWhen((prev) => (prev & value) ? prev & ~value : prev | value);
  };

  const buildWhenTimer = (): string => {
    if (!(when & 512)) return "";
    if (timerType === "cron") return `cron:${cronExpression}`;
    return `${timerType}:${timerCount}:${timerStartHour}:${timerEndHour}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        ...(isNew ? {} : { configId: triggerId }),
        name,
        belongEntity: sourceEntity,
        actionType,
        whenType: when,
        whenTimer: buildWhenTimer(),
        whenFilter,
        actionContent,
        isDisabled,
      };
      await api.saveTrigger(data);
      if (isNew) {
        router.push("/admin/robots");
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleExecuteNow = async () => {
    if (isNew || !triggerId) return;
    if (!confirm("确定立即执行此触发器？")) return;
    try {
      await api.post(`/admin/robot/trigger/${triggerId}/execute`);
      alert("已提交执行");
    } catch {
      alert("执行失败");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-20">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <span className="mdi mdi-arrow-left text-xl"></span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              触发器
              <span className="text-base font-normal text-gray-500 ml-2">{name}</span>
              {isDisabled && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">未启用</span>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200"></div>

            {/* Section 1: When action happens */}
            <div className="relative pl-16 pb-10">
              <div className="absolute left-4 top-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">
                  <span className="mdi mdi-lightning-bolt mr-1"></span>
                  当发生动作
                </h3>

                <div className="space-y-4">
                  {/* Source Entity */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-2">源实体</label>
                    <div className="flex-1">
                      <select
                        value={sourceEntity}
                        onChange={(e) => { setSourceEntity(e.target.value); setSourceEntityLabel(e.target.value); }}
                        className="w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">选择实体</option>
                        {entities.map((e) => (
                          <option key={e.name} value={e.name}>{e.label || e.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Trigger Actions */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-1">触发动作</label>
                    <div className="flex-1 space-y-2">
                      {/* Row 1: Basic CRUD */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {WHEN_OPTIONS.slice(0, 3).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded"
                              checked={!!(when & opt.value)}
                              onChange={() => handleWhenToggle(opt.value)}
                            />
                            {opt.label}
                          </label>
                        ))}
                        {when & 4 && (
                          <button className="text-xs text-blue-600 hover:underline ml-1" title="指定字段">
                            <span className="mdi mdi-cog text-sm"></span>
                          </button>
                        )}
                      </div>

                      {/* Row 2: Assign/Share */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {WHEN_OPTIONS.slice(3, 6).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded"
                              checked={!!(when & opt.value)}
                              onChange={() => handleWhenToggle(opt.value)}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      {/* Row 3: Approval */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {WHEN_OPTIONS.slice(6, 10).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded"
                              checked={!!(when & opt.value)}
                              onChange={() => handleWhenToggle(opt.value)}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      {/* Row 4: Periodic execution */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded"
                            checked={!!(when & 512)}
                            onChange={() => handleWhenToggle(512)}
                          />
                          定期执行
                        </label>

                        {when & 512 && (
                          <div className="ml-6 mt-3 p-3 bg-white border rounded-lg space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                className="text-sm border rounded px-2 py-1.5"
                                value={timerType}
                                onChange={(e) => setTimerType(e.target.value)}
                              >
                                {TIMER_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>

                              {timerType !== "cron" ? (
                                <span className="flex items-center gap-2 text-sm">
                                  <span>执行</span>
                                  <input
                                    type="text"
                                    className="w-16 text-sm border rounded px-2 py-1.5"
                                    value={timerCount}
                                    onChange={(e) => setTimerCount(e.target.value)}
                                    placeholder="1"
                                  />
                                  <span>次</span>
                                  <span className="ml-2">执行时段</span>
                                  <select
                                    className="text-sm border rounded px-2 py-1.5"
                                    value={timerStartHour}
                                    onChange={(e) => setTimerStartHour(e.target.value)}
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={String(i)}>{i}:00</option>
                                    ))}
                                  </select>
                                  <span>~</span>
                                  <select
                                    className="text-sm border rounded px-2 py-1.5"
                                    value={timerEndHour}
                                    onChange={(e) => setTimerEndHour(e.target.value)}
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={String(i)}>{i}:00</option>
                                    ))}
                                  </select>
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-sm">
                                  <span>CRON 表达式</span>
                                  <input
                                    type="text"
                                    className="w-40 text-sm border rounded px-2 py-1.5 font-mono font-bold"
                                    value={cronExpression}
                                    onChange={(e) => setCronExpression(e.target.value)}
                                    placeholder="0 0 * * * ?"
                                  />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              具体执行时间将在你设定的周期内平均分布。例如每天执行 2 次，其执行时间为 00:00 和 12:00
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter Condition */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-1">附加过滤条件</label>
                    <div className="flex-1">
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => alert("过滤条件编辑器将在后续版本中实现")}
                      >
                        点击设置
                      </button>
                      {whenFilter && (
                        <span className="ml-2 text-xs text-green-600">已设置过滤条件</span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">符合过滤条件的数据才会执行操作</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Then execute */}
            <div className="relative pl-16 pb-10">
              <div className="absolute left-4 top-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <h3 className="text-base font-bold text-green-700 mb-4">
                  <span className="mdi mdi-play-circle mr-1"></span>
                  就执行操作
                </h3>

                <div className="space-y-4">
                  {/* Action Type */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-2">执行操作</label>
                    <div className="flex-1">
                      <select
                        value={actionType}
                        onChange={(e) => { setActionType(e.target.value); setActionTypeLabel(ACTION_TYPES[e.target.value] || e.target.value); }}
                        className="w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">选择操作</option>
                        {Object.entries(ACTION_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Content */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-1">操作内容</label>
                    <div className="flex-1">
                      <div className="p-3 bg-white border rounded-lg min-h-[100px]">
                        {actionContent ? (
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(actionContent, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm text-gray-400">请配置操作内容</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-2">执行优先级</label>
                    <div className="flex-1">
                      <input
                        type="number"
                        className="w-48 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">优先级高 (数字大) 的会被先执行</p>
                    </div>
                  </div>

                  {/* Async Mode */}
                  <div className="flex items-start">
                    <label className="w-28 text-sm text-gray-600 text-right pr-3 pt-2">执行策略</label>
                    <div className="flex-1">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                          checked={asyncMode}
                          onChange={(e) => setAsyncMode(e.target.checked)}
                        />
                        延迟执行 (LAB)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Footer */}
            <div className="relative pl-16">
              <div className="absolute left-4 top-1 w-5 h-5 rounded-full bg-gray-400 border-2 border-white shadow"></div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>

                {!isNew && (
                  <div className="relative group">
                    <button className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition">
                      <span className="mdi mdi-dots-vertical text-lg"></span>
                    </button>
                    <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 w-36 hidden group-hover:block">
                      <button
                        onClick={handleExecuteNow}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="mdi mdi-play"></span>
                        立即执行
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
