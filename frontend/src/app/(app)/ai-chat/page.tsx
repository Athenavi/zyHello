"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatItem {
  chatid: string;
  subject: string;
  createdOn: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ChatItem[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const getToken = () => localStorage.getItem("access_token");

  const apiPost = async (path: string, body: Record<string, unknown>) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const apiGet = async (path: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.json();
  };

  // Load conversation list on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: list } = await apiGet("/aibot/post/chat-list");
        if (Array.isArray(list) && list.length > 0) {
          setConversations(list);
          setActiveConv(list[0].chatid);
        }
      } catch {
        // ignore
      }
      setInitialized(true);
    })();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "你好！我是 AI 助手，有什么可以帮助你的吗？\n\n在右侧创建新对话开始聊天吧。",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    (async () => {
      try {
        const { data } = await apiGet(`/aibot/post/chat-init?chatid=${activeConv}`);
        if (data?.messages) {
          setMessages(
            data.messages.map((m: { role: string; content: string }, i: number) => ({
              id: `msg-${i}`,
              role: m.role === "ai" ? "assistant" : "user",
              content: m.content,
              timestamp: new Date(),
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, [activeConv]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // If no active conversation, create one first
      let chatId = activeConv;

      const { data } = await apiPost("/aibot/post/chat", {
        chatid: chatId || "",
        content: text,
      });

      if (data?.chatid && data.chatid !== chatId) {
        chatId = data.chatid;
        setActiveConv(data.chatid);
        // Refresh conversation list
        const { data: list } = await apiGet("/aibot/post/chat-list");
        if (Array.isArray(list)) setConversations(list);
      }

      if (data?.content) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "请求失败，请检查网络连接或稍后重试。",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setActiveConv(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "你好！我是 AI 助手，有什么可以帮助你的吗？",
        timestamp: new Date(),
      },
    ]);
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Conversation list sidebar */}
      <div
        className={`bg-gray-900 text-white flex-shrink-0 transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2.5 border border-gray-600 rounded-lg text-sm hover:bg-gray-800 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新对话
          </button>
        </div>
        <div className="overflow-y-auto px-2">
          {conversations.map((conv) => (
            <button
              key={conv.chatid}
              onClick={() => setActiveConv(conv.chatid)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm mb-1 transition ${
                activeConv === conv.chatid
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <div className="truncate">{conv.subject}</div>
              <div className="text-xs text-gray-500 mt-0.5">{conv.createdOn}</div>
            </button>
          ))}
          {!initialized && (
            <div className="px-4 py-2 text-sm text-gray-500">加载中...</div>
          )}
          {initialized && conversations.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">暂无对话记录</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">AI 助手</h2>
              <p className="text-xs text-green-500">在线</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">🤖</span>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === "user" ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-xs">👤</span>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">🤖</span>
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t px-6 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm resize-none"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI 助手可能会产生不准确的信息，请注意甄别
          </p>
        </div>
      </div>
    </div>
  );
}
