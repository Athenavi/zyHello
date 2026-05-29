"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// MDI7 and ZMDI common icons (subset)
const ICON_GROUPS = [
  {
    label: "常用图标",
    icons: [
      "mdi-home", "mdi-account", "mdi-settings", "mdi-magnify", "mdi-plus",
      "mdi-delete", "mdi-pencil", "mdi-check", "mdi-close", "mdi-menu",
      "mdi-chevron-down", "mdi-chevron-right", "mdi-arrow-left", "mdi-arrow-right",
      "mdi-star", "mdi-heart", "mdi-bell", "mdi-email", "mdi-phone",
      "mdi-calendar", "mdi-clock", "mdi-file", "mdi-folder", "mdi-download",
      "mdi-upload", "mdi-share", "mdi-link", "mdi-lock", "mdi-lock-open",
      "mdi-eye", "mdi-eye-off", "mdi-refresh", "mdi-sync", "mdi-filter",
      "mdi-sort", "mdi-chart-bar", "mdi-chart-line", "mdi-chart-pie", "mdi-table",
      "mdi-grid", "mdi-view-list", "mdi-view-dashboard", "mdi-widgets", "mdi-apps",
      "mdi-information", "mdi-alert", "mdi-alert-circle", "mdi-check-circle", "mdi-close-circle",
      "mdi-help-circle", "mdi-lightning-bolt", "mdi-cog", "mdi-wrench", "mdi-hammer",
      "mdi-clipboard", "mdi-content-copy", "mdi-content-paste", "mdi-undo", "mdi-redo",
      "mdi-tag", "mdi-bookmark", "mdi-map-marker", "mdi-globe", "mdi-web",
      "mdi-cloud", "mdi-cloud-upload", "mdi-cloud-download", "mdi-database", "mdi-server",
      "mdi-cart", "mdi-cash", "mdi-credit-card", "mdi-shopping", "mdi-store",
      "mdi-briefcase", "mdi-office-building", "mdi-factory", "mdi-warehouse", "mdi-domain",
      "mdi-send", "mdi-message", "mdi-chat", "mdi-forum", "mdi-comment",
      "mdi-image", "mdi-camera", "mdi-video", "mdi-music", "mdi-microphone",
      "mdi-attachment", "mdi-paperclip", "mdi-printer", "mdi-scanner", "mdi-monitor",
      "mdi-cellphone", "mdi-laptop", "mdi-tablet", "mdi-television", "mdi-remote",
      "mdi-car", "mdi-truck", "mdi-bus", "mdi-train", "mdi-airplane",
      "mdi-ship", "mdi-bike", "mdi-walk", "mdi-run", "mdi-ship-wheel",
    ],
  },
];

export default function SearchIconPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for message from parent window (dialog mode)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "icon-selected") {
        setSelected(e.data.icon);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const filteredGroups = ICON_GROUPS.map((group) => ({
    ...group,
    icons: group.icons.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.icons.length > 0);

  const handleSelect = (icon: string) => {
    setSelected(icon);
    // Send to parent if in dialog
    if (window.opener || window.parent !== window) {
      window.parent.postMessage({ type: "icon-selected", icon }, "*");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <h2 className="text-lg font-bold text-gray-800 mb-3">选择图标</h2>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索图标名称..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selected */}
        {selected && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-600">已选择:</span>
            <span className="font-mono text-sm text-blue-700">{selected}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(selected);
              }}
              className="ml-auto text-xs text-blue-600 hover:text-blue-800"
            >
              复制
            </button>
          </div>
        )}
      </div>

      {/* Icon grid */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>未找到匹配的图标</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">{group.label}</h3>
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2">
                {group.icons.map((icon) => {
                  const isSelected = selected === icon;
                  return (
                    <button
                      key={icon}
                      onClick={() => handleSelect(icon)}
                      className={`flex flex-col items-center p-2 rounded-lg transition text-center ${
                        isSelected
                          ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                          : "hover:bg-gray-100 text-gray-600"
                      }`}
                      title={icon}
                    >
                      <span className={`mdi ${icon} text-xl`} />
                      <span className="text-[10px] mt-1 truncate w-full">
                        {icon.replace("mdi-", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-4 py-3 flex justify-end gap-2">
        <button
          onClick={() => window.close()}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          取消
        </button>
        <button
          onClick={() => {
            if (selected) {
              window.parent.postMessage({ type: "icon-selected", icon: selected }, "*");
              window.close();
            }
          }}
          disabled={!selected}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          确定
        </button>
      </div>
    </div>
  );
}
