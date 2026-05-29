"use client";

import { useState } from "react";

export default function AdminDataPage() {
  const [activeTab, setActiveTab] = useState("import");

  const tabs = [
    { key: "import", label: "数据导入" },
    { key: "report", label: "报表模板" },
    { key: "backup", label: "数据备份" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">数据管理</h1>
        <p className="text-gray-500 mt-1">数据导入、报表和备份管理</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {activeTab === "import" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              数据导入
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500 mb-2">
                拖拽文件到此处或点击上传
              </p>
              <p className="text-xs text-gray-400">
                支持 Excel (.xlsx) 和 CSV 文件
              </p>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm cursor-pointer"
              >
                选择文件
              </label>
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              报表模板
            </h3>
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p>暂无报表模板</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                + 新建模板
              </button>
            </div>
          </div>
        )}

        {activeTab === "backup" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              数据备份
            </h3>
            <p className="text-gray-500 mb-4">
              创建系统数据备份以防止数据丢失
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
              创建备份
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
