"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface FileItem {
  id: string;
  name: string;
  size?: number;
  type?: string;
  url?: string;
  modifiedTime?: string;
  isDirectory?: boolean;
}

function SharedFolderContent() {
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("共享文件夹");

  const shareId = searchParams.get("id") || "";

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      return;
    }
    api
      .request(`/filex/shared-folder/${shareId}`)
      .then((data: Record<string, unknown>) => {
        const folderData = data as { name?: string; files?: FileItem[] };
        setFolderName(folderData.name || "共享文件夹");
        setFiles(folderData.files || []);
      })
      .catch(() => {
        setFiles([]);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) return "📁";
    const ext = file.name?.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️";
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📽️";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
    if (["mp3", "wav", "ogg", "flac"].includes(ext)) return "🎵";
    if (["mp4", "avi", "mov", "mkv"].includes(ext)) return "🎬";
    if (["js", "ts", "py", "java", "go", "html", "css"].includes(ext)) return "💻";
    return "📄";
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h1 className="text-lg font-bold text-gray-800">{folderName}</h1>
          <span className="text-sm text-gray-400 ml-1">{files.length} 个文件</span>
        </div>
      </div>

      {/* File list */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-500 text-lg">文件夹为空</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-6">文件名</div>
              <div className="col-span-2 text-right">大小</div>
              <div className="col-span-3 text-right">修改时间</div>
              <div className="col-span-1"></div>
            </div>

            {/* File rows */}
            {files.map((file, idx) => (
              <div
                key={file.id || idx}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-blue-50 transition ${
                  idx < files.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="col-span-6 flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{getFileIcon(file)}</span>
                  <span className="text-sm text-gray-800 truncate">{file.name}</span>
                </div>
                <div className="col-span-2 text-right text-sm text-gray-500">
                  {file.isDirectory ? "-" : formatSize(file.size)}
                </div>
                <div className="col-span-3 text-right text-sm text-gray-400">
                  {formatDate(file.modifiedTime)}
                </div>
                <div className="col-span-1 text-right">
                  {!file.isDirectory && file.url && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="text-blue-600 hover:text-blue-800"
                      title="下载"
                    >
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedFolderPage() {
  return (
    <Suspense>
      <SharedFolderContent />
    </Suspense>
  );
}
