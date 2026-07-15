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
  ChevronDown,
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
  Pencil,
  ExternalLink,
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
  DialogDescription,
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

interface FolderNode {
  folder_id: string;
  folder_name: string;
  scope: number;
  created_by: string;
  children?: FolderNode[];
  _loaded?: boolean;
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

// ── Folder Tree Node Component ──────────────────────────────────────

function FolderTreeNode({
  node,
  currentFolder,
  depth,
  onSelect,
  onToggle,
}: {
  node: FolderNode;
  currentFolder: string | null;
  depth: number;
  onSelect: (id: string, name: string) => void;
  onToggle: (node: FolderNode) => void;
}) {
  const hasChildren = node.children !== undefined;
  const isExpanded = hasChildren && node._loaded;
  const isActive = currentFolder === node.folder_id;

  return (
    <div>
      <button
        onClick={() => onSelect(node.folder_id, node.folder_name)}
        className={cn(
          "w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition group",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted text-muted-foreground"
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node);
          }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-500" />
        <span className="truncate">{node.folder_name}</span>
      </button>
      {isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.folder_id}
              node={child}
              currentFolder={currentFolder}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Preview Component ────────────────────────────────────────────────

function FilePreviewContent({
  file,
  token,
  apiBase,
}: {
  file: FileItem;
  token: string | null;
  apiBase: string;
}) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const imgExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  const videoExts = ["mp4", "webm", "ogg"];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg"];
  const docExts = ["pdf"];
  const url = `${apiBase}/files/download?file_id=${file.id}${token ? `&token=${token}` : ""}`;

  if (imgExts.includes(ext)) {
    return (
      <img
        src={url}
        alt={file.name}
        className="max-w-full max-h-[60vh] object-contain rounded"
      />
    );
  }

  if (videoExts.includes(ext)) {
    return (
      <video
        controls
        className="max-w-full max-h-[60vh] rounded"
        onError={(e) => {
          (e.target as HTMLVideoElement).style.display = "none";
        }}
      >
        <source src={url} />
        您的浏览器不支持视频播放
      </video>
    );
  }

  if (audioExts.includes(ext)) {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-4 py-8">
        <FileAudio className="w-16 h-16 text-indigo-500 opacity-60" />
        <p className="text-sm font-medium">{file.name}</p>
        <audio controls className="w-full" src={url}>
          您的浏览器不支持音频播放
        </audio>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size ?? 0)}
        </p>
      </div>
    );
  }

  if (docExts.includes(ext)) {
    return (
      <div className="w-full flex flex-col items-center gap-4 py-4">
        <iframe
          src={`${apiBase}/files/download?file_id=${file.id}${token ? `&token=${token}` : ""}`}
          className="w-full h-[60vh] rounded border"
          title={file.name}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            新窗口打开
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground py-8">
      <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
      <p className="text-sm mb-3">该文件类型不支持在线预览</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
      >
        <Download className="w-4 h-4" />
        下载查看
      </a>
    </div>
  );
}

// ── Folder Picker (for Move dialog) ──────────────────────────────────

