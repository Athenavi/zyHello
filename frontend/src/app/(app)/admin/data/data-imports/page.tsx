"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function DataImportsPage() {
  const [importing, setImporting] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [entities, setEntities] = useState<{ name: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listEntities();
        const list = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data || []) as { name: string; label: string }[];
        setEntities(list);
      } catch {
        setEntities([]);
      }
    })();
  }, []);

  const handleImport = async () => {
    if (!selectedEntity || !uploadFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity", selectedEntity);
      await api.post("/admin/data/imports", formData);
      alert("导入任务已提交");
      setUploadFile(null);
    } catch {
      alert("导入失败");
    }
    setImporting(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Link href="/admin/data" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-800">数据导入</h1>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 space-y-6">
            {/* Entity selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">目标实体</label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full max-w-md px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择实体</option>
                {entities.map((e) => (
                  <option key={e.name} value={e.name}>{e.label || e.name}</option>
                ))}
              </select>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">上传文件</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center max-w-2xl">
                <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  拖放文件到此处，或{" "}
                  <label className="text-blue-600 hover:underline cursor-pointer">
                    点击选择
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-gray-400">支持 .xlsx, .xls, .csv 格式</p>
                {uploadFile && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {uploadFile.name}
                    <button onClick={() => setUploadFile(null)} className="text-blue-400 hover:text-blue-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Import button */}
            <div>
              <button
                onClick={handleImport}
                disabled={importing || !selectedEntity || !uploadFile}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? "导入中..." : "开始导入"}
              </button>
            </div>

            {/* Import tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                导入说明
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 第一行为字段名称，需要与实体字段名匹配</li>
                <li>• 支持通过 ID 字段更新已有记录</li>
                <li>• 单次导入最大支持 10,000 条记录</li>
                <li>• 建议先下载模板文件进行填写</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
