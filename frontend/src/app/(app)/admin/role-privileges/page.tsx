"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface Role {
  id: string;
  name: string;
  disabled?: boolean;
}

interface EntityPrivilege {
  entityName: string;
  entityLabel: string;
  C: number; // Create
  R: number; // Read
  U: number; // Update
  D: number; // Delete
  A: number; // Assign
  S: number; // Share
}

interface ZeroPrivilege {
  name: string;
  label: string;
  value: number;
  tip?: string;
}

const ZERO_PRIVILEGES: Omit<ZeroPrivilege, "value">[] = [
  { name: "AllowLogin", label: "允许登录" },
  { name: "AllowCustomNav", label: "允许自定义导航菜单" },
  { name: "AllowCustomChart", label: "允许自定义仪表盘、图表" },
  { name: "AllowCustomDataList", label: "允许自定义列显示", tip: "需具备相应实体的读取权限" },
  { name: "AllowBatchUpdate", label: "允许批量修改", tip: "需具备相应实体的编辑权限" },
  { name: "AllowRecordMerge", label: "允许记录合并", tip: "需具备相应实体的编辑和/或删除权限" },
  { name: "AllowRevokeApproval", label: "允许撤回、撤销审批", tip: "需具备相应实体的读取权限" },
  { name: "AllowDataImport", label: "允许数据导入", tip: "需具备相应实体的新建和/或编辑权限" },
  { name: "AllowDataExport", label: "允许数据导出", tip: "需具备相应实体的读取权限" },
  { name: "AllowNoDesensitized", label: "允许查看明文", tip: "针对信息脱敏字段可查看明文" },
  { name: "AllowAtAllUsers", label: "允许在动态中 @所有人" },
  { name: "EnableBizzPart", label: "开启部门用户隔离" },
  { name: "AllowUseAiBot", label: "允许使用 AI 助手" },
];

const PRIV_LEVELS = [
  { value: 0, label: "无权限", color: "bg-gray-200", textColor: "text-gray-400" },
  { value: 1, label: "本人", color: "bg-yellow-100", textColor: "text-yellow-600" },
  { value: 2, label: "本部门", color: "bg-blue-100", textColor: "text-blue-600" },
  { value: 3, label: "本部门及子部门", color: "bg-indigo-100", textColor: "text-indigo-600" },
  { value: 4, label: "全部", color: "bg-green-100", textColor: "text-green-600" },
];

const ACTION_LABELS: Record<string, string> = {
  C: "新建",
  R: "读取",
  U: "编辑",
  D: "删除",
  A: "分配",
  S: "共享",
};

