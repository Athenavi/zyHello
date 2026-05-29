"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";

interface EntitySidebarProps {
  active: string;
  basePath?: string; // default: /admin/metadata
  subnavPrefix?: string; // default: same as basePath
}

const SUBNAV_ITEMS = [
  { key: "fields", label: "字段管理", icon: "mdi-form-textbox" },
  { key: "edit", label: "基本信息", icon: "mdi-pencil" },
  { key: "overview", label: "技术全览", icon: "mdi-chart-bar-stacked" },
  { key: "advanced", label: "高级设置", icon: "mdi-cog" },
  { key: "form-design", label: "表单设计", icon: "mdi-view-dashboard-outline" },
  { key: "i18n", label: "多语言", icon: "mdi-translate" },
];

export default function EntitySidebar({ active, basePath = "/admin/metadata" }: EntitySidebarProps) {
  const { entity } = useParams<{ entity: string }>();
  const [entityLabel, setEntityLabel] = useState(entity);
  const [entityComment, setEntityComment] = useState("");

  useEffect(() => {
    if (!entity) return;
    api
      .getEntityDetail(entity)
      .then((data) => {
        const d = data as Record<string, unknown>;
        if (d.entityLabel) setEntityLabel(d.entityLabel as string);
        if (d.comments) setEntityComment(d.comments as string);
      })
      .catch(() => {
        setEntityLabel(entity);
      });
  }, [entity]);

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex-shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 truncate">{entityLabel}</h3>
          <Link href={basePath} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
        {entityComment && <p className="text-xs text-gray-500 mt-1">{entityComment}</p>}
      </div>
      <nav className="py-2">
        {SUBNAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`${basePath}/${entity}/${item.key}`}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active === item.key
                ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <span className={`mdi ${item.icon} text-base`}></span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
