"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Feed {
  id: string;
  content?: string;
  type?: string;
  createdBy?: Record<string, unknown>;
  createdOn?: string;
  commentsCount?: number;
  likesCount?: number;
  liked?: boolean;
}

export default function FeedsPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newContent, setNewContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const res = await api.listFeeds(1, filter || undefined);
      const data = res as Record<string, unknown>;
      setFeeds(
        ((data.data || data.feeds || data.items || []) as Feed[]) || []
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, [filter]);

  const handlePublish = async () => {
    if (!newContent.trim()) return;
    setPublishing(true);
    try {
      await api.publishFeed({ content: newContent, type: "1" });
      setNewContent("");
      fetchFeeds();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const typeLabels: Record<string, string> = {
    "1": "动态",
    "2": "公告",
    "3": "日程",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">动态</h1>
        <p className="text-gray-500 mt-1">查看团队动态、公告和日程</p>
      </div>

      {/* Publish */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="分享你的想法..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handlePublish}
            disabled={publishing || !newContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
          >
            {publishing ? "发布中..." : "发布"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {["", "1", "2", "3"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              filter === t
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
            }`}
          >
            {t === "" ? "全部" : typeLabels[t] || t}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Feed list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📢</div>
          <div className="text-gray-500">暂无动态</div>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="bg-white rounded-xl shadow-sm border p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {(
                    (feed.createdBy as Record<string, unknown>)
                      ?.fullName ||
                    (feed.createdBy as Record<string, unknown>)
                      ?.loginName ||
                    "U"
                  )
                    ?.toString()
                    .charAt(0)
                    .toUpperCase() || "U"}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {(
                      (feed.createdBy as Record<string, unknown>)
                        ?.fullName ||
                      (feed.createdBy as Record<string, unknown>)
                        ?.loginName ||
                      "用户"
                    ) as string}
                  </div>
                  <div className="text-xs text-gray-400">
                    {feed.createdOn
                      ? new Date(feed.createdOn).toLocaleString("zh-CN")
                      : ""}
                  </div>
                </div>
                {feed.type && (
                  <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                    {typeLabels[feed.type] || feed.type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {feed.content}
              </p>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <button className="text-xs text-gray-500 hover:text-blue-600">
                  👍 {feed.likesCount || 0}
                </button>
                <button className="text-xs text-gray-500 hover:text-blue-600">
                  💬 {feed.commentsCount || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
