"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getEntities()
      .then((data) => setEntities(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">业务实体</h1>
        <p className="text-gray-500 mt-1">查看和管理所有业务实体数据</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : entities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-gray-500">暂无业务实体</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity, idx) => {
            const e = entity as Record<string, unknown>;
            const entityName = (e.entity || e.name || "") as string;
            const label = (e.entityLabel || e.label || entityName) as string;
            return (
              <Link
                key={idx}
                href={`/entities/${entityName}`}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md hover:border-blue-300 transition group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold group-hover:bg-blue-600 group-hover:text-white transition">
                    {label[0] || "E"}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition">
                      {label}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {entityName}
                    </div>
                  </div>
                </div>
                {String(e.comments || e.description || "") && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {String(e.comments || e.description || "")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
