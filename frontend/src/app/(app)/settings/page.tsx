"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TABS = [
  { key: "profile", label: "个人信息" },
  { key: "security", label: "安全设置" },
  { key: "logs", label: "登录日志" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface LoginLog {
  loginTime: string;
  ip: string;
  userAgent: string;
}

export default function UserSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("profile");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">个人设置</h1>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b px-1">
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {tab === "profile" && <ProfileTab user={user} />}
          {tab === "security" && <SecurityTab />}
          {tab === "logs" && <LogsTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Tab ─────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: Record<string, any> | null }) {
  const [fullName, setFullName] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || "");
      setWorkPhone(user.workphone || user.work_phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    setMsg(null);
    setSaving(true);
    try {
      await api.updateUserProfile({ fullName, workphone: workPhone });
      setMsg({ type: "ok", text: "保存成功" });
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("文件大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const avatarUrl =
    avatarPreview ||
    (user?.id
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/account/user-avatar?w=200`
      : null);

  const username = user?.name || user?.username || "未知用户";
  const dept = user?.department || user?.deptName || "未分配";
  const teams: string[] = user?.teams || [];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Avatar */}
      <div className="md:w-48 flex-shrink-0">
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-sm font-medium"
            >
              <span>修改头像</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.gif,.png"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-sm text-gray-500">点击头像修改</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-5">
        {msg && (
          <div
            className={`text-sm p-3 rounded-lg border ${
              msg.type === "ok"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              用户名
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-100">
              {username}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              所属部门
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-100">
              {dept}
            </div>
          </div>
        </div>

        {teams.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              加入团队
            </label>
            <div className="flex flex-wrap gap-2">
              {teams.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              姓名
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              工作电话
            </label>
            <input
              type="text"
              value={workPhone}
              onChange={(e) => setWorkPhone(e.target.value)}
              placeholder="无"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Security Tab ────────────────────────────────────────────────── */

function SecurityTab() {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  return (
    <div className="space-y-0 divide-y divide-gray-100">
      {/* Change Email */}
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-gray-800">修改邮箱</p>
          <p className="text-xs text-gray-500 mt-0.5">修改绑定的邮箱地址</p>
        </div>
        <button
          onClick={() => setShowEmailModal(true)}
          className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
        >
          修改
        </button>
      </div>

      {/* Change Password */}
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-gray-800">修改密码</p>
          <p className="text-xs text-gray-500 mt-0.5">建议 90 天更改一次密码</p>
        </div>
        <button
          onClick={() => setShowPwdModal(true)}
          className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
        >
          修改
        </button>
      </div>

      {/* Modals */}
      {showEmailModal && (
        <EmailModal onClose={() => setShowEmailModal(false)} />
      )}
      {showPwdModal && (
        <PasswordModal onClose={() => setShowPwdModal(false)} />
      )}
    </div>
  );
}

function EmailModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [vcode, setVcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) return setMsg("请输入新邮箱");
    setMsg("");
    try {
      await api.sendSignupEmailVcode(email);
      setCountdown(60);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "发送失败");
    }
  };

  const handleSave = async () => {
    if (!email || !vcode) return setMsg("请填写完整");
    setMsg("");
    setLoading(true);
    try {
      await api.updateEmail(email, vcode);
      onClose();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">修改邮箱</h3>
        {msg && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg border border-red-200 mb-3">
            {msg}
          </div>
        )}
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入新邮箱"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={vcode}
              onChange={(e) => setVcode(e.target.value)}
              placeholder="请输入验证码"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              onClick={handleSendCode}
              disabled={countdown > 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSave = async () => {
    if (!oldPwd || !newPwd) return setMsg("请填写完整");
    if (newPwd !== newPwd2) return setMsg("两次输入的新密码不一致");
    setMsg("");
    setLoading(true);
    try {
      await api.updatePassword(oldPwd, newPwd);
      onClose();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">修改密码</h3>
        {msg && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg border border-red-200 mb-3">
            {msg}
          </div>
        )}
        <div className="space-y-3">
          <input
            type="password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            placeholder="当前密码"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            autoFocus
          />
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="新密码"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <input
            type="password"
            value={newPwd2}
            onChange={(e) => setNewPwd2(e.target.value)}
            placeholder="确认新密码"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Login Logs Tab ──────────────────────────────────────────────── */

function LogsTab() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLoginLogs();
      const items = data?.data || data?.logs || data || [];
      setLogs(Array.isArray(items) ? items : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const parseUA = (ua: string) => {
    if (!ua) return "未知";
    if (ua.includes("Mobile") || ua.includes("Android")) return "移动端";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return ua.substring(0, 30) + (ua.length > 30 ? "..." : "");
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>暂无登录日志</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-10">
                  #
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                  登录时间
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                  IP 地址
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                  客户端
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {log.loginTime || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
                    {log.ip || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {parseUA(log.userAgent || "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
