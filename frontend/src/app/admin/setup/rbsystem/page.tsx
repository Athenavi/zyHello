"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface RbSystemItem {
  file: string;
  name: string;
  desc?: string;
  source?: string;
}

type InstallState = "loading" | "select" | "installing" | "success" | "error";

export default function RbsystemPage() {
  const [installState, setInstallState] = useState<InstallState>("loading");
  const [items, setItems] = useState<RbSystemItem[]>([]);
  const [installError, setInstallError] = useState("");
  const [confirmItem, setConfirmItem] = useState<RbSystemItem | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const res = await api.loadRbSystems();
        const data = (res as any) || [];
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
          setInstallState("select");
        } else {
          setInstallState("select");
        }
      } catch {
        setInstallState("select");
      }
    };
    loadSystems();
  }, []);

  // Countdown timer for confirm dialog
  useEffect(() => {
    if (!confirmItem) return;
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirmItem]);

  const handleInstallClick = (item: RbSystemItem) => {
    setConfirmItem(item);
  };

  const handleConfirmInstall = async () => {
    if (!confirmItem) return;
    setConfirmItem(null);
    setInstallState("installing");
    setInstallError("");
    try {
      const res = await api.installRbsystem(confirmItem.file);
      if ((res as any)?.success || (res as any)?.error_code === 0) {
        setInstallState("success");
      } else {
        setInstallError(
          (res as any)?.error_msg || (res as any)?.error || "安装失败"
        );
        setInstallState("error");
      }
    } catch (err: unknown) {
      setInstallError(
        err instanceof Error ? err.message : "安装请求失败"
      );
      setInstallState("error");
    }
  };

  const handleCancelConfirm = () => {
    setConfirmItem(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 py-8 text-center">
              <div className="text-white text-3xl font-bold tracking-wider">
                REBUILD
              </div>
            </div>

            {/* Body */}
            <div className="p-8 text-center">
              {/* Loading */}
              {installState === "loading" && (
                <div>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">请稍后</p>
                </div>
              )}

              {/* Select system template */}
              {installState === "select" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    选择系统模版
                  </h2>
                  {items.length === 0 ? (
                    <p className="text-gray-400">暂无可用</p>
                  ) : (
                    <ul className="space-y-3 text-left">
                      {items.map((item) => (
                        <li key={item.file}>
                          <button
                            onClick={() => handleInstallClick(item)}
                            className="w-full block border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-500 hover:bg-blue-50 transition text-left"
                          >
                            <h5 className="font-semibold text-gray-800">
                              {item.name}
                            </h5>
                            <p className="text-sm text-gray-500 mt-1">
                              {item.desc || item.name}
                              {item.source && (
                                <a
                                  href={item.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-blue-500 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  ...详情
                                </a>
                              )}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Installing */}
              {installState === "installing" && (
                <div className="py-8">
                  <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl text-gray-600">正在安装</h2>
                </div>
              )}

              {/* Success */}
              {installState === "success" && (
                <div className="py-8">
                  <div className="text-5xl text-green-500 mb-4">✓</div>
                  <h2 className="text-xl text-gray-800 mb-6">安装成功</h2>
                  <Link
                    href="/dashboard"
                    className="inline-block px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    进入系统
                  </Link>
                </div>
              )}

              {/* Error */}
              {installState === "error" && (
                <div className="py-8">
                  <div className="text-5xl text-red-500 mb-4">✕</div>
                  <h2 className="text-xl text-gray-800 mb-4">安装失败</h2>
                  <Link
                    href="/admin/setup/rbsystem"
                    className="inline-block px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition mb-4"
                  >
                    重试
                  </Link>
                  {installError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <p className="text-sm text-red-700">{installError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center mt-6 text-sm text-gray-400">
            Powered by{" "}
            <a
              href="https://getrebuild.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:underline"
            >
              REBUILD Apps
            </a>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-1">
              <div className="text-4xl text-orange-500 mb-3">⚠</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                安装系统模版将清空您现有系统的所有数据，包括系统配置、业务实体、数据以及附件等。安装前强烈建议您做好系统备份。
              </h3>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleCancelConfirm}
                className="px-5 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmInstall}
                disabled={countdown > 0}
                className="px-5 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {countdown > 0
                  ? `清空并安装 (${countdown}s)`
                  : "清空并安装"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
