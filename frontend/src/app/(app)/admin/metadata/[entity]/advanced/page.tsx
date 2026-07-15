"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

type ListMode = "DEFAULT" | "TREE" | "DETAIL";

export default function EntityAdvancedPage() {
  const { entity: rawEntity } = useParams<{ entity: string }>();
  const entity = rawEntity ? decodeURIComponent(rawEntity) : "";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listMode, setListMode] = useState<ListMode>("DEFAULT");
  const [formData, setFormData] = useState({
    tagsEditable: false,
    approvalAndSharing: false,
    detailsSeqEnabled: false,
    detailsHideEnabled: false,
    repeatFieldsCheck: false,
    disabled: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEntityAdvanced(entity);
      const d = data as Record<string, unknown>;
      setListMode((d.listMode as ListMode) || "DEFAULT");
      setFormData({
        tagsEditable: (d.tagsEditable as boolean) || false,
        approvalAndSharing: (d.approvalAndSharing as boolean) || false,
        detailsSeqEnabled: (d.detailsSeqEnabled as boolean) || false,
        detailsHideEnabled: (d.detailsHideEnabled as boolean) || false,
        repeatFieldsCheck: (d.repeatFieldsCheck as boolean) || false,
        disabled: (d.disabled as boolean) || false,
      });
    } catch {
      // use defaults
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveEntityAdvanced(entity, {
        listMode,
        ...formData,
      });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleDeleteEntity = async () => {
    if (deleteConfirmText !== entity) {
      alert("请输入实体名称确认删除");
      return;
    }
    try {
      await api.deleteEntity(entity);
      router.push("/admin/metadata");
    } catch {
      alert("删除失败");
    }
  };

  const listModes = [
    {
      key: "DEFAULT" as ListMode,
      label: "默认模式",
      icon: "mdi-view-list",
      desc: "标准列表视图",
      preview: (
        <div className="space-y-1.5 p-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${90 - i * 10}%` }}></div>
          ))}
        </div>
      ),
    },
    {
      key: "TREE" as ListMode,
      label: "树状模式",
      icon: "mdi-file-tree",
      desc: "层级树视图",
      preview: (
        <div className="p-2 space-y-1">
          <div className="flex items-center gap-1">
            <span className="mdi mdi-folder text-yellow-500 text-xs"></span>
            <div className="h-2.5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <span className="mdi mdi-file text-gray-400 text-xs"></span>
            <div className="h-2.5 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <span className="mdi mdi-file text-gray-400 text-xs"></span>
            <div className="h-2.5 bg-gray-200 rounded w-14"></div>
          </div>
          <div className="flex items-center gap-1">
            <span className="mdi mdi-folder text-yellow-500 text-xs"></span>
            <div className="h-2.5 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
      ),
    },
    {
      key: "DETAIL" as ListMode,
      label: "明细模式",
      icon: "mdi-view-headline",
      desc: "主明细表视图",
      preview: (
        <div className="p-2 space-y-1">
          <div className="h-3 bg-blue-100 rounded border border-blue-200"></div>
          <div className="ml-4 space-y-1">
            <div className="h-2.5 bg-gray-100 rounded border border-gray-200"></div>
            <div className="h-2.5 bg-gray-100 rounded border border-gray-200"></div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full">
      <EntitySidebar active="advanced" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2">
          <h1 className="text-lg font-bold text-gray-800">高级设置</h1>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <span className="mdi mdi-loading mdi-spin text-2xl"></span>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-6">
            {/* List Mode */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-medium text-gray-800">列表模式</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {listModes.map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setListMode(mode.key)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        listMode === mode.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`mdi ${mode.icon} text-lg ${listMode === mode.key ? "text-blue-600" : "text-gray-500"}`}></span>
                        <span className={`text-sm font-medium ${listMode === mode.key ? "text-blue-700" : "text-gray-700"}`}>
                          {mode.label}
                        </span>
                        {listMode === mode.key && <span className="mdi mdi-check-circle text-blue-500 ml-auto"></span>}
                      </div>
                      <div className="bg-gray-50 rounded mb-2" style={{ height: "60px" }}>
                        {mode.preview}
                      </div>
                      <p className="text-xs text-gray-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced options */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-medium text-gray-800">高级选项</h2>
              </div>
              <div className="p-6 space-y-4">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tagsEditable}
                    onChange={(e) => setFormData({ ...formData, tagsEditable: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-700">允许编辑标签</div>
                    <div className="text-xs text-gray-400">用户可以在列表中编辑标签字段</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.approvalAndSharing}
                    onChange={(e) => setFormData({ ...formData, approvalAndSharing: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-700">启用审批和共享</div>
                    <div className="text-xs text-gray-400">为该实体启用审批流程和记录共享功能</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.detailsSeqEnabled}
                    onChange={(e) => setFormData({ ...formData, detailsSeqEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-700">启用明细排序</div>
                    <div className="text-xs text-gray-400">允许对明细记录进行排序</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.detailsHideEnabled}
                    onChange={(e) => setFormData({ ...formData, detailsHideEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-700">启用明细隐藏</div>
                    <div className="text-xs text-gray-400">允许隐藏不需要的明细记录</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.repeatFieldsCheck}
                    onChange={(e) => setFormData({ ...formData, repeatFieldsCheck: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-700">重复字段检查</div>
                    <div className="text-xs text-gray-400">保存时检查指定字段是否重复</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
                <h2 className="text-sm font-medium text-red-700">危险操作</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  删除实体将永久移除该实体及其所有数据、字段配置和相关自动化流程。此操作不可恢复。
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                  >
                    删除此实体
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">请输入实体名称 <strong>{entity}</strong> 确认：</span>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={entity}
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={handleDeleteEntity}
                      disabled={deleteConfirmText !== entity}
                      className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
