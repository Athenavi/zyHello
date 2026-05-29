"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

/* ── 类型定义 ─────────────────────────────────────────── */
interface Feed {
  id: string;
  content?: string;
  type?: string;
  createdBy?: Record<string, unknown>;
  createdOn?: string;
  commentsCount?: number;
  likesCount?: number;
  liked?: boolean;
  images?: string[];
}

/* ── 主页面组件 ───────────────────────────────────────── */
export default function FeedsPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newContent, setNewContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [filterType, setFilterType] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateBegin, setDateBegin] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [expandedSearch, setExpandedSearch] = useState(true);
  const [expandedType, setExpandedType] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(false);
  const [expandedUser, setExpandedUser] = useState(false);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);

  const typeLabels: Record<string, { label: string; icon: string }> = {
    "1": { label: "动态", icon: "📢" },
    "2": { label: "跟进", icon: "📝" },
    "4": { label: "日程", icon: "📅" },
    "3": { label: "公告", icon: "📣" },
  };

  /* ── 数据加载 ─────────────────────────────────────── */
  const fetchFeeds = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.listFeeds(pageNum, filterType || undefined);
        const data = res as Record<string, unknown>;
        const raw = data.data ?? data.feeds ?? data.items ?? [];
        const items = Array.isArray(raw) ? (raw as Feed[]) : [];
        if (append) {
          setFeeds((prev) => [...prev, ...items]);
        } else {
          setFeeds(items);
        }
        setHasMore(items.length >= 20);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [filterType]
  );

  useEffect(() => {
    setPage(1);
    fetchFeeds(1);
  }, [fetchFeeds]);

  // 加载用户列表（用于过滤）
  useEffect(() => {
    api
      .listUsers(1, 100)
      .then((data) => {
        const d = data as Record<string, unknown>;
        const list = (d.data || d.items || d.users || []) as Record<string, unknown>[];
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const handlePublish = async () => {
    if (!newContent.trim()) return;
    setPublishing(true);
    try {
      await api.publishFeed({ content: newContent, type: "1" });
      setNewContent("");
      fetchFeeds(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeeds(nextPage, true);
  };

  const handleLike = async (feedId: string) => {
    try {
      await api.post(`/feeds/like`, { feedId });
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? { ...f, liked: !f.liked, likesCount: (f.likesCount || 0) + (f.liked ? -1 : 1) }
            : f
        )
      );
    } catch {
      // ignore
    }
  };

  // 客户端过滤
  const filteredFeeds = feeds.filter((feed) => {
    if (searchKeyword) {
      const content = (feed.content || "").toLowerCase();
      if (!content.includes(searchKeyword.toLowerCase())) return false;
    }
    if (filterUser) {
      const creatorId = (feed.createdBy as Record<string, unknown>)?.id as string;
      if (creatorId !== filterUser) return false;
    }
    if (dateBegin) {
      if (feed.createdOn && new Date(feed.createdOn) < new Date(dateBegin)) return false;
    }
    if (dateEnd) {
      if (feed.createdOn && new Date(feed.createdOn) > new Date(dateEnd + "T23:59:59")) return false;
    }
    return true;
  });

  const clearSearch = () => {
    setSearchKeyword("");
    setDateBegin("");
    setDateEnd("");
    setFilterUser("");
    setFilterTeam("");
  };

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <div className="flex h-full">
      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">动态</h1>
            <p className="text-gray-500 mt-1">查看团队动态、公告和日程</p>
          </div>

          {/* 发布区域 */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="分享你的想法..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-gray-600" title="添加图片">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="text-gray-400 hover:text-gray-600" title="@提及">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing || !newContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                {publishing ? "发布中..." : "发布"}
              </button>
            </div>
          </div>

          {/* 类型过滤 */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setFilterType("")}
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                filterType === ""
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
              }`}
            >
              全部
            </button>
            {Object.entries(typeLabels).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition flex items-center gap-1 ${
                  filterType === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* 动态列表 */}
          {loading && feeds.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredFeeds.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="text-4xl mb-3">📢</div>
              <div className="text-gray-500">
                {searchKeyword || filterUser || dateBegin || dateEnd
                  ? "没有匹配的动态"
                  : "暂无动态"}
              </div>
              {(searchKeyword || filterUser || dateBegin || dateEnd) && (
                <button
                  onClick={clearSearch}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  清除筛选条件
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeeds.map((feed) => (
                <FeedCard key={feed.id} feed={feed} typeLabels={typeLabels} onLike={handleLike} />
              ))}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {loading ? "加载中..." : "加载更多"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右侧边栏 */}
      {showSidePanel && (
        <aside className="w-72 border-l bg-white flex-shrink-0 overflow-y-auto hidden lg:block">
          <div className="p-4">
            {/* 搜索面板 */}
            <div className="mb-4">
              <button
                onClick={() => setExpandedSearch(!expandedSearch)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  搜索
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedSearch ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {expandedSearch && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="输入关键词搜索"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateBegin}
                      onChange={(e) => setDateBegin(e.target.value)}
                      placeholder="起始日期"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      placeholder="截止日期"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t my-3" />

            {/* 类型面板 */}
            <div className="mb-4">
              <button
                onClick={() => setExpandedType(!expandedType)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
              >
                <span>类型</span>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedType ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {expandedType && (
                <ul className="space-y-1">
                  {Object.entries(typeLabels).map(([key, { label, icon }]) => (
                    <li key={key}>
                      <button
                        onClick={() => setFilterType(filterType === key ? "" : key)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${
                          filterType === key
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {icon} {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t my-3" />

            {/* 团队面板 */}
            <div className="mb-4">
              <button
                onClick={() => setExpandedTeam(!expandedTeam)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
              >
                <span>团队</span>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedTeam ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {expandedTeam && (
                <div className="text-sm text-gray-400 py-2">暂无团队数据</div>
              )}
            </div>

            <div className="border-t my-3" />

            {/* 用户面板 */}
            <div className="mb-4">
              <button
                onClick={() => setExpandedUser(!expandedUser)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
              >
                <span>用户</span>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedUser ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {expandedUser && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="搜索用户"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setFilterUser("")}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded ${
                      !filterUser ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    全部用户
                  </button>
                  {users.slice(0, 20).map((u, idx) => {
                    const uid = (u.id || u.userId || "") as string;
                    const name = (u.fullName || u.name || u.loginName || "用户") as string;
                    return (
                      <button
                        key={idx}
                        onClick={() => setFilterUser(uid)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${
                          filterUser === uid
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 清除筛选 */}
            {(searchKeyword || filterType || filterUser || dateBegin || dateEnd) && (
              <>
                <div className="border-t my-3" />
                <button
                  onClick={clearSearch}
                  className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                >
                  清除所有筛选
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

/* ── 动态卡片组件 ─────────────────────────────────────── */
function FeedCard({
  feed,
  typeLabels,
  onLike,
}: {
  feed: Feed;
  typeLabels: Record<string, { label: string; icon: string }>;
  onLike: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const creator = feed.createdBy || {};
  const creatorName = ((creator as Record<string, unknown>).fullName ||
    (creator as Record<string, unknown>).loginName ||
    "用户") as string;
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  const loadComments = async () => {
    try {
      const res = await api.get(`/feeds/comments?feedId=${feed.id}`);
      const data = res as Record<string, unknown>;
      setComments(((data.data || data.items || []) as Record<string, unknown>[]) || []);
    } catch {
      // ignore
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/feeds/comment", { feedId: feed.id, content: newComment });
      setNewComment("");
      loadComments();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
          {creatorInitial}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-800">{creatorName}</div>
          <div className="text-xs text-gray-400">
            {feed.createdOn ? new Date(feed.createdOn).toLocaleString("zh-CN") : ""}
          </div>
        </div>
        {feed.type && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
            {typeLabels[feed.type]?.label || feed.type}
          </span>
        )}
      </div>

      {/* 内容 */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{feed.content}</p>

      {/* 图片 */}
      {feed.images && feed.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {feed.images.map((img, idx) => (
            <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex gap-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onLike(feed.id)}
          className={`flex items-center gap-1 text-xs transition ${
            feed.liked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
          }`}
        >
          <svg className="w-4 h-4" fill={feed.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {feed.likesCount || 0}
        </button>
        <button
          onClick={() => {
            setShowComments(!showComments);
            if (!showComments) loadComments();
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {feed.commentsCount || 0}
        </button>
        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          分享
        </button>
      </div>

      {/* 评论区 */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {comments.map((c, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs flex-shrink-0">
                {((c.createdBy as Record<string, unknown>)?.fullName || "U").toString().charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-700">
                  {((c.createdBy as Record<string, unknown>)?.fullName || "用户") as string}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {c.createdOn ? new Date(c.createdOn as string).toLocaleString("zh-CN") : ""}
                </span>
                <p className="text-sm text-gray-600 mt-0.5">{(c.content || "") as string}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-2">暂无评论</div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="写评论..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleComment}
              disabled={submitting || !newComment.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
