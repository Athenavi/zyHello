"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface Plan {
  id: string;
  planName: string;
  seq: number;
}

export default function AdminProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [scope, setScope] = useState(1);
  const [principal, setPrincipal] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [members, setMembers] = useState("");
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState(1);

  const [cardFields, setCardFields] = useState<string[]>(["createdOn", "endTime", "_tag"]);

  const CARD_FIELD_OPTIONS = [
    { value: "createdBy", label: "创建人" },
    { value: "createdOn", label: "创建时间" },
    { value: "modifiedOn", label: "更新时间" },
    { value: "endTime", label: "完成时间" },
    { value: "description", label: "详情" },
    { value: "attachments", label: "附件" },
    { value: "_tag", label: "标签" },
  ];

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAdminProject(projectId);
      setProjectName(data.projectName || "");
      setScope(data.scope || 1);
      setPrincipal(data.principal || "");
      setPrincipalName(data.principalName || "");
      setMembers(data.members || "");
      setMemberNames(data.memberNames || []);
      setPlans(data.plans || []);
      setStatus(data.status || 1);
      if (data.extraDefinition?.cardFields) {
        setCardFields(data.extraDefinition.cardFields);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.saveAdminProject(projectId, {
        scope,
        principal,
        members,
        extraDefinition: { cardFields },
      });
      alert("保存成功");
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`确定要${status === 1 ? "归档" : "取消归档"}该项目吗？`)) return;
    try {
      await api.saveAdminProject(projectId, { status: status === 1 ? 2 : 1 });
      setStatus(status === 1 ? 2 : 1);
    } catch {
      alert("操作失败");
    }
  };

  const toggleCardField = (field: string) => {
    setCardFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleAddPlan = async () => {
    const name = prompt("请输入计划名称");
    if (!name) return;
    try {
      const data = await api.addProjectPlan({ projectId, name });
      setPlans((prev) => [...prev, data]);
    } catch {
      alert("添加失败");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("确定要删除此计划吗？")) return;
    try {
      await api.deleteProjectPlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch {
      alert("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            项目
            <span className="text-sm font-normal text-gray-500 ml-2">{projectName}</span>
          </h1>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="space-y-6 max-w-3xl">
            {/* 项目范围 */}
            <div className="flex items-start">
              <label className="w-32 text-sm text-gray-600 text-right pt-2 pr-4">项目范围</label>
              <div className="flex-1 pt-1">
                <label className="inline-flex items-center mr-6 cursor-pointer">
                  <input
                    type="radio"
                    checked={scope === 1}
                    onChange={() => setScope(1)}
                    className="mr-2"
                  />
                  <span className="text-sm">公开 (所有人可见，仅成员可编辑)</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={scope === 2}
                    onChange={() => setScope(2)}
                    className="mr-2"
                  />
                  <span className="text-sm">私有 (仅成员可见和编辑)</span>
                </label>
              </div>
            </div>

            {/* 负责人 */}
            <div className="flex items-start">
              <label className="w-32 text-sm text-gray-600 text-right pt-2 pr-4">负责人</label>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{principalName || principal || "未设置"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">负责人拥有对任务的管理权限</p>
              </div>
            </div>

            {/* 项目成员 */}
            <div className="flex items-start">
              <label className="w-32 text-sm text-gray-600 text-right pt-2 pr-4">项目成员</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {memberNames.length > 0 ? (
                    memberNames.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm text-gray-700"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">暂无成员</span>
                  )}
                </div>
              </div>
            </div>

            {/* 任务面板 */}
            <div className="flex items-start">
              <label className="w-32 text-sm text-gray-600 text-right pt-2 pr-4">任务面板</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3 bg-gray-50 p-3 rounded min-h-[60px]">
                  {plans.length === 0 ? (
                    <span className="text-sm text-gray-400">暂无计划</span>
                  ) : (
                    plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-white border rounded px-3 py-2 text-sm flex items-center gap-2 shadow-sm"
                      >
                        <span>{plan.planName}</span>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={handleAddPlan}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  + 添加
                </button>
              </div>
            </div>

            {/* 任务卡字段显示 */}
            <div className="flex items-start">
              <label className="w-32 text-sm text-gray-600 text-right pt-2 pr-4">任务卡字段显示</label>
              <div className="flex-1 flex flex-wrap gap-x-6 gap-y-2">
                {CARD_FIELD_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardFields.includes(opt.value)}
                      onChange={() => toggleCardField(opt.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-start">
              <div className="w-32" />
              <div className="flex-1 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  {status === 1 ? "归档" : "取消归档"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
