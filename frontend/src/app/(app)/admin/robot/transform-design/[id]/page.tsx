"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  fillbackField?: string;
}

export default function TransformDesignPage() {
  const params = useParams();
  const router = useRouter();
  const transformId = params.id as string;
  const isNew = transformId === "new";

  const [name, setName] = useState("未命名");
  const [isDisabled, setIsDisabled] = useState(false);
  const [sourceEntity, setSourceEntity] = useState("");
  const [sourceDetailEntity, setSourceDetailEntity] = useState("");
  const [sourceDetailEntities, setSourceDetailEntities] = useState<string[]>([]);
  const [targetEntity, setTargetEntity] = useState("");
  const [targetDetailEntity, setTargetDetailEntity] = useState("");
  const [targetDetailEntities, setTargetDetailEntities] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [detailFieldMappings, setDetailFieldMappings] = useState<FieldMapping[]>([]);
  const [fillbackField, setFillbackField] = useState("");
  const [filterExpr, setFilterExpr] = useState<Record<string, unknown> | null>(null);
  const [one2nMode, setOne2nMode] = useState(false);
  const [one2nFields, setOne2nFields] = useState<string[]>([]);
  const [importsMode, setImportsMode] = useState(false);
  const [importsModeFields, setImportsModeFields] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"main" | "detail">("main");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const fetchTransform = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const data = await api.getTransform(transformId);
      const d = data as Record<string, unknown>;
      setName((d.name as string) || "未命名");
      setIsDisabled(!!d.isDisabled);
      setSourceEntity((d.sourceEntity as string) || "");
      setSourceDetailEntity((d.sourceDetailEntity as string) || "");
      setSourceDetailEntities((d.sourceDetailEntities as string[]) || []);
      setTargetEntity((d.targetEntity as string) || "");
      setTargetDetailEntity((d.targetDetailEntity as string) || "");
      setTargetDetailEntities((d.targetDetailEntities as string[]) || []);
      setFieldMappings((d.fieldsMapping as FieldMapping[]) || []);
      setDetailFieldMappings((d.detailFieldsMapping as FieldMapping[]) || []);
      setFillbackField((d.fillbackField as string) || "");
      setFilterExpr((d.filterExpr as Record<string, unknown>) || null);
      setOne2nMode(!!d.one2nMode);
      setOne2nFields((d.one2nFields as string[]) || []);
      setImportsMode(!!d.importsMode);
      setImportsModeFields((d.importsModeFields as string[]) || []);
    } catch (e) {
      console.error("Failed to load transform", e);
    }
    setLoading(false);
  }, [transformId, isNew]);

  useEffect(() => {
    fetchTransform();
  }, [fetchTransform]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        id: isNew ? undefined : transformId,
        name,
        sourceEntity,
        sourceDetailEntity,
        sourceDetailEntities,
        targetEntity,
        targetDetailEntity,
        targetDetailEntities,
        fieldsMapping: fieldMappings,
        detailFieldsMapping: detailFieldMappings,
        fillbackField,
        filterExpr,
        one2nMode,
        one2nFields,
        importsMode,
        importsModeFields,
      };
      await api.saveTransform(data);
      if (isNew) {
        router.push("/admin/robot/transforms");
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("保存失败");
    }
    setSaving(false);
  };

  const addFieldMapping = (isDetail = false) => {
    const newMapping: FieldMapping = { sourceField: "", targetField: "" };
    if (isDetail) {
      setDetailFieldMappings([...detailFieldMappings, newMapping]);
    } else {
      setFieldMappings([...fieldMappings, newMapping]);
    }
  };

  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: string, isDetail = false) => {
    const mappings = isDetail ? [...detailFieldMappings] : [...fieldMappings];
    mappings[index] = { ...mappings[index], [field]: value };
    if (isDetail) {
      setDetailFieldMappings(mappings);
    } else {
      setFieldMappings(mappings);
    }
  };

  const removeFieldMapping = (index: number, isDetail = false) => {
    if (isDetail) {
      setDetailFieldMappings(detailFieldMappings.filter((_, i) => i !== index));
    } else {
      setFieldMappings(fieldMappings.filter((_, i) => i !== index));
    }
  };

  const renderMappingTable = (mappings: FieldMapping[], isDetail: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">源字段</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-8">
              <span className="mdi mdi-arrow-right"></span>
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">目标字段</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">回填字段</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-16">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mappings.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">
                暂无字段映射，请点击下方按钮添加
              </td>
            </tr>
          ) : (
            mappings.map((m, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={m.sourceField}
                    onChange={(e) => updateFieldMapping(idx, "sourceField", e.target.value, isDetail)}
                    placeholder="源字段名"
                  />
                </td>
                <td className="px-3 py-2 text-center text-gray-400">
                  <span className="mdi mdi-arrow-right"></span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={m.targetField}
                    onChange={(e) => updateFieldMapping(idx, "targetField", e.target.value, isDetail)}
                    placeholder="目标字段名"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={m.fillbackField || ""}
                    onChange={(e) => updateFieldMapping(idx, "fillbackField", e.target.value, isDetail)}
                    placeholder="回填字段"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => removeFieldMapping(idx, isDetail)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <span className="mdi mdi-delete text-sm"></span>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

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
              记录转换
              <span className="text-base font-normal text-gray-500 ml-2">{name}</span>
              {isDisabled && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">未启用</span>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 space-y-6">
          {/* Entity Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-gray-500 block mb-1">源实体</label>
              <input
                type="text"
                className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sourceEntity}
                onChange={(e) => setSourceEntity(e.target.value)}
                placeholder="源实体名称"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">目标实体</label>
              <input
                type="text"
                className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                placeholder="目标实体名称"
              />
            </div>
          </div>

          {/* Filter */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">过滤条件</label>
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => alert("过滤条件编辑器将在后续版本中实现")}
            >
              点击设置
            </button>
            {filterExpr && (
              <span className="ml-2 text-xs text-green-600">已设置过滤条件</span>
            )}
          </div>

          {/* Field Mapping Tabs */}
          <div>
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === "main"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("main")}
              >
                主实体字段映射
              </button>
              {sourceDetailEntity && (
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                    activeTab === "detail"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("detail")}
                >
                  明细实体字段映射
                </button>
              )}
            </div>

            {activeTab === "main" ? (
              <div>
                {renderMappingTable(fieldMappings, false)}
                <button
                  onClick={() => addFieldMapping(false)}
                  className="mt-3 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition"
                >
                  <span className="mdi mdi-plus mr-1"></span>
                  添加映射
                </button>
              </div>
            ) : (
              <div>
                {renderMappingTable(detailFieldMappings, true)}
                <button
                  onClick={() => addFieldMapping(true)}
                  className="mt-3 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition"
                >
                  <span className="mdi mdi-plus mr-1"></span>
                  添加映射
                </button>
              </div>
            )}
          </div>

          {/* Fillback Field */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">回填字段</label>
            <input
              type="text"
              className="w-full max-w-md text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fillbackField}
              onChange={(e) => setFillbackField(e.target.value)}
              placeholder="转换后将目标记录ID回填到此字段"
            />
          </div>

          {/* One2N Mode */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded"
                checked={one2nMode}
                onChange={(e) => setOne2nMode(e.target.checked)}
              />
              多记录转换 (一对多)
            </label>
            {one2nMode && (
              <div className="ml-6 mt-3 p-3 bg-gray-50 border rounded-lg">
                <label className="text-xs text-gray-500 block mb-1">分组字段</label>
                <textarea
                  className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                  value={one2nFields.join("\n")}
                  onChange={(e) => setOne2nFields(e.target.value.split("\n").filter((f) => f.trim()))}
                  placeholder="每行一个字段名"
                />
              </div>
            )}
          </div>

          {/* Detail Import Options */}
          {targetDetailEntity && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded"
                  checked={importsMode}
                  onChange={(e) => setImportsMode(e.target.checked)}
                />
                导入明细记录
              </label>
              {importsMode && (
                <div className="ml-6 mt-3 p-3 bg-gray-50 border rounded-lg space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">目标明细实体</label>
                    <select
                      className="w-full text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={targetDetailEntity}
                      onChange={(e) => setTargetDetailEntity(e.target.value)}
                    >
                      <option value="">选择明细实体</option>
                      {targetDetailEntities.map((ent) => (
                        <option key={ent} value={ent}>{ent}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      导入时替换已有明细
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      导入前清空明细
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
