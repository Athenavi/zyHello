# Rebuild Frontend

> Rebuild CRM / 低代码平台的 Next.js 前端应用

## 技术栈

- **Next.js 16** — App Router, PPR, Server Components
- **React 19** — 最新 React 特性
- **TypeScript** — 严格类型安全
- **Tailwind CSS v4** — 原子化 CSS + 设计系统
- **Radix UI** — 无样式组件原语
- **Zustand** — 轻量级状态管理
- **Lucide React** — 图标库
- **ECharts** — 数据可视化
- **Sonner** — Toast 通知

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:18080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 项目结构

```
src/
├── app/                    # App Router 页面
│   ├── (app)/              # 主应用路由组
│   ├── admin/              # 管理后台
│   ├── login/              # 登录页
│   ├── loading.tsx         # 全局加载状态
│   ├── error.tsx           # 全局错误边界
│   ├── not-found.tsx       # 404 页面
│   └── layout.tsx          # 根布局
├── components/
│   ├── ui/                 # 可复用 UI 组件库 (16 个)
│   └── layout/             # 布局组件 (Sidebar, Header, CommandPalette)
├── lib/
│   ├── api.ts              # API 客户端
│   ├── auth.tsx            # 认证上下文
│   ├── store.ts            # Zustand 状态
│   └── utils.ts            # 工具函数
└── middleware.ts            # 路由中间件
```

## 性能优化

- ✅ next/font 自托管字体（消除 CLS）
- ✅ optimizePackageImports 自动优化包导入
- ✅ 代码分割（Radix UI / ECharts / Mermaid 独立 chunk）
- ✅ AVIF/WebP 图片自动转换
- ✅ 生产环境 console.log 自动移除
- ✅ standalone Docker 输出
- ✅ 静态资源永久缓存（1年）
- ✅ 安全头（XSS / Clickjacking / MIME sniffing）

## Docker 部署

```bash
docker build -t rebuild-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:18080 rebuild-frontend
```

## UI 组件

项目内置 16 个可复用 UI 组件，基于 Radix UI + Tailwind CSS 构建：

Button, Input, Card, Dialog, Badge, Tabs, DropdownMenu, Tooltip, Avatar, Skeleton, Checkbox, ScrollArea, Progress, Separator, EmptyState, DataTable

## License

GPL-3.0
