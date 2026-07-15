"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

export default function AdminDataPage() {
  const [activeTab, setActiveTab] = useState("import");

  // ── Import ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string>("");
  const [importError, setImportError] = useState<string>("");

  // ── Templates ──
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateEntity, setTemplateEntity] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  // ── Backup ──
  const [backingUp, setBackingUp] = useState(false);

  const tabs = [
    { key: "import", label: "数据导入" },
    { key: "report", label: "报表模板" },
    { key: "backup", label: "数据备份" },
  ];

  // ── Import handlers ──

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult("");
    setImportError("");
    setImporting(true);
    try {
      const uploaded = await api.uploadFile(file);
      const res = await api.post("/admin/data/data-imports/check-file", { file: uploaded.file_path });
      const d = (res as any)?.data || res;
      setImportResult(`文件 "${file.name}" 上传成功！共 ${d.totalRows ?? "?"} 行数据，预览：${JSON.stringify(d.preview || "")}`);
    } catch (err: any) {
      setImportError(err.message || "上传校验失败");
    }
    setImporting(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Template handlers ──

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await api.listReportTemplates();
      const d = (data as any)?.data || data || [];
      setTemplates(Array.isArray(d) ? d : []);
    } catch {
      setTemplates([]);
    }
    setTemplatesLoading(false);
  };

  useEffect(() => {
    if (activeTab === "report") loadTemplates();
  }, [activeTab]);

  const handleNewTemplate = async () => {
    if (!templateName.trim() || !templateEntity.trim()) return;
    setTemplateSaving(true);
    try {
      await api.post("/admin/data/report-templates/save", {
        name: templateName,
        belongEntity: templateEntity,
        templateType: 1,
      });
      setShowTemplateModal(false);
      setTemplateName("");
      setTemplateEntity("");
      loadTemplates();
    } catch {
      alert("创建失败");
    }
    setTemplateSaving(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("确定删除此模板？")) return;
    try {
      await api.deleteReportTemplate(id);
      loadTemplates();
    } catch {
      alert("删除失败");
    }
  };

  // ── Backup handler ──

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await api.backupNow();
      alert("备份任务已启动");
    } catch {
      alert("备份失败");
    }
    setBackingUp(false);
  };

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
        {/* ═══ 数据导入 ═══ */}
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
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                id="import-file"
                onChange={handleFileChange}
                disabled={importing}
              />
              <label
                htmlFor="import-file"
                className={`inline-block mt-4 px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                  importing
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {importing ? "上传中..." : "选择文件"}
              </label>
            </div>
            {importResult && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {importResult}
              </div>
            )}
            {importError && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {importError}
              </div>
            )}
          </div>
        )}

        {/* ═══ 报表模板 ═══ */}
        {activeTab === "report" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                报表模板
              </h3>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                + 新建模板
              </button>
            </div>
            {templatesLoading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📊</div>
                <p>暂无报表模板</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-2 font-medium">名称</th>
                    <th className="pb-2 font-medium">所属实体</th>
                    <th className="pb-2 font-medium">类型</th>
                    <th className="pb-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl: any) => (
                    <tr key={tpl.configId || tpl.id} className="border-b text-sm">
                      <td className="py-3 text-gray-800">{tpl.name}</td>
                      <td className="py-3 text-gray-600">{tpl.belongEntity}</td>
                      <td className="py-3 text-gray-600">
                        {tpl.templateType === 1 ? "Word" : tpl.templateType === 2 ? "Excel" : "其他"}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDeleteTemplate(tpl.configId || tpl.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 新建模板对话框 */}
            {showTemplateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    新建报表模板
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">模板名称</label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="输入模板名称"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">所属实体</label>
                      <input
                        type="text"
                        value={templateEntity}
                        onChange={(e) => setTemplateEntity(e.target.value)}
                        placeholder="输入实体名称（如 User）"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => { setShowTemplateModal(false); setTemplateName(""); setTemplateEntity(""); }}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleNewTemplate}
                      disabled={templateSaving || !templateName.trim() || !templateEntity.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {templateSaving ? "创建中..." : "创建"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ 数据备份 ═══ */}
        {activeTab === "backup" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              数据备份
            </h3>
            <p className="text-gray-500 mb-4">
              创建系统数据备份以防止数据丢失
            </p>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {backingUp ? "备份中..." : "创建备份"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
