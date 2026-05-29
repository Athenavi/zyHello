"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  X,
  Image as ImageIcon,
  AtSign,
  Heart,
  MessageCircle,
  Share2,
  Send,
  ChevronRight,
  Calendar,
  Megaphone,
  FileText,
  Activity,
  Users,
  User,
  Filter,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Types ─────────────────────────────────────────────────────── */
interface Feed {
  id: string;
  content?: string;
  type?: number | string;
  createdBy?: [string, string]; // [userId, fullName]
  createdOn?: string;
  numComments?: number;
  numLike?: number;
  myLike?: boolean;
  images?: string[];
  scope?: string;
  contentMore?: Record<string, unknown>;
  relatedRecord?: string;
}

const TYPE_LABELS: Record<
  string,
  { label: string; icon: typeof Activity; color: string }
> = {
  "1": { label: "动态", icon: Activity, color: "text-info" },
  "2": { label: "跟进", icon: FileText, color: "text-success" },
  "4": { label: "日程", icon: Calendar, color: "text-warning" },
  "3": { label: "公告", icon: Megaphone, color: "text-destructive" },
};

/* ── Main Page ─────────────────────────────────────────────────── */
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
  const [filterUser, setFilterUser] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [expandedSearch, setExpandedSearch] = useState(true);
  const [expandedType, setExpandedType] = useState(true);
  const [expandedUser, setExpandedUser] = useState(false);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [mounted, setMounted] = useState(false);

  /* ── Data Loading ─────────────────────────────────────── */
  const fetchFeeds = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.listFeeds(pageNum, filterType || undefined);
        let data = res as Record<string, unknown>;
        if (
          "error_code" in data &&
          "data" in data &&
          typeof data.data === "object" &&
          data.data !== null
        ) {
          data = data.data as Record<string, unknown>;
        }
        const raw = Array.isArray(data)
          ? data
          : data.data ?? data.feeds ?? data.items ?? [];
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
    setMounted(true);
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFeeds(1);
  }, [fetchFeeds]);

  useEffect(() => {
    api
      .listUsers(1, 100)
      .then((data) => {
        const d = data as Record<string, unknown>;
        const list = (d.data || d.items || d.users || []) as Record<
          string,
          unknown
        >[];
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const handlePublish = async () => {
    if (!newContent.trim()) return;
    setPublishing(true);
    try {
      await api.publishFeed({ content: newContent, type: 1 });
      setNewContent("");
      toast.success("发布成功");
      fetchFeeds(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "发布失败";
      setError(msg);
      toast.error(msg);
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
      await api.post(`/feeds/like`, { source: feedId });
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? {
                ...f,
                myLike: !f.myLike,
                numLike: (f.numLike || 0) + (f.myLike ? -1 : 1),
              }
            : f
        )
      );
    } catch {
      // ignore
    }
  };

  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
      if (searchKeyword) {
        const content = (feed.content || "").toLowerCase();
        if (!content.includes(searchKeyword.toLowerCase())) return false;
      }
      if (filterUser) {
        const creatorId = feed.createdBy?.[0];
        if (creatorId !== filterUser) return false;
      }
      if (dateBegin) {
        if (
          feed.createdOn &&
          new Date(feed.createdOn) < new Date(dateBegin)
        )
          return false;
      }
      if (dateEnd) {
        if (
          feed.createdOn &&
          new Date(feed.createdOn) > new Date(dateEnd + "T23:59:59")
        )
          return false;
      }
      return true;
    });
  }, [feeds, searchKeyword, filterUser, dateBegin, dateEnd]);

  const clearSearch = () => {
    setSearchKeyword("");
    setDateBegin("");
    setDateEnd("");
    setFilterUser("");
  };

  const hasActiveFilters =
    searchKeyword || filterUser || dateBegin || dateEnd;

  return (
    <div
      className={cn(
        "flex h-full",
        mounted ? "animate-fade-in" : "opacity-0"
      )}
    >
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">动态</h1>
            <p className="text-muted-foreground mt-1">
              查看团队动态、公告和日程
            </p>
          </div>

          {/* Publish area */}
          <Card>
            <CardContent className="p-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="分享你的想法..."
                rows={3}
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-transparent"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>添加图片</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <AtSign className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>@提及</TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !newContent.trim()}
                  loading={publishing}
                  size="sm"
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  发布
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Type filter pills */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === "" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setFilterType("")}
            >
              全部
            </Button>
            {Object.entries(TYPE_LABELS).map(
              ([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={filterType === key ? "default" : "outline"}
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => setFilterType(key)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Button>
              )
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="text-destructive/60 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Feed list */}
          {loading && feeds.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredFeeds.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <EmptyState
                  icon={<Activity className="w-12 h-12" />}
                  title={
                    hasActiveFilters ? "没有匹配的动态" : "暂无动态"
                  }
                  description={
                    hasActiveFilters
                      ? "尝试调整筛选条件"
                      : "还没有人发布动态"
                  }
                  action={
                    hasActiveFilters
                      ? { label: "清除筛选条件", onClick: clearSearch }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFeeds.map((feed, idx) => (
                <div
                  key={feed.id}
                  className={cn(
                    mounted ? "animate-fade-up" : "opacity-0"
                  )}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <FeedCard
                    feed={feed}
                    onLike={handleLike}
                  />
                </div>
              ))}
              {hasMore && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    loading={loading}
                  >
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      {showSidePanel && (
        <aside className="w-72 border-l bg-card flex-shrink-0 overflow-y-auto hidden lg:block">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Search panel */}
              <div>
                <button
                  onClick={() => setExpandedSearch(!expandedSearch)}
                  className="flex items-center justify-between w-full text-sm font-medium mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Search className="w-4 h-4" />
                    搜索
                  </span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expandedSearch && "rotate-90"
                    )}
                  />
                </button>
                {expandedSearch && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchKeyword}
                        onChange={(e) =>
                          setSearchKeyword(e.target.value)
                        }
                        placeholder="输入关键词搜索"
                        className="pl-9 h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={dateBegin}
                        onChange={(e) => setDateBegin(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Type panel */}
              <div>
                <button
                  onClick={() => setExpandedType(!expandedType)}
                  className="flex items-center justify-between w-full text-sm font-medium mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4" />
                    类型
                  </span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expandedType && "rotate-90"
                    )}
                  />
                </button>
                {expandedType && (
                  <div className="space-y-1">
                    {Object.entries(TYPE_LABELS).map(
                      ([key, { label, icon: Icon, color }]) => (
                        <button
                          key={key}
                          onClick={() =>
                            setFilterType(
                              filterType === key ? "" : key
                            )
                          }
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors",
                            filterType === key
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", color)} />
                          {label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* User panel */}
              <div>
                <button
                  onClick={() => setExpandedUser(!expandedUser)}
                  className="flex items-center justify-between w-full text-sm font-medium mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    用户
                  </span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expandedUser && "rotate-90"
                    )}
                  />
                </button>
                {expandedUser && (
                  <div className="space-y-1 max-h-48">
                    <ScrollArea className="max-h-48">
                      <button
                        onClick={() => setFilterUser("")}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors",
                          !filterUser
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <User className="w-4 h-4" />
                        全部用户
                      </button>
                      {users.slice(0, 20).map((u, idx) => {
                        const uid = (u.id || u.userId || "") as string;
                        const name = (
                          u.fullName ||
                          u.name ||
                          u.loginName ||
                          "用户"
                        ) as string;
                        return (
                          <button
                            key={idx}
                            onClick={() => setFilterUser(uid)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors",
                              filterUser === uid
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[10px]">
                                {name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {name}
                          </button>
                        );
                      })}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={clearSearch}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    清除所有筛选
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
}

/* ── Feed Card Component ───────────────────────────────────────── */
function FeedCard({
  feed,
  onLike,
}: {
  feed: Feed;
  onLike: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const creator = feed.createdBy || ["", "用户"];
  const creatorName = creator[1] || "用户";
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  const typeInfo = feed.type ? TYPE_LABELS[String(feed.type)] : null;
  const TypeIcon = typeInfo?.icon;

  const loadComments = async () => {
    try {
      const res = await api.get(
        `/feeds/comments-list?id=${feed.id}`
      );
      let data = res as Record<string, unknown>;
      if (
        "error_code" in data &&
        "data" in data &&
        typeof data.data === "object" &&
        data.data !== null
      ) {
        data = data.data as Record<string, unknown>;
      }
      const list = (
        data.data ||
        data.items ||
        data.comments ||
        []
      ) as Record<string, unknown>[];
      setComments(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/feeds/comment", {
        feedsId: feed.id,
        content: newComment,
      });
      setNewComment("");
      toast.success("评论已发布");
      loadComments();
    } catch {
      toast.error("评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-primary/70 to-primary text-white text-sm font-bold">
              {creatorInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{creatorName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {feed.createdOn
                ? new Date(feed.createdOn).toLocaleString("zh-CN")
                : ""}
            </div>
          </div>
          {typeInfo && TypeIcon && (
            <Badge variant="secondary" className="gap-1">
              <TypeIcon className="w-3 h-3" />
              {typeInfo.label}
            </Badge>
          )}
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap mb-3">
          {feed.content}
        </p>

        {/* Images */}
        {feed.images && feed.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {feed.images.map((img, idx) => (
              <div
                key={idx}
                className="aspect-square bg-muted rounded-lg overflow-hidden"
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex gap-4 pt-3 border-t">
          <button
            onClick={() => onLike(feed.id)}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              feed.myLike
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
          >
            <Heart
              className={cn("w-4 h-4", feed.myLike && "fill-current")}
            />
            {feed.numLike || 0}
          </button>
          <button
            onClick={() => {
              setShowComments(!showComments);
              if (!showComments) loadComments();
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {feed.numComments || 0}
          </button>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Share2 className="w-4 h-4" />
            分享
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {comments.map((c, idx) => {
              const cName = (
                Array.isArray(c.createdBy)
                  ? c.createdBy[1]
                  : (c.createdBy as Record<string, unknown>)?.fullName ||
                    "用户"
              ) as string;
              return (
                <div key={idx} className="flex gap-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {cName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {cName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.createdOn
                          ? new Date(
                              c.createdOn as string
                            ).toLocaleString("zh-CN")
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {(c.content || "") as string}
                    </p>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                暂无评论
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleComment()
                }
                placeholder="写评论..."
                className="flex-1 h-8 text-sm"
              />
              <Button
                onClick={handleComment}
                disabled={submitting || !newComment.trim()}
                loading={submitting}
                size="sm"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
