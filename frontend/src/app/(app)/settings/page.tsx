"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Settings,
  User,
  Shield,
  Clock,
  Camera,
  Mail,
  Lock,
  Save,
  Send,
  Monitor,
  Smartphone,
  Globe,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  Phone,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TABS = [
  { key: "profile", label: "个人信息", icon: User },
  { key: "security", label: "安全设置", icon: Shield },
  { key: "logs", label: "登录日志", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface LoginLog {
  loginTime: string;
  ip: string;
  userAgent: string;
}

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UserSettingsPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("max-w-4xl mx-auto p-4 lg:p-6 space-y-6", mounted ? "animate-fade-in" : "opacity-0")}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">个人设置</h1>
          <p className="text-sm text-muted-foreground">管理您的个人信息和安全设置</p>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Profile Tab ─────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: Record<string, any> | null }) {
  const [fullName, setFullName] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || "");
      setWorkPhone(user.workphone || user.work_phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUserProfile({ fullName, workphone: workPhone });
      toast.success("个人信息保存成功");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
      toast.success("头像已更新");
    };
    reader.readAsDataURL(file);
  };

  const avatarUrl =
    avatarPreview ||
    (user?.id
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/account/user-avatar?w=200`
      : null);

  const username = user?.name || user?.username || "未知用户";
  const dept = user?.department || user?.deptName || "未分配";
  const teams: string[] = user?.teams || [];
  const email = user?.email || "";

  return (
    <div className="space-y-6">
      {/* Avatar & Basic Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="w-28 h-28">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                  ) : null}
                  <AvatarFallback
                    className={cn(
                      "bg-gradient-to-br text-white font-bold text-3xl",
                      getAvatarColor(username)
                    )}
                  >
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.gif,.png"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">点击头像修改</p>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <UserCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">用户名</div>
                    <div className="text-sm font-medium">{username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">所属部门</div>
                    <div className="text-sm font-medium">{dept}</div>
                  </div>
                </div>
                {email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">邮箱</div>
                      <div className="text-sm font-medium">{email}</div>
                    </div>
                  </div>
                )}
              </div>

              {teams.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    加入的团队
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((t, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            编辑个人信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                姓名
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                工作电话
              </label>
              <Input
                value={workPhone}
                onChange={(e) => setWorkPhone(e.target.value)}
                placeholder="请输入工作电话"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              保存修改
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Security Tab ────────────────────────────────────────────────── */

function SecurityTab() {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPwdDialog, setShowPwdDialog] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="divide-y divide-border">
          {/* Change Email */}
          <div className="flex items-center justify-between py-5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">修改邮箱</p>
                <p className="text-xs text-muted-foreground mt-0.5">修改绑定的邮箱地址</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
              修改
            </Button>
          </div>

          {/* Change Password */}
          <div className="flex items-center justify-between py-5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">修改密码</p>
                <p className="text-xs text-muted-foreground mt-0.5">建议 90 天更改一次密码</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPwdDialog(true)}>
              修改
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <EmailDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} />

      {/* Password Dialog */}
      <PasswordDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} />
    </div>
  );
}

function EmailDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [vcode, setVcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) return toast.error("请输入新邮箱");
    try {
      await api.sendSignupEmailVcode(email);
      setCountdown(60);
      toast.success("验证码已发送");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    }
  };

  const handleSave = async () => {
    if (!email || !vcode) return toast.error("请填写完整");
    setLoading(true);
    try {
      await api.updateEmail(email, vcode);
      toast.success("邮箱修改成功");
      onOpenChange(false);
      setEmail("");
      setVcode("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setEmail(""); setVcode(""); } onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            修改邮箱
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">新邮箱地址</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入新邮箱"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">验证码</label>
            <div className="flex gap-3">
              <Input
                value={vcode}
                onChange={(e) => setVcode(e.target.value)}
                placeholder="请输入验证码"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="whitespace-nowrap"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} loading={loading}>
            确认修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!oldPwd || !newPwd) return toast.error("请填写完整");
    if (newPwd !== newPwd2) return toast.error("两次输入的新密码不一致");
    if (newPwd.length < 6) return toast.error("密码长度不能少于6位");
    setLoading(true);
    try {
      await api.updatePassword(oldPwd, newPwd);
      toast.success("密码修改成功");
      onOpenChange(false);
      setOldPwd("");
      setNewPwd("");
      setNewPwd2("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOldPwd(""); setNewPwd(""); setNewPwd2(""); } onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            修改密码
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">当前密码</label>
            <Input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">新密码</label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">确认新密码</label>
            <Input
              type="password"
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>
          {newPwd && newPwd2 && newPwd !== newPwd2 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              两次输入的密码不一致
            </p>
          )}
          {newPwd && newPwd.length < 6 && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              密码长度建议至少6位
            </p>
          )}
          {newPwd && newPwd2 && newPwd === newPwd2 && newPwd.length >= 6 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              密码匹配
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={!oldPwd || !newPwd || !newPwd2 || newPwd !== newPwd2}
          >
            确认修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Login Logs Tab ──────────────────────────────────────────────── */

function LogsTab() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLoginLogs();
      const items = data?.data || data?.logs || data || [];
      setLogs(Array.isArray(items) ? items : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getDeviceIcon = (ua: string) => {
    if (!ua) return Globe;
    if (ua.includes("Mobile") || ua.includes("Android")) return Smartphone;
    return Monitor;
  };

  const parseUA = (ua: string) => {
    if (!ua) return "未知设备";
    if (ua.includes("Mobile") || ua.includes("Android")) return "移动端";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return ua.substring(0, 40) + (ua.length > 40 ? "..." : "");
  };

  const getUACategory = (ua: string): string => {
    if (!ua) return "未知";
    if (ua.includes("Mobile") || ua.includes("Android")) return "移动端";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "其他";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            登录日志
          </span>
          {!loading && logs.length > 0 && (
            <Badge variant="secondary">{logs.length} 条记录</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-12 h-12" />}
            title="暂无登录日志"
            description="登录记录将显示在这里"
          />
        ) : (
          <div className="space-y-1">
            {logs.map((log, idx) => {
              const DeviceIcon = getDeviceIcon(log.userAgent || "");
              const category = getUACategory(log.userAgent || "");
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{parseUA(log.userAgent || "")}</span>
                      <Badge variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.loginTime || "-"}
                      </span>
                      <span className="font-mono">{log.ip || "-"}</span>
                    </div>
                  </div>
                  {idx === 0 && (
                    <Badge variant="success" className="text-xs">
                      最近
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
