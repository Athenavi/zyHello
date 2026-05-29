"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface Department {
  id: string;
  name: string;
  children?: Department[];
}

interface Contact {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  workphone?: string;
  work_phone?: string;
  department?: string;
  deptName?: string;
}

export default function ContactsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "dept">("name");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.listDepartments();
      const depts = Array.isArray(data) ? data : data?.data || [];
      setDepartments(depts);
    } catch {
      setDepartments([]);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listUsers(1, 200);
      const users = data?.data || data?.users || data || [];
      setContacts(Array.isArray(users) ? users : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchContacts();
  }, [fetchDepartments, fetchContacts]);

  const filteredContacts = contacts.filter((c) => {
    const name = c.fullName || c.full_name || c.name || "";
    const email = c.email || "";
    const matchesSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
    const dept = c.department || c.deptName || "";
    const matchesDept = !selectedDept || dept === selectedDept;
    return matchesSearch && matchesDept;
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sort === "name") {
      return (a.fullName || a.full_name || a.name || "").localeCompare(
        b.fullName || b.full_name || b.name || ""
      );
    }
    return (a.department || a.deptName || "").localeCompare(
      b.department || b.deptName || ""
    );
  });

  // Alphabetical index groups
  const pinyin = (s: string) => {
    if (!s) return "#";
    const c = s.charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  };

  const grouped: Record<string, Contact[]> = {};
  sortedContacts.forEach((c) => {
    const name = c.fullName || c.full_name || c.name || "";
    const key = pinyin(name);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  const alphabet = Object.keys(grouped).sort();

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Department sidebar */}
      <div
        className={`bg-white border-r flex-shrink-0 transition-all duration-200 ${
          sidebarOpen ? "w-56" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700">部门</h3>
        </div>
        <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
          <button
            onClick={() => setSelectedDept(null)}
            className={`w-full text-left px-4 py-2 text-sm ${
              !selectedDept
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            全部
          </button>
          {departments.map((dept) => (
            <div key={dept.id}>
              <button
                onClick={() => setSelectedDept(dept.name)}
                className={`w-full text-left px-4 py-2 text-sm ${
                  selectedDept === dept.name
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {dept.name}
              </button>
              {dept.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedDept(child.name)}
                  className={`w-full text-left pl-8 pr-4 py-1.5 text-sm ${
                    selectedDept === child.name
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 md:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索联系人..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">排序:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "name" | "dept")}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="name">按姓名</option>
              <option value="dept">按部门</option>
            </select>
          </div>

          <span className="text-sm text-gray-500">
            {sortedContacts.length} 人
          </span>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>暂无联系人</p>
            </div>
          ) : (
            <div className="px-6 py-4">
              {alphabet.map((letter) => (
                <div key={letter} className="mb-4">
                  <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50 py-1 px-2 rounded">
                    {letter}
                  </div>
                  <div className="space-y-1">
                    {grouped[letter].map((c, idx) => {
                      const name = c.fullName || c.full_name || c.name || "-";
                      const dept = c.department || c.deptName || "";
                      return (
                        <div
                          key={c.id || idx}
                          className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white hover:shadow-sm transition cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {c.email || "未设置邮箱"}
                            </div>
                          </div>
                          {dept && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex-shrink-0">
                              {dept}
                            </span>
                          )}
                          {c.workphone || c.work_phone ? (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              📞 {c.workphone || c.work_phone}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
