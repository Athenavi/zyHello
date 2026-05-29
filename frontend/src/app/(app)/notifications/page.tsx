"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listNotifications()
      .then((data) => {
        const d = data as Record<string, unknown>;
        setNotifications(
          Array.isArray(d) ? d : (d.data || d.items || d.notifications || []) as Record<string, unknown>[]
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getTypeIcon = (type: unknown) => {
    switch (type) {
      case "1":
      case "approval":
        return "✅";
      case "2":
      case "mention":
        return "💬";
      case "3":
      case "system":
        return "🔔";
      default:
        return "📩";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">消息</h1>
        <p className="text-gray-500 mt-1">查看系统通知和消息</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <div className="text-gray-500">暂无消息</div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, idx) => {
            const isRead = (n.read || n.isRead) as boolean;
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition ${
                  !isRead ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl mt-0.5">
                    {getTypeIcon(n.type || n.messageType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          !isRead ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {(n.title || n.subject || n.message || "通知") as string}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    {String(n.content || n.body || n.message || "") && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {String(n.content || n.body || n.message || "")}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {n.createdOn || n.createdAt
                        ? new Date(
                            (n.createdOn || n.createdAt) as string
                          ).toLocaleString("zh-CN")
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
