"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const DB_TYPES = [
  { value: "sqlite", label: "SQLite", defaultPort: "" },
  { value: "mysql", label: "MySQL", defaultPort: "3306" },
  { value: "postgresql", label: "PostgreSQL", defaultPort: "5432" },
];

type Step = "welcome" | "database" | "cache" | "installing" | "done";

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [checking, setChecking] = useState(true);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  // Database form state
  const [dbType, setDbType] = useState("sqlite");
  const [dbHost, setDbHost] = useState("127.0.0.1");
  const [dbPort, setDbPort] = useState("3306");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [dbTesting, setDbTesting] = useState(false);

  // Cache form state
  const [cacheHost, setCacheHost] = useState("127.0.0.1");
  const [cachePort, setCachePort] = useState("6379");
  const [cachePassword, setCachePassword] = useState("");
  const [cacheTestResult, setCacheTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [cacheTesting, setCacheTesting] = useState(false);
  const [skipCache, setSkipCache] = useState(false);

  // Install state
  const [installError, setInstallError] = useState("");

  // Check if already installed on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.getInstallStatus();
        if (res.data?.installed) {
          setAlreadyInstalled(true);
        }
      } catch {
        // If the API is unreachable, allow proceeding with install
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, []);

  // Update port when db type changes
  useEffect(() => {
    const found = DB_TYPES.find((d) => d.value === dbType);
    if (found) setDbPort(found.defaultPort);
    setDbTestResult(null);
  }, [dbType]);

  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await api.testDatabaseConnection({
        dbType,
        dbHost,
        dbPort,
        dbName: dbType === "sqlite" ? dbName || "ZyHello.db" : dbName,
        dbUser,
        dbPassword,
      });
      setDbTestResult({
        success: res.data?.success ?? false,
        message: res.data?.message || res.data?.error || "",
      });
    } catch (err: unknown) {
      setDbTestResult({
        success: false,
        message: err instanceof Error ? err.message : "连接测试失败",
      });
    } finally {
      setDbTesting(false);
    }
  };

  const handleTestCache = async () => {
    setCacheTesting(true);
    setCacheTestResult(null);
    try {
      const res = await api.testCacheConnection({
        CacheHost: cacheHost,
        CachePort: cachePort,
        CachePassword: cachePassword,
      });
      setCacheTestResult({
        success: res.data?.success ?? false,
        message: res.data?.message || res.data?.error || "",
      });
    } catch (err: unknown) {
      setCacheTestResult({
        success: false,
        message: err instanceof Error ? err.message : "连接测试失败",
      });
    } finally {
      setCacheTesting(false);
    }
  };

  const handleInstall = async () => {
    setStep("installing");
    setInstallError("");
    try {
      const res = await api.installRebuild({
        dbType,
        dbHost,
        dbPort,
        dbName: dbType === "sqlite" ? dbName || "ZyHello.db" : dbName,
        dbUser,
        dbPassword,
      });
      if (res.data?.success) {
        setStep("done");
      } else {
        setInstallError(res.data?.error || "安装失败");
        setStep("database");
      }
    } catch (err: unknown) {
      setInstallError(err instanceof Error ? err.message : "安装请求失败");
      setStep("database");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">正在检查安装状态…</p>
        </div>
      </div>
    );
  }

  // ── Already installed ──────────────────────────────────────────────
  if (alreadyInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            系统已安装
          </h1>
          <p className="text-gray-500 mb-6">
            ZyHello 已经完成安装，无需重复操作。
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // ── Step indicators ────────────────────────────────────────────────
  const stepOrder: Step[] = [
    "welcome",
    "database",
    "cache",
    "installing",
    "done",
  ];
  const currentIdx = stepOrder.indexOf(step);

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {["环境检查", "数据库", "缓存", "安装", "完成"].map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < currentIdx
                ? "bg-green-500 text-white"
                : i === currentIdx
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
            }`}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          <span
            className={`text-xs hidden sm:inline ${
              i <= currentIdx ? "text-gray-700" : "text-gray-400"
            }`}
          >
            {label}
          </span>
          {i < 4 && (
            <div
              className={`w-8 h-0.5 ${
                i < currentIdx ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              ZyHello 安装向导
            </h1>
            <p className="text-gray-500 mt-2">业务管理系统初始化配置</p>
          </div>

          <StepIndicator />

          {/* ── Welcome ──────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="text-center space-y-6">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-semibold text-gray-700">
                欢迎使用 ZyHello
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                接下来的步骤将引导您完成数据库配置和系统初始化。整个过程大约需要
                1-2 分钟。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm text-blue-800">
                <p className="font-medium mb-2">开始前请确认：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    已安装 Python 3.10+ 并运行 FastAPI 后端服务
                  </li>
                  <li>
                    如使用 MySQL/PostgreSQL，数据库已创建且可连接
                  </li>
                  <li>如需缓存支持，Redis 服务已启动（可选）</li>
                </ul>
              </div>
              <button
                onClick={() => setStep("database")}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                开始安装
              </button>
            </div>
          )}

          {/* ── Database config ──────────────────────────────────── */}
          {step === "database" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-700">
                数据库配置
              </h2>

              {installError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                  {installError}
                </div>
              )}

              {/* DB Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数据库类型
                </label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  {DB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {dbType !== "sqlite" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      主机地址
                    </label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      端口
                    </label>
                    <input
                      type="text"
                      value={dbPort}
                      onChange={(e) => setDbPort(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="3306"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dbType === "sqlite" ? "数据库文件名" : "数据库名称"}
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder={
                    dbType === "sqlite" ? "ZyHello.db" : "ZyHello"
                  }
                />
              </div>

              {dbType !== "sqlite" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="root"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      密码
                    </label>
                    <input
                      type="password"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="请输入密码"
                    />
                  </div>
                </div>
              )}

              {/* Test result */}
              {dbTestResult && (
                <div
                  className={`text-sm p-3 rounded-lg border ${
                    dbTestResult.success
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}
                >
                  {dbTestResult.success ? "✅ " : "❌ "}
                  {dbTestResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep("welcome")}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  上一步
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleTestDb}
                    disabled={dbTesting}
                    className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {dbTesting ? "测试中…" : "测试连接"}
                  </button>
                  <button
                    onClick={() => setStep("cache")}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    下一步
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Cache config ─────────────────────────────────────── */}
          {step === "cache" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-700">
                缓存配置（可选）
              </h2>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="skipCache"
                  checked={skipCache}
                  onChange={(e) => setSkipCache(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="skipCache" className="text-sm text-gray-600">
                  跳过缓存配置，使用内存缓存
                </label>
              </div>

              {!skipCache && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Redis 主机
                      </label>
                      <input
                        type="text"
                        value={cacheHost}
                        onChange={(e) => setCacheHost(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="127.0.0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        端口
                      </label>
                      <input
                        type="text"
                        value={cachePort}
                        onChange={(e) => setCachePort(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="6379"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      密码（无密码留空）
                    </label>
                    <input
                      type="password"
                      value={cachePassword}
                      onChange={(e) => setCachePassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="可选"
                    />
                  </div>

                  {cacheTestResult && (
                    <div
                      className={`text-sm p-3 rounded-lg border ${
                        cacheTestResult.success
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {cacheTestResult.success ? "✅ " : "❌ "}
                      {cacheTestResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleTestCache}
                    disabled={cacheTesting}
                    className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {cacheTesting ? "测试中…" : "测试连接"}
                  </button>
                </>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep("database")}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  上一步
                </button>
                <button
                  onClick={handleInstall}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  开始安装
                </button>
              </div>
            </div>
          )}

          {/* ── Installing ───────────────────────────────────────── */}
          {step === "installing" && (
            <div className="text-center space-y-6 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-700">
                正在安装…
              </h2>
              <p className="text-gray-500">正在创建数据库表和初始数据，请稍候。</p>
            </div>
          )}

          {/* ── Done ─────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center space-y-6 py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-gray-700">
                安装成功！
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left text-sm text-green-800 max-w-sm mx-auto">
                <p className="font-medium mb-2">默认管理员账号：</p>
                <ul className="space-y-1">
                  <li>
                    👤 用户名：<code className="bg-green-100 px-1 rounded">admin</code>
                  </li>
                  <li>
                    🔑 密码：<code className="bg-green-100 px-1 rounded">admin</code>
                  </li>
                </ul>
                <p className="mt-2 text-green-600 text-xs">
                  请登录后立即修改默认密码！
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                前往登录
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ZyHello CRM — Python FastAPI + Next.js
        </p>
      </div>
    </div>
  );
}
