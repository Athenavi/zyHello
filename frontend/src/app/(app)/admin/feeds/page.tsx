"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface FeedItem {
  feedId?: string;
  id?: string;
  content?: string;
  type?: string | number;
  createdBy?: string;
  createdOn?: string;
  createdByName?: string;
  [key: string]: unknown;
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  "1": { label: "动态", color: "text-blue-600 bg-blue-50" },
  "2": { label: "跟进", color: "text-green-600 bg-green-50" },
  "10": { label: "公告", color: "text-red-600 bg-red-50" },
  "20": { label: "日程", color: "text-orange-600 bg-orange-50" },
};

const TYPE_OPTIONS = [
  { value: "", label: "全部" },
  { value: "1", label: "动态" },
  { value: "2", label: "跟进" },
  { value: "10", label: "公告" },
  { value: "20", label: "日程" },
];

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [searchContent, setSearchContent] = useState("");

  const loadFeeds = async () => {
    setLoading(true);
    try {
      let data = await api.listFeeds(1, filterType || undefined);
      let d = data as Record<string, unknown>;
      if ("error_code" in d && "data" in d && d.data && typeof d.data === "object") {
        d = d.data as Record<string, unknown>;
      }
      const raw = Array.isArray(d) ? d : (d.data || d.feeds || d.items || []);
      let list = (Array.isArray(raw) ? raw : []) as FeedItem[];
      if (searchContent.trim()) {
        const q = searchContent.toLowerCase();
        list = list.filter((f) => (f.content || "").toLowerCase().includes(q));
      }
      setFeeds(list);
    } catch {
      setFeeds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeeds();
  }, [filterType]);

  const handleDelete = async (feed: FeedItem) => {
    const id = feed.feedId || feed.id;
    if (!id) return;
    if (!confirm("确定删除此内容？此操作不可恢复。")) return;
    try {
      await api.post("/feeds/delete", { id });
      setFeeds((prev) => prev.filter((f) => (f.feedId || f.id) !== id));
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">动态管理</h1>
          <p className="text-gray-500 mt-1">管理全部动态、跟进、公告和日程</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchContent}
          onChange={(e) => setSearchContent(e.target.value)}
          placeholder="搜索内容..."
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          onKeyDown={(e) => e.key === "Enter" && loadFeeds()}
        />
        <button
          onClick={loadFeeds}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          搜索
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">内容</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">发布人</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : feeds.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无内容</td>
              </tr>
            ) : (
              feeds.map((feed, idx) => {
                const id = feed.feedId || feed.id || idx;
                const typeKey = String(feed.type || "1");
                const typeInfo = TYPE_MAP[typeKey] || TYPE_MAP["1"];
                return (
                  <tr key={id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-md truncate">
                      {feed.content || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {feed.createdByName || feed.createdBy || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {feed.createdOn ? new Date(feed.createdOn).toLocaleString("zh-CN") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(feed)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
