"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users,
  Search,
  X,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpDown,
  UserCircle,
  Hash,
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
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  avatarUrl?: string;
}

const SORT_OPTIONS = [
  { key: "name", label: "按姓名" },
  { key: "dept", label: "按部门" },
] as const;

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getContactName(c: Contact): string {
  return c.fullName || c.full_name || c.name || "-";
}

function getContactDept(c: Contact): string {
  return c.department || c.deptName || "";
}

function getContactPhone(c: Contact): string {
  return c.workphone || c.work_phone || "";
}

export default function ContactsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "dept">("name");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.listDepartments();
      const depts = Array.isArray(data) ? data : data?.data || [];
      setDepartments(depts);
      // Auto expand all departments
      const names = new Set<string>();
      depts.forEach((d: Department) => {
        names.add(d.name);
        d.children?.forEach((c) => names.add(c.name));
      });
      setExpandedDepts(names);
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

  const filteredContacts = useMemo(() => {
    const filtered = contacts.filter((c) => {
      const name = getContactName(c);
      const email = c.email || "";
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase());
      const dept = getContactDept(c);
      const matchesDept = !selectedDept || dept === selectedDept;
      return matchesSearch && matchesDept;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") {
        return getContactName(a).localeCompare(getContactName(b));
      }
      return getContactDept(a).localeCompare(getContactDept(b));
    });
  }, [contacts, search, selectedDept, sort]);

  // Alphabetical index groups
  const pinyin = (s: string) => {
    if (!s) return "#";
    const c = s.charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  };

  const grouped = useMemo(() => {
    const g: Record<string, Contact[]> = {};
    filteredContacts.forEach((c) => {
      const name = getContactName(c);
      const key = pinyin(name);
      if (!g[key]) g[key] = [];
      g[key].push(c);
    });
    return g;
  }, [filteredContacts]);

  const alphabet = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const toggleDept = (name: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const getDeptCount = (deptName: string) => {
    return contacts.filter((c) => getContactDept(c) === deptName).length;
  };

  const hasActiveFilters = search || selectedDept;

  return (
    <div className={cn("flex flex-col h-full bg-background", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? "收起侧栏" : "展开侧栏"}</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">通讯录</h1>
            </div>
            <Badge variant="secondary">{filteredContacts.length} 人</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索联系人..."
                className="pl-9 h-8 text-sm w-64"
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

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedDept(null);
                }}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Department sidebar */}
        <aside
          className={cn(
            "border-r bg-card flex-shrink-0 transition-all duration-200 hidden md:flex flex-col",
            sidebarOpen ? "w-60" : "w-0 overflow-hidden"
          )}
        >
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              部门组织
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <button
                onClick={() => setSelectedDept(null)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition",
                  !selectedDept
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  全部联系人
                </span>
                <Badge variant="secondary" className="text-xs">
                  {contacts.length}
                </Badge>
              </button>

              <Separator className="my-2" />

              {departments.map((dept) => (
                <div key={dept.id} className="mb-0.5">
                  <button
                    onClick={() => {
                      setSelectedDept(dept.name);
                      toggleDept(dept.name);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition group",
                      selectedDept === dept.name
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {dept.children && dept.children.length > 0 ? (
                        expandedDepts.has(dept.name) ? (
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                        )
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span className="truncate">{dept.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                      {getDeptCount(dept.name)}
                    </span>
                  </button>
                  {dept.children && expandedDepts.has(dept.name) && (
                    <div className="ml-3">
                      {dept.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedDept(child.name)}
                          className={cn(
                            "w-full text-left pl-7 pr-3 py-1.5 text-sm rounded-lg flex items-center justify-between transition group",
                            selectedDept === child.name
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{child.name}</span>
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                            {getDeptCount(child.name)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Contact list */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 lg:p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title={hasActiveFilters ? "未找到匹配的联系人" : "暂无联系人"}
                description={hasActiveFilters ? "尝试更换搜索关键词或清除筛选条件" : "暂无联系人数据"}
                action={
                  hasActiveFilters
                    ? {
                        label: "清除筛选",
                        onClick: () => {
                          setSearch("");
                          setSelectedDept(null);
                        },
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="p-4 lg:p-6 space-y-6">
              {alphabet.map((letter) => (
                <div key={letter}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 mb-3 bg-background/80 backdrop-blur-sm py-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{letter}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {grouped[letter].length} 人
                    </span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {grouped[letter].map((c, idx) => {
                      const name = getContactName(c);
                      const dept = getContactDept(c);
                      const phone = getContactPhone(c);
                      const color = getAvatarColor(name);

                      return (
                        <Card
                          key={c.id || idx}
                          hover
                          className={cn(
                            "cursor-pointer transition-all",
                            mounted ? "animate-fade-up" : "opacity-0"
                          )}
                          style={{ animationDelay: `${Math.min(idx, 15) * 30}ms` }}
                          onClick={() => setSelectedContact(c)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "bg-gradient-to-br text-white font-bold text-sm",
                                  color
                                )}
                              >
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{name}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{c.email || "未设置邮箱"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {dept && (
                                <Badge variant="secondary" className="text-xs">
                                  {dept}
                                </Badge>
                              )}
                              {phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {phone}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact detail dialog */}
      <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              联系人详情
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="py-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarFallback
                    className={cn(
                      "bg-gradient-to-br text-white font-bold text-xl",
                      getAvatarColor(getContactName(selectedContact))
                    )}
                  >
                    {getContactName(selectedContact).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{getContactName(selectedContact)}</h3>
                  {getContactDept(selectedContact) && (
                    <Badge variant="secondary" className="mt-1">
                      {getContactDept(selectedContact)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {selectedContact.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">邮箱</div>
                      <div className="text-sm font-medium">{selectedContact.email}</div>
                    </div>
                  </div>
                )}
                {getContactPhone(selectedContact) && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">办公电话</div>
                      <div className="text-sm font-medium">{getContactPhone(selectedContact)}</div>
                    </div>
                  </div>
                )}
                {getContactDept(selectedContact) && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">部门</div>
                      <div className="text-sm font-medium">{getContactDept(selectedContact)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedContact(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
