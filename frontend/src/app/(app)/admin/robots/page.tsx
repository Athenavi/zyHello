"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminRobotsPage() {
  const [triggers, setTriggers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listTriggers()
      .then((data) => {
        const d = data as Record<string, unknown>;
        setTriggers(
          Array.isArray(d) ? d : (d.data || d.items || []) as Record<string, unknown>[]
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const actionLabels: Record<string, string> = {
    "1": "新建时触发",
    "2": "删除时触发",
    "3": "更新时触发",
    "4": "定时触发",
    "5": "审批通过触发",
    "10": "发送通知",
    "20": "字段更新",
    "30": "分组聚合",
    "40": "数据校验",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">触发器</h1>
          <p className="text-gray-500 mt-1">管理自动化触发器和规则</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
          + 新建触发器
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                触发实体
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                触发动作
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                执行操作
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            ) : triggers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无触发器
                </td>
              </tr>
            ) : (
              triggers.map((trigger, idx) => {
                const t = trigger as Record<string, unknown>;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {(t.name || t.triggerName || "未命名") as string}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {(t.entity || t.bindEntity || "-") as string}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {actionLabels[(t.when as string) || ""] || (t.when as string) || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {actionLabels[(t.action as string) || ""] || (t.actionType as string) || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          t.disabled
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {t.disabled ? "禁用" : "启用"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
