"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const entity = params.entity as string;
  const recordId = params.recordId as string;

  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getFields(entity)
      .then((data) => setFields(Array.isArray(data) ? data : []))
      .catch(() => {});

    api
      .getRecord(entity, recordId)
      .then((data) => {
        const d = data as Record<string, unknown>;
        setRecord((d.record || d.data || d) as Record<string, unknown>);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [entity, recordId]);

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

  const getFieldValue = (record: Record<string, unknown>, field: Record<string, unknown>) => {
    const name = (field.field || field.name || "") as string;
    const value = record[name];
    if (value === null || value === undefined) return <span className="text-gray-400">-</span>;
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      return <span>{(v.text || v.label || v.name || JSON.stringify(value)) as string}</span>;
    }
    return <span>{String(value)}</span>;
  };

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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
        <Link
          href={`/entities/${entity}`}
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          ← 返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
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
        <span className="text-gray-800">详情</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {entity} 记录详情
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
          >
            {deleting ? "删除中..." : "删除"}
          </button>
          <Link
            href={`/entities/${entity}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            返回列表
          </Link>
        </div>
      </div>

      {/* Record fields */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {fields.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无字段信息</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fields.map((field, idx) => {
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
                    {record ? getFieldValue(record, field) : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
