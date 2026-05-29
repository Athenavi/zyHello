"use client";

import { useState, useCallback, useRef } from "react";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  uploadTime?: string;
  uploadUser?: string;
}

export default function FilesPage() {
  const [files] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>(["根目录"]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "time" | "size">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return (a.size || 0) - (b.size || 0);
      return (a.uploadTime || "").localeCompare(b.uploadTime || "");
    });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") return "📁";
    const ext = file.name.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗",
      ppt: "📙", pptx: "📙", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
      gif: "🖼️", zip: "📦", rar: "📦", "7z": "📦", mp4: "🎬",
      mp3: "🎵", txt: "📄", csv: "📊", json: "📋", xml: "📋",
    };
    return iconMap[ext || ""] || "📄";
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setNewFolderName("");
    setShowNewFolder(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Folder tree sidebar */}
      <div className="w-56 bg-white border-r flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700">文件目录</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setCurrentPath(["根目录"])}
            className="w-full text-left px-3 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 font-medium"
          >
            📂 根目录
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Toolbar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
              {currentPath.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300">/</span>}
                  <button
                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                    className="hover:text-blue-600 transition"
                  >
                    {p}
                  </button>
                </span>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative max-w-xs">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索文件..."
                className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "name" | "time" | "size")}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="name">按名称</option>
                <option value="time">按时间</option>
                <option value="size">按大小</option>
              </select>

              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => setShowNewFolder(true)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-1"
              >
                <span>📁</span> 新建文件夹
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" />
            </div>
          </div>

          {/* Batch actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mt-2 py-2 px-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-blue-700">已选择 {selected.size} 项</span>
              <button className="text-blue-600 hover:text-blue-800">下载</button>
              <button className="text-red-600 hover:text-red-800">删除</button>
              <button className="text-gray-600 hover:text-gray-800">移动</button>
              <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:text-gray-700 ml-auto">
                取消选择
              </button>
            </div>
          )}
        </div>

        {/* File grid/list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-lg mb-1">暂无文件</p>
              <p className="text-sm">点击上传按钮添加文件</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => toggleSelect(file.id)}
                  className={`bg-white rounded-xl p-4 border cursor-pointer transition hover:shadow-md ${
                    selected.has(file.id) ? "ring-2 ring-blue-500 border-blue-200" : "hover:border-gray-300"
                  }`}
                >
                  <div className="text-4xl text-center mb-2">{getFileIcon(file)}</div>
                  <div className="text-sm font-medium text-gray-800 truncate text-center">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {file.type === "folder" ? "-" : formatSize(file.size)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-8">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected(new Set(filteredFiles.map((f) => f.id)));
                          } else {
                            setSelected(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">名称</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-24">大小</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-40">上传时间</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-32">上传者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => toggleSelect(file.id)}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selected.has(file.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <span>{getFileIcon(file)}</span>
                        <span className="text-gray-800">{file.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{formatSize(file.size)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{file.uploadTime || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{file.uploadUser || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New folder modal */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新建文件夹</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="请输入文件夹名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