export default function AdminRolePrivilegesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [tab, setTab] = useState<"entity" | "zero">("entity");
  const [entityPrivs, setEntityPrivs] = useState<EntityPrivilege[]>([]);
  const [zeroPrivs, setZeroPrivs] = useState<ZeroPrivilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchEntity, setSearchEntity] = useState("");
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const fetchRoles = useCallback(async () => {
    try {
      const data = await api.listRoles();
      if (Array.isArray(data)) {
        setRoles(data.map((r: Record<string, unknown>) => ({
          id: (r.id || r[0]) as string,
          name: (r.name || r[1]) as string,
          disabled: !!(r.disabled || r[2]),
        })));
      } else if (data && typeof data === "object" && "data" in data) {
        const arr = ((data as Record<string, unknown>).data || []) as Record<string, unknown>[];
        setRoles(arr.map((r) => ({
          id: (r.id || r[0]) as string,
          name: (r.name || r[1]) as string,
          disabled: !!(r.disabled || r[2]),
        })));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchPrivileges = useCallback(async (roleId: string) => {
    setLoading(true);
    try {
      const data = await api.getRolePrivileges(roleId);
      if (data && typeof data === "object") {
        // Unwrap { error_code, data: { ... } } response
        const raw = data as Record<string, unknown>;
        const d = (raw.data || raw) as Record<string, unknown>;
        // Entity privileges
        const entities = (d.entities || d.entityPrivileges || []) as Record<string, unknown>[];
        setEntityPrivs(entities.map((e) => ({
          entityName: (e.entityName || e.name || "") as string,
          entityLabel: (e.entityLabel || e.label || e.entityName || "") as string,
          C: (e.C ?? e.create ?? 0) as number,
          R: (e.R ?? e.read ?? 0) as number,
          U: (e.U ?? e.update ?? 0) as number,
          D: (e.D ?? e.delete ?? 0) as number,
          A: (e.A ?? e.assign ?? 0) as number,
          S: (e.S ?? e.share ?? 0) as number,
        })));
        // Zero privileges
        const zeros = (d.zeroPrivileges || d.zeros || d.extPrivileges || {}) as Record<string, number>;
        setZeroPrivs(ZERO_PRIVILEGES.map((zp) => ({
          ...zp,
          value: (zeros[zp.name] ?? 0) as number,
        })));
      }
    } catch {
      setEntityPrivs([]);
      setZeroPrivs(ZERO_PRIVILEGES.map((zp) => ({ ...zp, value: 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchPrivileges(selectedRoleId);
    }
  }, [selectedRoleId, fetchPrivileges]);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const data = await api.post("/admin/bizuser/role-save", { name: newRoleName.trim() });
      setShowNewRole(false);
      setNewRoleName("");
      await fetchRoles();
      if (data && typeof data === "object" && "id" in data) {
        setSelectedRoleId((data as Record<string, unknown>).id as string);
      }
    } catch {
      alert("创建角色失败");
    }
  };

  const toggleEntityPriv = (entityName: string, action: string, value: number) => {
    setEntityPrivs((prev) =>
      prev.map((e) => {
        if (e.entityName !== entityName) return e;
        const key = action as keyof EntityPrivilege;
        return { ...e, [key]: value };
      })
    );
  };

  const toggleZeroPriv = (name: string, value: number) => {
    setZeroPrivs((prev) =>
      prev.map((zp) => (zp.name === name ? { ...zp, value } : zp))
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await api.saveRolePrivileges(selectedRoleId, {
        entities: entityPrivs,
        zeros: zeroPrivs.reduce((acc, zp) => ({ ...acc, [zp.name]: zp.value }), {}),
      });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleCopyRole = async () => {
    if (!selectedRoleId) return;
    const roleName = prompt("请输入新角色名称（复制）");
    if (!roleName) return;
    try {
      await api.post("/admin/bizuser/role-copy", { sourceId: selectedRoleId, name: roleName });
      await fetchRoles();
    } catch {
      alert("复制角色失败");
    }
  };

  const filteredEntities = entityPrivs.filter(
    (e) => !searchEntity || e.entityLabel.includes(searchEntity) || e.entityName.includes(searchEntity)
  );

  const activeRoles = roles.filter((r) => !r.disabled);
  const disabledRoles = roles.filter((r) => r.disabled);

  const PrivIcon = ({ level, onClick }: { level: number; onClick: () => void }) => {
    const priv = PRIV_LEVELS[level] || PRIV_LEVELS[0];
    return (
      <button
        onClick={onClick}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${priv.color} ${priv.textColor} hover:opacity-80 transition-opacity cursor-pointer`}
        title={priv.label}
      >
        {level === 0 ? "✕" : level}
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Sidebar - Role List */}
      <div className="w-56 border-r bg-gray-50 flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-3 border-b bg-white">
          <h3 className="text-sm font-bold text-gray-700">角色列表</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeRoles.map((role) => (
            <div
              key={role.id}
              className={`px-3 py-2 cursor-pointer text-sm border-b transition-colors ${
                selectedRoleId === role.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-700"
              }`}
              onClick={() => setSelectedRoleId(role.id)}
            >
              {role.name}
            </div>
          ))}
          {disabledRoles.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-100 border-b">
                已禁用
              </div>
              {disabledRoles.map((role) => (
                <div
                  key={role.id}
                  className={`px-3 py-2 cursor-pointer text-sm border-b transition-colors opacity-60 ${
                    selectedRoleId === role.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-500"
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  {role.name}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNewRole(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建角色
            </button>
            {selectedRoleId && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={handleCopyRole}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  复制角色
                </button>
              </>
            )}
          </div>
          {tab === "entity" && (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchEntity}
                onChange={(e) => setSearchEntity(e.target.value)}
                placeholder="搜索实体..."
                className="pl-9 pr-3 py-1.5 border rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white px-6">
          <button
            onClick={() => setTab("entity")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "entity" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            实体权限
          </button>
          <button
            onClick={() => setTab("zero")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "zero" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            扩展权限
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedRoleId ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-lg">请从左侧选择一个角色</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                加载中...
              </div>
            </div>
          ) : tab === "entity" ? (
            /* Entity Privileges Tab */
            <div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-1/4">业务实体</th>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <th key={key} className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                          <button
                            className="hover:text-blue-600"
                            title={`批量切换所有${label}`}
                            onClick={() => {
                              const nextLevel = ((entityPrivs[0]?.[key as keyof EntityPrivilege] as number) + 1) % 5;
                              setEntityPrivs((prev) =>
                                prev.map((e) => ({ ...e, [key]: nextLevel }))
                              );
                            }}
                          >
                            {label}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntities.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          {searchEntity ? "未找到匹配实体" : "暂无可用业务实体"}
                        </td>
                      </tr>
                    ) : (
                      filteredEntities.map((entity) => (
                        <tr key={entity.entityName} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-800">{entity.entityLabel}</div>
                            <div className="text-xs text-gray-400">{entity.entityName}</div>
                          </td>
                          {Object.keys(ACTION_LABELS).map((action) => (
                            <td key={action} className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center">
                                <PrivIcon
                                  level={entity[action as keyof EntityPrivilege] as number}
                                  onClick={() => {
                                    const current = entity[action as keyof EntityPrivilege] as number;
                                    toggleEntityPriv(entity.entityName, action, (current + 1) % 5);
                                  }}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="font-medium">图例:</span>
                {PRIV_LEVELS.map((pl) => (
                  <span key={pl.value} className="flex items-center gap-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${pl.color} ${pl.textColor}`}>
                      {pl.value === 0 ? "✕" : pl.value}
                    </span>
                    {pl.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Zero Privileges Tab */
            <div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-1/4">权限项</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-24">允许</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">前置条件</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {zeroPrivs.map((zp) => (
                      <tr key={zp.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-800">{zp.label}</div>
                          <div className="text-xs text-gray-400">{zp.name}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <PrivIcon
                              level={zp.value}
                              onClick={() => toggleZeroPriv(zp.name, zp.value === 4 ? 0 : 4)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{zp.tip || "无"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="font-medium">图例:</span>
                <span className="flex items-center gap-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${PRIV_LEVELS[4].color} ${PRIV_LEVELS[4].textColor}`}>4</span>
                  是
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${PRIV_LEVELS[0].color} ${PRIV_LEVELS[0].textColor}`}>✕</span>
                  否
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {showNewRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">新建角色</h2>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
              placeholder="请输入角色名称"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewRole(false); setNewRoleName(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
