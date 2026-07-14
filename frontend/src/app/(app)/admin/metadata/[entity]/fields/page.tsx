"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

interface FieldItem {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  displayType: string;
  comments?: string;
  nullable?: boolean;
  creatable?: boolean;
  updatable?: boolean;
  repeatable?: boolean;
  buildin?: boolean;
}

export default function EntityFieldsPage() {
  const { entity } = useParams<{ entity: string }>();
  const router = useRouter();
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewField, setShowNewField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/metadata/field-list?entity=${entity}`);
      const d = data as Record<string, unknown>;
      const rawFields = ((d.data || d.fields || []) as Record<string, unknown>[]);
      const mapped: FieldItem[] = rawFields.map((f) => ({
        fieldId: (f.field_id || f.fieldId || f.field_name || f.fieldName || "") as string,
        fieldName: (f.field_name || f.fieldName || "") as string,
        fieldLabel: (f.field_label || f.fieldLabel || "") as string,
        displayType: (f.display_type || f.displayType || f.field_type || "TEXT") as string,
        comments: (f.comments || "") as string,
        nullable: f.nullable !== false,
        creatable: f.creatable !== false,
        updatable: f.updatable !== false,
        repeatable: f.repeatable !== false,
        buildin: !!f.is_builtin,
      }));
      setFields(mapped);
    } catch {
      setFields([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleDelete = async (fieldId: string) => {
    if (!confirm("确定删除此字段？")) return;
    try {
      await api.delete(`/admin/metadata/fields/${entity}/${fieldId}`);
      fetchFields();
    } catch {
      alert("删除失败");
    }
  };

  const handleNewField = async () => {
    if (!newFieldLabel) return;
    try {
      await api.post("/admin/metadata/field-create", {
        entityName: entity,
        fieldLabel: newFieldLabel,
        fieldName: newFieldName || undefined,
        fieldType: newFieldType,
      });
      setShowNewField(false);
      setNewFieldLabel("");
      setNewFieldName("");
      setNewFieldType("TEXT");
      fetchFields();
    } catch {
      alert("创建失败");
    }
  };

  const filtered = fields.filter(
    (f) =>
      !searchQuery ||
      f.fieldLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const FIELD_TYPES = [
    { value: "TEXT", label: "文本" },
    { value: "NTEXT", label: "多行文本" },
    { value: "PHONE", label: "电话" },
    { value: "EMAIL", label: "邮箱" },
    { value: "URL", label: "链接" },
    { value: "NUMBER", label: "整数" },
    { value: "DECIMAL", label: "小数" },
    { value: "DATE", label: "日期" },
    { value: "DATETIME", label: "日期时间" },
    { value: "TIME", label: "时间" },
    { value: "PICKLIST", label: "下拉列表" },
    { value: "MULTISELECT", label: "多选" },
    { value: "BOOL", label: "布尔" },
    { value: "REFERENCE", label: "引用" },
    { value: "N2NREFERENCE", label: "多引用" },
    { value: "IMAGE", label: "图片" },
    { value: "FILE", label: "文件" },
    { value: "CLASSIFICATION", label: "分类" },
    { value: "SERIES", label: "自动编号" },
    { value: "LOCATION", label: "位置" },
    { value: "BARCODE", label: "条码" },
    { value: "TAG", label: "标签" },
    { value: "STATE", label: "状态" },
    { value: "AVATAR", label: "头像" },
    { value: "ANYREFERENCE", label: "任意引用" },
  ];

  return (
    <div className="flex h-full">
      <EntitySidebar active="fields" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">字段管理</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="查询字段..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowNewField(true)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <span className="mdi mdi-plus"></span>
              添加字段
            </button>
          </div>
        </div>

        {/* New field dialog */}
        {showNewField && (
          <div className="mx-6 mb-4 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="字段名称"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="内部标识 (可选)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-40 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.value})
                  </option>
                ))}
              </select>
              <button onClick={handleNewField} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                确认
              </button>
              <button onClick={() => setShowNewField(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                取消
              </button>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: "25%" }}>字段名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: "16%" }}>内部标识</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: "16%" }}>类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: "120px" }}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-loading mdi-spin text-2xl"></span>
                      <p className="mt-1 text-sm">加载中...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-form-textbox text-2xl"></span>
                      <p className="mt-1 text-sm">暂无字段</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((field, idx) => (
                    <tr key={field.fieldId || idx} className={`hover:bg-gray-50 ${field.buildin ? "bg-yellow-50/30" : ""}`}>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {field.buildin && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">内置</span>}
                          <Link href={`/admin/metadata/${entity}/field/${field.fieldName}/edit`} className="text-blue-600 hover:underline font-medium">
                            {field.fieldLabel}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{field.fieldName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{field.displayType}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{field.comments || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/metadata/${entity}/field/${field.fieldName}/edit`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <span className="mdi mdi-pencil text-base"></span>
                          </Link>
                          {!field.buildin && (
                            <button
                              onClick={() => handleDelete(field.fieldId)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <span className="mdi mdi-delete text-base"></span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