function FolderPickerTree({
  nodes,
  depth,
  onSelect,
}: {
  nodes: FolderNode[];
  depth: number;
  onSelect: (folderId: string, folderName: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.folder_id}>
          <button
            onClick={() => onSelect(node.folder_id, node.folder_name)}
            className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 hover:bg-muted transition"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">{node.folder_name}</span>
          </button>
          {node.children && node.children.length > 0 && (
            <FolderPickerTree
              nodes={node.children}
              depth={depth + 1}
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

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
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Folder tree state
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);

  // Rename state
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Move state
  const [moveTargets, setMoveTargets] = useState<FileItem[]>([]);
  const [showMove, setShowMove] = useState(false);
  const [moveFolderTree, setMoveFolderTree] = useState<FolderNode[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }, []);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Load root folder tree ──────────────────────────────────────────

  const loadTree = useCallback(async () => {
    try {
      const res = (await api.request("/files/tree-folder")) as Record<string, unknown>;
      const rawNodes = ((res.data || res) as unknown as FolderNode[]) || [];
      setFolderTree(rawNodes);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // ── Load child folders on expand ───────────────────────────────────

  const loadFolderChildren = useCallback(async (parentNode: FolderNode) => {
    try {
      const res = (await api.request(
        `/files/tree-folder?parent_id=${parentNode.folder_id}`
      )) as Record<string, unknown>;
      const childNodes = ((res.data || res) as unknown as FolderNode[]) || [];
      const updateNode = (nodes: FolderNode[]): FolderNode[] =>
        nodes.map((n) => {
          if (n.folder_id === parentNode.folder_id) {
            return { ...n, children: childNodes, _loaded: true };
          }
          if (n.children) {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });
      setFolderTree((prev) => updateNode(prev));
    } catch {
      toast.error("加载子文件夹失败");
    }
  }, []);

  const toggleFolder = useCallback(
    (node: FolderNode) => {
      if (node._loaded) {
        // Toggle collapse: set _loaded to false
        const updateNode = (nodes: FolderNode[]): FolderNode[] =>
          nodes.map((n) => {
            if (n.folder_id === node.folder_id) {
              return { ...n, _loaded: !n._loaded };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        setFolderTree((prev) => updateNode(prev));
      } else {
        loadFolderChildren(node);
      }
    },
    [loadFolderChildren]
  );

  // ── Fetch files in current folder ──────────────────────────────────

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

  // ── Filtering & sorting ────────────────────────────────────────────

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

  // ── Navigation ─────────────────────────────────────────────────────

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

  // ── Selection ──────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredFiles.map((f) => f.id)));
    } else {
      setSelected(new Set());
    }
  };

  const isAllSelected =
    filteredFiles.length > 0 && filteredFiles.every((f) => selected.has(f.id));

  // ── Create Folder ──────────────────────────────────────────────────

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
      loadTree();
    } catch {
      toast.error("创建文件夹失败");
    }
  };

  // ── Upload with conflict check ─────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileNames = Array.from(selectedFiles).map((f) => f.name);

    // Check filename conflicts
    try {
      const checkRes = (await api.post("/files/check-files", {
        filenames: fileNames,
        folder_id: currentFolder,
      })) as { conflicts?: Record<string, string> };
      const conflicts = checkRes?.conflicts as Record<string, string> | undefined;
      if (conflicts && Object.keys(conflicts).length > 0) {
        const conflictNames = Object.keys(conflicts).join("、");
        const overwrite = window.confirm(
          `以下文件已存在：${conflictNames}\n\n是否继续上传（同名文件将被保留）？`
        );
        if (!overwrite) {
          if (fileRef.current) fileRef.current.value = "";
          return;
        }
      }
    } catch {
      // If conflict check fails, proceed anyway
    }

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }
    if (currentFolder) {
      formData.append("folder_id", currentFolder);
    }
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_BASE}/files/post-files`, {
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

  // ── Delete ─────────────────────────────────────────────────────────

  const handleDeleteItem = async (item: FileItem) => {
    if (item.type === "folder") {
      if (!confirm(`确定删除文件夹 "${item.name}" 及其所有文件？`)) return;
      try {
        await api.post("/files/delete-folder", { folder_id: item.id });
        toast.success(`文件夹 "${item.name}" 已删除`);
        fetchFiles();
        loadTree();
      } catch {
        toast.error("删除失败");
      }
    } else {
      if (!confirm(`确定删除文件 "${item.name}"？`)) return;
      try {
        await api.post("/files/delete-files", { file_ids: [item.id] });
        toast.success(`文件 "${item.name}" 已删除`);
        fetchFiles();
      } catch {
        toast.error("删除失败");
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    const fileItems = files.filter((f) => selected.has(f.id));
    const folderItems = fileItems.filter((f) => f.type === "folder");
    const onlyFileIds = fileItems.filter((f) => f.type === "file").map((f) => f.id);

    if (folderItems.length > 0) {
      if (
        !confirm(
          `所选包含 ${folderItems.length} 个文件夹，删除将同时删除文件夹内所有文件。确定继续？`
        )
      )
        return;
    }

    try {
      // Delete folders first
      for (const folder of folderItems) {
        await api.post("/files/delete-folder", { folder_id: folder.id });
      }
      // Delete files
      if (onlyFileIds.length > 0) {
        await api.post("/files/delete-files", { file_ids: onlyFileIds });
      }
      toast.success(`已删除 ${selected.size} 个项目`);
      setSelected(new Set());
      fetchFiles();
      loadTree();
    } catch {
      toast.error("删除失败");
    }
  };

  // ── Preview ────────────────────────────────────────────────────────

  const handlePreview = async (file: FileItem) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  // ── Rename ─────────────────────────────────────────────────────────

  const handleRenameClick = (file: FileItem) => {
    setRenameTarget(file);
    setRenameValue(file.name);
    setShowRename(true);
  };

  const handleRenameConfirm = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await api.post("/files/file-edit", {
        file_id: renameTarget.id,
        file_name: renameValue.trim(),
      });
      toast.success("重命名成功");
      setShowRename(false);
      setRenameTarget(null);
      fetchFiles();
    } catch {
      toast.error("重命名失败");
    }
  };

  // ── Move ───────────────────────────────────────────────────────────

  const loadMoveFolderTree = useCallback(async () => {
    try {
      const res = (await api.request("/files/tree-folder")) as Record<string, unknown>;
      const rawNodes = ((res.data || res) as unknown as FolderNode[]) || [];
      setMoveFolderTree(rawNodes);
    } catch {
      // silently fail
    }
  }, []);

  const handleMoveClick = (items: FileItem | FileItem[]) => {
    const targets = Array.isArray(items) ? items : [items];
    setMoveTargets(targets);
    loadMoveFolderTree();
    setShowMove(true);
  };

  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (moveTargets.length === 0) return;
    const fileIds = moveTargets
      .filter((f) => f.type === "file")
      .map((f) => f.id);
    if (fileIds.length === 0) {
      toast.error("只能移动文件，不能移动文件夹");
      return;
    }
    try {
      await api.post("/files/move-files", {
        file_ids: fileIds,
        folder_id: targetFolderId,
      });
      const targetName =
        targetFolderId === null
          ? "根目录"
          : moveTargets.length === 1
            ? moveTargets[0].name
            : `目标文件夹`;
      toast.success(`${fileIds.length} 个文件已移动`);
      setShowMove(false);
      setMoveTargets([]);
      fetchFiles();
    } catch {
      toast.error("移动文件失败");
    }
  };

  // ── Batch Download ─────────────────────────────────────────────────

  const handleBatchDownload = async () => {
    const fileIds = Array.from(selected).filter((id) =>
      files.find((f) => f.id === id && f.type === "file")
    );
    if (fileIds.length === 0) {
      toast.error("请选择要下载的文件");
      return;
    }

    if (fileIds.length === 1) {
      // Single file: open download URL directly
      const token = getToken();
      window.open(
        `${API_BASE}/files/download?file_id=${fileIds[0]}${token ? `&token=${token}` : ""}`,
        "_blank"
      );
      return;
    }

    // Multiple files: download one by one
    for (const fid of fileIds) {
      const token = getToken();
      window.open(
        `${API_BASE}/files/download?file_id=${fid}${token ? `&token=${token}` : ""}`,
        "_blank"
      );
    }
    toast.success(`正在下载 ${fileIds.length} 个文件`);
  };

  // ── Download single file ───────────────────────────────────────────

  const handleDownload = (file: FileItem) => {
    const token = getToken();
    window.open(
      `${API_BASE}/files/download?file_id=${file.id}${token ? `&token=${token}` : ""}`,
      "_blank"
    );
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        mounted ? "animate-fade-in" : "opacity-0"
      )}
    >
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新建文件夹</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              上传
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-2 border-t">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-shrink-0">
            {folderPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBatchDownload}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>下载</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleMoveClick(
                        files.filter((f) => selected.has(f.id))
                      )
                    }
                  >
                    <Move className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>移动</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="ml-auto"
            >
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
            <h3 className="text-sm font-semibold text-muted-foreground">
              文件目录
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
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
              <Separator className="my-1.5" />
              {folderTree.map((node) => (
                <FolderTreeNode
                  key={node.folder_id}
                  node={node}
                  currentFolder={currentFolder}
                  depth={0}
                  onSelect={(id, name) => navigateToFolder(id, name)}
                  onToggle={toggleFolder}
                />
              ))}
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
              description={
                search ? "尝试更换搜索关键词" : "点击上传按钮添加文件"
              }
              action={
                !search
                  ? {
                      label: "上传文件",
                      onClick: () => fileRef.current?.click(),
                    }
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
                      selected.has(file.id) &&
                        "ring-2 ring-primary border-primary/30"
                    )}
                    style={{ animationDelay: `${Math.min(idx, 20) * 30}ms` }}
                    onClick={() =>
                      file.type === "folder"
                        ? handleOpenFolder(file)
                        : toggleSelect(file.id)
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Let the dropdown handle it
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <Icon className={cn("w-6 h-6", color)} />
                      </div>
                      <div className="text-sm font-medium truncate w-full">
                        {file.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {file.type === "folder"
                          ? "文件夹"
                          : formatBytes(file.size ?? 0)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card
              className={cn(
                "overflow-hidden",
                mounted ? "animate-fade-up" : "opacity-0"
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) =>
                            handleSelectAll(checked as boolean)
                          }
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
                          <td className="px-4 py-3">
                            <Skeleton className="w-4 h-4" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-48" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      ))
                    ) : (
                      filteredFiles.map((file) => {
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
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                <span className="text-sm font-medium truncate">
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {file.type === "folder"
                                ? "-"
                                : formatBytes(file.size ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {file.uploadTime
                                ? formatDate(file.uploadTime)
                                : "-"}
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
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDownload(file)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    下载
                                  </DropdownMenuItem>
                                  {file.type === "file" && (
                                    <DropdownMenuItem
                                      onClick={() => handlePreview(file)}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      预览
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleRenameClick(file)}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    重命名
                                  </DropdownMenuItem>
                                  {file.type === "file" && (
                                    <DropdownMenuItem
                                      onClick={() => handleMoveClick(file)}
                                    >
                                      <Move className="w-4 h-4 mr-2" />
                                      移动到...
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteItem(file)}
                                  >
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

      {/* ── New folder dialog ──────────────────────────────────────── */}
      <Dialog
        open={showNewFolder}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewFolder(false);
            setNewFolderName("");
          }
        }}
      >
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
            <Button
              variant="outline"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── File preview dialog ───────────────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {previewFile?.name || "文件预览"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 min-h-[200px] flex items-center justify-center bg-muted/20 rounded-lg">
            {previewFile && (
              <FilePreviewContent
                file={previewFile}
                token={getToken()}
                apiBase={API_BASE}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Rename dialog ─────────────────────────────────────────── */}
      <Dialog
        open={showRename}
        onOpenChange={(open) => {
          if (!open) {
            setShowRename(false);
            setRenameTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              重命名
            </DialogTitle>
            <DialogDescription>
              {renameTarget?.type === "folder" ? "文件夹" : "文件"}：
              {renameTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="请输入新名称"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRename(false);
                setRenameTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!renameValue.trim()}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move dialog ───────────────────────────────────────────── */}
      <Dialog
        open={showMove}
        onOpenChange={(open) => {
          if (!open) {
            setShowMove(false);
            setMoveTargets([]);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Move className="w-5 h-5 text-primary" />
              移动到...
            </DialogTitle>
            <DialogDescription>
              选择目标文件夹（共 {moveTargets.length} 项）
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[50vh] overflow-y-auto space-y-0.5">
            <button
              onClick={() => handleMoveConfirm(null)}
              className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 hover:bg-muted transition"
            >
              <Home className="w-4 h-4 text-muted-foreground" />
              <span>根目录</span>
            </button>
            <Separator className="my-1" />
            <FolderPickerTree
              nodes={moveFolderTree}
              depth={0}
              onSelect={(folderId) => handleMoveConfirm(folderId)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMove(false);
                setMoveTargets([]);
              }}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
