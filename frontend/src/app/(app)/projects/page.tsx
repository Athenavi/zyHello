"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDataList("Project", 1, 50)
      .then((data) => {
        setProjects(Array.isArray(data) ? data : data?.data || []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">项目</h1>
        <p className="text-gray-500 mt-1">管理项目计划和任务</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border p-5 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📁</p>
          <p>暂无项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-800 mb-2">
                {(p.projectName || p.name || "未命名") as string}
              </h3>
              {(p.description || p.comments) && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {String(p.description || p.comments || "")}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                {p.status && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {(p.status || "进行中") as string}
                  </span>
                )}
                {p.members && (
                  <span>👥 {String(p.members)} 位成员</span>
                )}
                {p.createdOn && (
                  <span>📅 {String(p.createdOn)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
