"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

/* ── 类型定义 ─────────────────────────────────────────── */
interface EntityField {
  field?: string;
  name?: string;
  fieldLabel?: string;
  label?: string;
  type?: string;
  displayType?: string;
  nullable?: boolean;
  creatable?: boolean;
  updatable?: boolean;
}

interface RecordData {
  [key: string]: unknown;
}

/* ── 主页面组件 ───────────────────────────────────────── */
export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;
  const recordId = params.recordId as string;

  const [record, setRecord] = useState<RecordData | null>(null);
  const [fields, setFields] = useState<EntityField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RecordData[]>([]);

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchRecord = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fieldsRes, recordRes] = await Promise.all([
        api.getFields(entity),
        api.getRecord(entity, recordId),
      ]);
      setFields(Array.isArray(fieldsRes) ? fieldsRes : []);
      const d = recordRes as Record<string, unknown>;
      const rec = (d.record || d.data || d) as RecordData;
      setRecord(rec);
      setEditData({ ...rec });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [entity, recordId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  /* ── 操作处理 ─────────────────────────────────────── */
  const handleDelete = async () => {
    if (!confirm("确定删除此记录？")) return;
    setDeleting(true);
    try {
      await api.deleteRecord(entity, recordId);
      router.push(`/entities/${entity}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败");
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveRecord(entity, { ...editData, id: recordId });
      setIsEditing(false);
      fetchRecord();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      await api.post(`/app/${entity}/record-share`, { record_id: recordId });
      alert("共享成功");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "共享失败");
    }
  };

  const handleAssign = async () => {
    const userId = prompt("请输入分配用户ID:");
    if (!userId) return;
    try {
      await api.post(`/app/${entity}/record-assign`, {
        record_id: recordId,
        assignee: userId,
      });
      alert("分配成功");
      fetchRecord();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "分配失败");
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/app/${entity}/record-history?record=${recordId}`);
      const data = res as Record<string, unknown>;
      setHistory(((data.data || data.items || []) as RecordData[]) || []);
      setShowHistory(true);
    } catch {
      setHistory([]);
      setShowHistory(true);
    }
  };

  /* ── 工具函数 ─────────────────────────────────────── */
  const getFieldValue = (rec: RecordData, field: EntityField) => {
    const name = (field.field || field.name || "") as string;
    const value = rec[name];
    if (value === null || value === undefined)
      return <span className="text-gray-400">-</span>;
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      if (v.id) {
        return (
          <Link
            href={`/entities/${v.entity || entity}/${v.id}`}
            className="text-blue-600 hover:underline"
          >
            {(v.text || v.label || v.name || String(v.id)) as string}
          </Link>
        );
      }
      return <span>{(v.text || v.label || v.name || JSON.stringify(value)) as string}</span>;
    }
    // 布尔值
    if (typeof value === "boolean") return <span>{value ? "是" : "否"}</span>;
    return <span>{String(value)}</span>;
  };

  const getUserDisplay = (userData: unknown): string => {
    if (!userData) return "-";
    if (typeof userData === "string") return userData;
    if (typeof userData === "object") {
      const u = userData as Record<string, unknown>;
      return (u.name || u.fullName || u.text || u.id || "-") as string;
    }
    return String(userData);
  };

  const formatDate = (dateStr: unknown): string => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr as string).toLocaleString("zh-CN");
    } catch {
      return String(dateStr);
    }
  };

  /* ── 加载中/错误状态 ─────────────────────────────── */
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        <Link
          href={`/entities/${entity}`}
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          ← 返回列表
        </Link>
      </div>
    );
  }

  if (!record) return null;

  // 分类字段：基本信息 vs 其他
  const basicFields = fields.filter((f) => {
    const type = (f.displayType || f.type || "").toUpperCase();
    return !["NTEXT", "FILE", "IMAGE", "ATTACHMENT"].includes(type);
  });
  const detailFields = fields.filter((f) => {
    const type = (f.displayType || f.type || "").toUpperCase();
    return ["NTEXT", "FILE", "IMAGE", "ATTACHMENT"].includes(type);
  });

  return (
    <div className="flex flex-col h-full">
      {/* 视图头部 */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/entities" className="hover:text-blue-600">
              业务实体
            </Link>
            <span>/</span>
            <Link
              href={`/entities/${entity}`}
              className="hover:text-blue-600"
            >
              {entity}
            </Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">
              {(record.name || record.subject || record.id || recordId) as string}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 返回列表 */}
            <Link
              href={`/entities/${entity}`}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              返回列表
            </Link>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* 左侧：记录内容 */}
          <div className="flex-1 p-6">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 标签页 */}
            <div className="mb-4">
              <div className="flex gap-0 border-b">
                <button
                  onClick={() => setActiveTab(0)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 0
                      ? "text-blue-600 border-blue-600"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  详情
                </button>
                {detailFields.length > 0 && (
                  <button
                    onClick={() => setActiveTab(1)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 1
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    附件/备注
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveTab(2);
                    loadHistory();
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 2
                      ? "text-blue-600 border-blue-600"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  修改历史
                </button>
              </div>
            </div>

            {/* 详情标签页 */}
            {activeTab === 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {isEditing ? (
                  /* 编辑模式 */
                  <div className="divide-y divide-gray-100">
                    {fields.map((field, idx) => {
                      const name = (field.field || field.name || "") as string;
                      const label = (field.fieldLabel || field.label || name) as string;
                      const type = (field.displayType || field.type || "TEXT") as string;
                      if (field.updatable === false) return null;
                      return (
                        <div
                          key={idx}
                          className="flex items-start px-6 py-4"
                        >
                          <div className="w-40 shrink-0 text-sm font-medium text-gray-500 pt-2">
                            {label}
                            {field.nullable === false && (
                              <span className="text-red-500 ml-0.5">*</span>
                            )}
                          </div>
                          <div className="flex-1">
                            {type === "TEXTAREA" || type === "NTEXT" ? (
                              <textarea
                                value={
                                  (editData[name] as string) || ""
                                }
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [name]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                            ) : type === "BOOL" ? (
                              <select
                                value={String(editData[name] ?? "")}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [name]: e.target.value === "true",
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">请选择</option>
                                <option value="true">是</option>
                                <option value="false">否</option>
                              </select>
                            ) : type === "DATE" || type === "DATETIME" ? (
                              <input
                                type={
                                  type === "DATETIME"
                                    ? "datetime-local"
                                    : "date"
                                }
                                value={(editData[name] as string) || ""}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [name]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <input
                                type="text"
                                value={
                                  typeof editData[name] === "object"
                                    ? JSON.stringify(editData[name])
                                    : String(editData[name] ?? "")
                                }
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [name]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-end gap-3 px-6 py-4">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditData({ ...record });
                        }}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 查看模式 */
                  <div className="divide-y divide-gray-100">
                    {basicFields.map((field, idx) => {
                      const label = (field.fieldLabel || field.label || field.field || "") as string;
                      return (
                        <div
                          key={idx}
                          className="flex items-start px-6 py-4 hover:bg-gray-50"
                        >
                          <div className="w-40 shrink-0 text-sm font-medium text-gray-500 pt-0.5">
                            {label}
                          </div>
                          <div className="flex-1 text-sm text-gray-800">
                            {getFieldValue(record, field)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 附件/备注标签页 */}
            {activeTab === 1 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                {detailFields.map((field, idx) => {
                  const label = (field.fieldLabel || field.label || field.field || "") as string;
                  return (
                    <div key={idx} className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </h4>
                      <div className="text-sm text-gray-800">
                        {getFieldValue(record, field)}
                      </div>
                    </div>
                  );
                })}
                {detailFields.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    暂无附件或备注
                  </div>
                )}
              </div>
            )}

            {/* 修改历史标签页 */}
            {activeTab === 2 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {history.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    {showHistory ? "暂无修改记录" : "加载中..."}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {history.map((item, idx) => (
                      <div key={idx} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {getUserDisplay(item.operator || item.createdBy)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(item.modificationTime || item.createdOn)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {(item.content || item.summary || JSON.stringify(item)) as string}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：操作面板 */}
          <div className="w-72 border-l bg-white p-4 flex-shrink-0 hidden lg:block">
            {/* 操作按钮 */}
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                操作
              </h4>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isEditing}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? "删除中..." : "删除"}
              </button>
              <button
                onClick={handleAssign}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                分配
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                共享
              </button>
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                打印
              </button>
            </div>

            {/* 用户信息 */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                用户信息
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">所属用户</span>
                  <span className="text-gray-800">
                    {getUserDisplay(record.owningUser || record.createdBy)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">所属部门</span>
                  <span className="text-gray-800">
                    {getUserDisplay(record.owningDepartment || record.dept)}
                  </span>
                </div>
                {record.sharedTo && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">共享给</span>
                    <span className="text-gray-800">
                      {getUserDisplay(record.sharedTo)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 日期信息 */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                时间信息
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span className="text-gray-800">
                    {formatDate(record.createdOn || record.createdTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">修改时间</span>
                  <span className="text-gray-800">
                    {formatDate(record.modifiedOn || record.modifiedTime)}
                  </span>
                </div>
                {record.createdBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">创建人</span>
                    <span className="text-gray-800">
                      {getUserDisplay(record.createdBy)}
                    </span>
                  </div>
                )}
                {record.modifiedBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">修改人</span>
                    <span className="text-gray-800">
                      {getUserDisplay(record.modifiedBy)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 记录ID */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                记录信息
              </h4>
              <div className="text-xs text-gray-400 font-mono break-all">
                ID: {recordId}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
