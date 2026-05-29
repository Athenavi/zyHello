"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface FlowNode {
  id: string;
  name: string;
  type: string;
  approverMode?: string;
  approverSpec?: string[];
  editableFields?: string[];
  nextNode?: string;
}

export default function ApprovalDesignPage() {
  const params = useParams();
  const router = useRouter();
  const approvalId = params.id as string;
  const isNew = approvalId === "new";

  const [name, setName] = useState("未命名");
  const [isDisabled, setIsDisabled] = useState(false);
  const [applyEntity, setApplyEntity] = useState("");
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const fetchApproval = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const data = await api.getApproval(approvalId);
      const d = data as Record<string, unknown>;
      setName((d.name as string) || "未命名");
      setIsDisabled(!!d.isDisabled);
      setApplyEntity((d.applyEntity as string) || "");
      if (d.flowDefinition && typeof d.flowDefinition === "object") {
        const fd = d.flowDefinition as Record<string, unknown>;
        setFlowNodes((fd.nodes as FlowNode[]) || []);
      }
    } catch (e) {
      console.error("Failed to load approval", e);
    }
    setLoading(false);
  }, [approvalId, isNew]);

  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        id: isNew ? undefined : approvalId,
        name,
        applyEntity,
        flowDefinition: { nodes: flowNodes },
      };
      await api.saveApproval(data);
      if (isNew) {
        router.push("/admin/robot/approvals");
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleCopy = async () => {
    if (!confirm("确定复制此审批流程？")) return;
    try {
      const data: Record<string, unknown> = {
        name: `${name} (副本)`,
        applyEntity,
        flowDefinition: { nodes: flowNodes },
      };
      await api.saveApproval(data);
      router.push("/admin/robot/approvals");
    } catch {
      alert("复制失败");
    }
  };

  const handleAddNode = () => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      name: `步骤 ${flowNodes.length + 1}`,
      type: "approve",
      approverMode: "SPEC_USER",
      approverSpec: [],
      editableFields: [],
    };
    setFlowNodes([...flowNodes, newNode]);
    setSelectedNode(newNode);
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlowNodes(flowNodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));
    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, ...updates });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!confirm("确定删除此步骤？")) return;
    setFlowNodes(flowNodes.filter((n) => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
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
              审批流程
              <span className="text-base font-normal text-gray-500 ml-2">{name}</span>
              {isDisabled && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">未启用</span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCopy(!showCopy)}
              className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              <span className="mdi mdi-dots-vertical text-lg"></span>
            </button>
            {showCopy && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 w-36">
                <button
                  onClick={handleCopy}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="mdi mdi-content-copy"></span>
                  复制
                </button>
                {!isNew && (
                  <button
                    onClick={handleSave}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="mdi mdi-content-save"></span>
                    强制保存
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Flow Design Area */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700">流程设计</h2>
                <button
                  onClick={handleAddNode}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                >
                  <span className="mdi mdi-plus mr-1"></span>
                  添加步骤
                </button>
              </div>
            </div>
            <div className="p-6">
              {flowNodes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="mdi mdi-sitemap text-4xl mb-2 block"></span>
                  <p className="text-sm">暂无审批步骤，请点击"添加步骤"开始设计</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Start node */}
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-right text-xs text-gray-500">发起人</div>
                    <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700">
                      <span className="mdi mdi-account-arrow-right mr-1"></span>
                      提交审批申请
                    </div>
                  </div>

                  {flowNodes.map((node, idx) => (
                    <div key={node.id}>
                      {/* Arrow */}
                      <div className="flex items-center gap-3 my-1">
                        <div className="w-28"></div>
                        <div className="flex-1 flex justify-center">
                          <span className="mdi mdi-arrow-down text-gray-400 text-xl"></span>
                        </div>
                      </div>
                      {/* Node */}
                      <div className="flex items-start gap-3">
                        <div className="w-28 text-right text-xs text-gray-500 pt-3">
                          步骤 {idx + 1}
                        </div>
                        <div
                          className={`flex-1 px-4 py-3 border rounded-lg cursor-pointer transition ${
                            selectedNode?.id === node.id
                              ? "bg-orange-50 border-orange-300"
                              : "bg-white border-gray-200 hover:border-orange-300"
                          }`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{node.name}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {node.type === "approve" ? "审批" : node.type === "cc" ? "抄送" : node.type}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <span className="mdi mdi-delete text-sm"></span>
                            </button>
                          </div>
                          {node.approverSpec && node.approverSpec.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                              审批人: {node.approverSpec.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* End node */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="w-28"></div>
                    <div className="flex-1 flex justify-center">
                      <span className="mdi mdi-arrow-down text-gray-400 text-xl"></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-right text-xs text-gray-500">结束</div>
                    <div className="flex-1 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-700">
                      <span className="mdi mdi-check-circle mr-1"></span>
                      审批完成
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Config Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border sticky top-6">
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-700">
                {selectedNode ? `步骤配置 - ${selectedNode.name}` : "基本信息"}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {!selectedNode ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">流程名称</label>
                    <input
                      type="text"
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">应用实体</label>
                    <input
                      type="text"
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={applyEntity}
                      onChange={(e) => setApplyEntity(e.target.value)}
                      placeholder="实体名称"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">步骤名称</label>
                    <input
                      type="text"
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedNode.name}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">步骤类型</label>
                    <select
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedNode.type}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { type: e.target.value })}
                    >
                      <option value="approve">审批</option>
                      <option value="cc">抄送</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">审批方式</label>
                    <select
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedNode.approverMode || "SPEC_USER"}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { approverMode: e.target.value })}
                    >
                      <option value="SPEC_USER">指定用户</option>
                      <option value="SELF">发起人自己</option>
                      <option value="SUPERIOR">直属上级</option>
                      <option value="ROLE">指定角色</option>
                      <option value="DEPT">指定部门</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">可编辑字段</label>
                    <p className="text-xs text-gray-400 mb-2">留空表示所有字段只读</p>
                    <textarea
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                      value={(selectedNode.editableFields || []).join("\n")}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          editableFields: e.target.value.split("\n").filter((f) => f.trim()),
                        })
                      }
                      placeholder="每行一个字段名"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
