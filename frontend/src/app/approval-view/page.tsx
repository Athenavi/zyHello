"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface ApprovalNode {
  id: string;
  name: string;
  type: string;
  state?: string;
  approver?: string;
  approvedTime?: string;
  comments?: string;
}

interface ApprovalFlow {
  id: string;
  name: string;
  state: string;
  nodes: ApprovalNode[];
  recordId?: string;
  entity?: string;
}

function ApprovalViewContent() {
  const searchParams = useSearchParams();
  const [flow, setFlow] = useState<ApprovalFlow | null>(null);
  const [loading, setLoading] = useState(true);

  const flowId = searchParams.get("id") || "";

  useEffect(() => {
    if (flowId) {
      loadFlow();
    } else {
      setLoading(false);
    }
  }, [flowId]);

  const loadFlow = async () => {
    try {
      const data = await api.request(`/approval/flow/${flowId}`) as unknown as ApprovalFlow;
      setFlow(data);
    } catch {
      setFlow(null);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state?: string) => {
    switch (state) {
      case "APPROVED": return "bg-green-100 text-green-700 border-green-300";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-300";
      case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "PROCESSING": return "bg-blue-100 text-blue-700 border-blue-300";
      case "CANCELED": return "bg-gray-100 text-gray-500 border-gray-300";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStateLabel = (state?: string) => {
    switch (state) {
      case "APPROVED": return "已通过";
      case "REJECTED": return "已驳回";
      case "PENDING": return "待审批";
      case "PROCESSING": return "审批中";
      case "CANCELED": return "已撤回";
      default: return state || "未知";
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "START": return "🟢";
      case "END": return "🔴";
      case "APPROVAL": return "👤";
      case "CC": return "📧";
      case "CONDITION": return "🔀";
      case "NOTIFY": return "🔔";
      default: return "⚪";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">
              {flow?.name || "审批流程"}
            </h1>
            {flow?.state && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStateColor(flow.state)}`}>
                {getStateLabel(flow.state)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/robots"
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              流程设计 ↗
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !flow ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">未找到审批流程</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Flow canvas */}
            <div className="p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Nodes */}
                <div className="space-y-6">
                  {flow.nodes.map((node, idx) => (
                    <div key={node.id || idx} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white text-lg ${getStateColor(node.state)}`}>
                        {getNodeIcon(node.type)}
                      </div>

                      {/* Node content */}
                      <div className="flex-1 bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-800">{node.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStateColor(node.state)}`}>
                            {getStateLabel(node.state)}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <p>类型：{node.type}</p>
                          {node.approver && <p>审批人：{node.approver}</p>}
                          {node.approvedTime && <p>时间：{new Date(node.approvedTime).toLocaleString("zh-CN")}</p>}
                          {node.comments && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                              💬 {node.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer info */}
            {flow.recordId && (
              <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  关联记录：{flow.entity}/{flow.recordId}
                </span>
                <a
                  href={`/entities/${flow.entity}/${flow.recordId}`}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  查看记录 →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApprovalViewPage() {
  return (
    <Suspense>
      <ApprovalViewContent />
    </Suspense>
  );
}
