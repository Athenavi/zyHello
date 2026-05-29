"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  FolderOpen,
  Upload,
  Search,
  X,
  LayoutGrid,
  List,
  FolderPlus,
  Download,
  Trash2,
  Move,
  ChevronRight,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Home,
  MoreHorizontal,
  ArrowUpDown,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  uploadTime?: string;
  uploadUser?: string;
}

const SORT_OPTIONS = [
  { key: "name", label: "按名称" },
  { key: "time", label: "按时间" },
  { key: "size", label: "按大小" },
] as const;

const FILE_ICON_MAP: Record<string, { icon: typeof File; color: string }> = {
  pdf: { icon: FileText, color: "text-red-500" },
  doc: { icon: FileText, color: "text-blue-500" },
  docx: { icon: FileText, color: "text-blue-500" },
  xls: { icon: FileSpreadsheet, color: "text-green-500" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-500" },
  ppt: { icon: FileText, color: "text-orange-500" },
  pptx: { icon: FileText, color: "text-orange-500" },
  jpg: { icon: FileImage, color: "text-purple-500" },
  jpeg: { icon: FileImage, color: "text-purple-500" },
  png: { icon: FileImage, color: "text-purple-500" },
  gif: { icon: FileImage, color: "text-purple-500" },
  zip: { icon: FileArchive, color: "text-yellow-500" },
  rar: { icon: FileArchive, color: "text-yellow-500" },
  "7z": { icon: FileArchive, color: "text-yellow-500" },
  mp4: { icon: FileVideo, color: "text-pink-500" },
  mp3: { icon: FileAudio, color: "text-indigo-500" },
  txt: { icon: FileText, color: "text-gray-500" },
  csv: { icon: FileSpreadsheet, color: "text-green-500" },
  json: { icon: FileCode, color: "text-yellow-500" },
  xml: { icon: FileCode, color: "text-orange-500" },
  js: { icon: FileCode, color: "text-yellow-400" },
  ts: { icon: FileCode, color: "text-blue-400" },
  py: { icon: FileCode, color: "text-green-400" },
  html: { icon: FileCode, color: "text-orange-400" },
  css: { icon: FileCode, color: "text-blue-400" },
  md: { icon: FileText, color: "text-gray-500" },
};

function getFileIconInfo(file: FileItem): { icon: typeof File; color: string } {
  if (file.type === "folder") return { icon: FolderOpen, color: "text-blue-500" };
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_MAP[ext] || { icon: File, color: "text-muted-foreground" };
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "根目录" },
  ]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "time" | "size">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const folderRes = (await api.request(
        `/files/tree-folder${currentFolder ? `?parent_id=${currentFolder}` : ""}`
      )) as Record<string, unknown>;
      const folders: FileItem[] = (
        ((folderRes.data || folderRes) as unknown as Record<string, unknown>[]) || []
      ).map((f: Record<string, unknown>) => ({
        id: (f.folder_id || "") as string,
        name: (f.folder_name || "") as string,
        type: "folder" as const,
      }));

      const fileRes = (await api.request(
        `/files/list-file${currentFolder ? `?folder_id=${currentFolder}` : ""}`
      )) as Record<string, unknown>;
      const fileList: FileItem[] = (
        ((fileRes.data || fileRes) as unknown as Record<string, unknown>[]) || []
      ).map((f: Record<string, unknown>) => ({
        id: (f.attachment_id || "") as string,
        name: (f.file_name || "") as string,
        type: "file" as const,
        size: (f.file_size || 0) as number,
        uploadTime: (f.created_on || "") as string,
        uploadUser: (f.created_by || "") as string,
      }));

      setFiles([...folders, ...fileList]);
    } catch {
      toast.error("加载文件列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = useMemo(() => {
    return files
      .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "size") return (a.size || 0) - (b.size || 0);
        return (a.uploadTime || "").localeCompare(b.uploadTime || "");
      });
  }, [files, search, sort]);

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolder(folderId);
    if (folderId === null) {
      setFolderPath([{ id: null, name: "根目录" }]);
    } else {
      const idx = folderPath.findIndex((p) => p.id === folderId);
      if (idx >= 0) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        setFolderPath([...folderPath, { id: folderId, name: folderName }]);
      }
    }
  };

  const handleOpenFolder = (file: FileItem) => {
    if (file.type === "folder") {
      navigateToFolder(file.id, file.name);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.post("/files/create-folder", {
        name: newFolderName.trim(),
        parentId: currentFolder,
      });
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("文件夹创建成功");
      fetchFiles();
    } catch {
      toast.error("创建文件夹失败");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }
    if (currentFolder) {
      formData.append("folder_id", currentFolder);
    }
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${baseUrl}/files/post-files`, {
        method: "POST",
        headers,
        body: formData,
      });
      toast.success(`${selectedFiles.length} 个文件上传成功`);
      fetchFiles();
    } catch {
      toast.error("文件上传失败");
    } finally {
      setUploading(false);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    try {
      await api.post("/files/delete-files", { file_ids: Array.from(selected) });
      toast.success(`已删除 ${selected.size} 个项目`);
      setSelected(new Set());
      fetchFiles();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredFiles.map((f) => f.id)));
    } else {
      setSelected(new Set());
    }
  };

  const isAllSelected = filteredFiles.length > 0 && filteredFiles.every((f) => selected.has(f.id));

  return (
    <div className={cn("flex flex-col h-full bg-background", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">文件管理</h1>
            </div>
            <Badge variant="secondary">{filteredFiles.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新建文件夹</TooltipContent>
            </Tooltip>
            <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
              <Upload className="w-4 h-4 mr-1.5" />
              上传
            </Button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-2 border-t">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-shrink-0">
            {folderPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <button
                  onClick={() => navigateToFolder(p.id, p.name)}
                  className={cn(
                    "hover:text-primary transition px-1.5 py-0.5 rounded",
                    i === folderPath.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {i === 0 ? <Home className="w-3.5 h-3.5 inline" /> : p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索文件..."
              className="pl-9 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {SORT_OPTIONS.find((s) => s.key === sort)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {SORT_OPTIONS.map((s) => (
                <DropdownMenuItem
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={cn(sort === s.key && "bg-accent")}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>网格视图</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>列表视图</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Batch actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 lg:px-6 py-2 bg-primary/5 border-t">
            <Badge variant="info" className="gap-1">
              已选择 {selected.size} 项
            </Badge>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>下载</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Move className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>移动</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDeleteSelected}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="ml-auto">
              取消选择
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder tree sidebar */}
        <aside className="w-56 border-r bg-card flex-shrink-0 hidden md:flex flex-col">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground">文件目录</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <button
                onClick={() => navigateToFolder(null, "根目录")}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition",
                  currentFolder === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Home className="w-4 h-4" />
                根目录
              </button>
            </div>
          </ScrollArea>
        </aside>

        {/* File grid/list */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="w-12 h-12 mx-auto rounded-lg" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-12 h-12" />}
              title={search ? "未找到匹配的文件" : "暂无文件"}
              description={search ? "尝试更换搜索关键词" : "点击上传按钮添加文件"}
              action={
                !search
                  ? { label: "上传文件", onClick: () => fileRef.current?.click() }
                  : { label: "清除搜索", onClick: () => setSearch("") }
              }
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFiles.map((file, idx) => {
                const { icon: Icon, color } = getFileIconInfo(file);
                return (
                  <Card
                    key={file.id}
                    hover
                    className={cn(
                      "cursor-pointer transition-all",
                      mounted ? "animate-fade-up" : "opacity-0",
                      selected.has(file.id) && "ring-2 ring-primary border-primary/30"
                    )}
                    style={{ animationDelay: `${Math.min(idx, 20) * 30}ms` }}
                    onClick={() =>
                      file.type === "folder" ? handleOpenFolder(file) : toggleSelect(file.id)
                    }
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <Icon className={cn("w-6 h-6", color)} />
                      </div>
                      <div className="text-sm font-medium truncate w-full">{file.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {file.type === "folder" ? "文件夹" : formatBytes(file.size ?? 0)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className={cn("overflow-hidden", mounted ? "animate-fade-up" : "opacity-0")}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        名称
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-24">
                        大小
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-40">
                        上传时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-32">
                        上传者
                      </th>
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3"><Skeleton className="w-4 h-4" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3" />
                        </tr>
                      ))
                    ) : (
                      filteredFiles.map((file, idx) => {
                        const { icon: Icon, color } = getFileIconInfo(file);
                        return (
                          <tr
                            key={file.id}
                            className={cn(
                              "hover:bg-muted/50 cursor-pointer transition",
                              selected.has(file.id) && "bg-primary/5"
                            )}
                            onClick={() =>
                              file.type === "folder"
                                ? handleOpenFolder(file)
                                : toggleSelect(file.id)
                            }
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selected.has(file.id)}
                                onCheckedChange={() => toggleSelect(file.id)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <Icon className={cn("w-4 h-4", color)} />
                                </div>
                                <span className="text-sm font-medium truncate">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {file.type === "folder" ? "-" : formatBytes(file.size ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {file.uploadTime ? formatDate(file.uploadTime) : "-"}
                            </td>
                            <td className="px-4 py-3">
                              {file.uploadUser ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs">
                                      {file.uploadUser.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground truncate">
                                    {file.uploadUser}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Download className="w-4 h-4 mr-2" />
                                    下载
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Move className="w-4 h-4 mr-2" />
                                    移动
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onOpenChange={(open) => {
        if (!open) {
          setShowNewFolder(false);
          setNewFolderName("");
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              新建文件夹
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="请输入文件夹名称"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
              取消
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
