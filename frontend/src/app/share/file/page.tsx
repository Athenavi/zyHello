"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface FileInfo {
  name: string;
  url?: string;
  size?: number;
  type?: string;
}

function SharedFileContent() {
  const searchParams = useSearchParams();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const shareId = searchParams.get("id") || "";

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      return;
    }
    api
      .request(`/filex/shared/${shareId}`)
      .then((data: Record<string, unknown>) => {
        setFileInfo(data as unknown as FileInfo);
      })
      .catch(() => {
        setFileInfo(null);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  const isImage = fileInfo?.type?.startsWith("image/");
  const isPdf = fileInfo?.type === "application/pdf";
  const isVideo = fileInfo?.type?.startsWith("video/");
  const isAudio = fileInfo?.type?.startsWith("audio/");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b h-14 flex items-center px-4">
        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h1 className="text-base font-semibold text-gray-800 truncate">
          {fileInfo?.name || "共享文件"}
        </h1>
        {fileInfo?.url && (
          <a
            href={fileInfo.url}
            download={fileInfo.name}
            className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            下载
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        ) : !fileInfo ? (
          <div className="text-center">
            <div className="text-5xl mb-4">😕</div>
            <p className="text-gray-500 text-lg">文件不存在或已过期</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            {isImage && fileInfo.url ? (
              <img src={fileInfo.url} alt={fileInfo.name} className="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-lg" />
            ) : isPdf && fileInfo.url ? (
              <iframe src={fileInfo.url} className="w-full h-[80vh] rounded-lg shadow-lg" />
            ) : isVideo && fileInfo.url ? (
              <video src={fileInfo.url} controls className="w-full max-h-[80vh] rounded-lg shadow-lg" />
            ) : isAudio && fileInfo.url ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-gray-700 mb-4">{fileInfo.name}</p>
                <audio src={fileInfo.url} controls className="mx-auto" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-700 text-lg font-medium mb-2">{fileInfo.name}</p>
                {fileInfo.size && (
                  <p className="text-gray-400 text-sm mb-6">
                    文件大小: {(fileInfo.size / 1024).toFixed(1)} KB
                  </p>
                )}
                {fileInfo.url && (
                  <a
                    href={fileInfo.url}
                    download={fileInfo.name}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    下载文件
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedFilePage() {
  return (
    <Suspense>
      <SharedFileContent />
    </Suspense>
  );
}
