"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";

interface CliEntry {
  command: string;
  output?: string;
  error?: string;
  timestamp: Date;
}

export default function AdminCliPage() {
  const [command, setCommand] = useState("");
  const [entries, setEntries] = useState<CliEntry[]>([]);
  const [executing, setExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = 0;
    }
  }, [entries]);

  const handleExecute = async () => {
    const cmd = command.trim();
    if (!cmd || executing) return;
    setCommand("");

    if (cmd === "clean" || cmd === "clear") {
      setEntries([]);
      return;
    }

    const entry: CliEntry = { command: cmd, timestamp: new Date() };
    setEntries((prev) => [entry, ...prev]);
    setExecuting(true);

    try {
      const data = await api.execCliCommand(cmd);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (d.data) {
          setEntries((prev) =>
            prev.map((e, i) => (i === 0 ? { ...e, output: String(d.data) } : e))
          );
        } else if (d.error_msg) {
          setEntries((prev) =>
            prev.map((e, i) => (i === 0 ? { ...e, error: String(d.error_msg) } : e))
          );
        } else {
          setEntries((prev) =>
            prev.map((e, i) => (i === 0 ? { ...e, output: JSON.stringify(data, null, 2) } : e))
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Command execution failed";
      setEntries((prev) =>
        prev.map((e, i) => (i === 0 ? { ...e, error: msg } : e))
      );
    }
    setExecuting(false);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: "#1a1a2e",
        fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        color: "#e0e0e0",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-bold text-white">ADMIN CLI</span>
          <span className="text-xs text-gray-500">输入 help 查看可用命令</span>
        </div>
        <a
          href="/admin/system-cfg"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          返回系统配置
        </a>
      </div>

      {/* Input */}
      <div className="px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">#</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExecute()}
            placeholder="enter command ... eg: help"
            disabled={executing}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600"
            style={{ caretColor: "#4ade80" }}
          />
          {executing && (
            <span className="text-yellow-400 text-xs animate-pulse">执行中...</span>
          )}
        </div>
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto px-6 py-4">
        {entries.length === 0 ? (
          <div className="text-gray-600 text-center mt-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>输入命令并按 Enter 执行</p>
            <p className="text-xs mt-2">输入 <span className="text-green-400">help</span> 查看可用命令，输入 <span className="text-green-400">clean</span> 清除输出</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div key={idx}>
                {/* Command */}
                <div className="flex items-start gap-2">
                  <span className="text-green-400 select-none">#</span>
                  <span className="text-white">{entry.command}</span>
                  {!entry.output && !entry.error && (
                    <span className="text-yellow-400 animate-pulse ml-2">█</span>
                  )}
                </div>
                {/* Output */}
                {entry.output && (
                  <div className="mt-1 pl-5 text-green-300 whitespace-pre-wrap break-all">
                    {entry.output}
                  </div>
                )}
                {entry.error && (
                  <div className="mt-1 pl-5 text-red-400 whitespace-pre-wrap break-all">
                    ERROR: {entry.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
