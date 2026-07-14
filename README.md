<h1 align="center">zyHello</h1>

<p align="center">
  <strong>企业级 CRM / 低代码平台</strong>
  <br />
  <em>元数据驱动 · 工作流自动化 · AI 赋能 · 开箱即用</em>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> · <a href="#-功能特性">功能特性</a> · <a href="#-技术栈">技术栈</a> · <a href="#-截图">截图</a> · <a href="#-部署">部署</a> · <a href="#-贡献">贡献</a>
</p>

---

## ✨ 功能特性

### 🏢 核心业务功能

| 功能模块 | 描述 |
|---------|------|
| **📊 仪表盘** | 数据可视化仪表盘，统计卡片、图表、活动流、快速操作 |
| **📋 实体管理** | 元数据驱动的实体管理，支持自定义字段、表单布局、审批流程 |
| **📁 记录管理** | 完整的 CRUD 操作，批量操作、导入导出、关联记录、历史追踪 |
| **📈 项目管理** | 看板视图 + 列表视图，任务管理、进度追踪、标签系统 |
| **💬 动态/Feed** | 企业内部社交动态，支持图片、评论、点赞、@提及 |
| **📂 文件管理** | 文件上传/下载、文件夹管理、多视图切换、批量操作 |
| **👥 联系人** | 部门树形结构、字母索引、高级搜索、排序筛选 |
| **🔔 通知中心** | 消息通知、待办事项、审批流程，统一管理 |
| **⚙️ 用户设置** | 个人资料、安全设置（密码/邮箱）、登录日志 |

### 🔧 管理后台

| 功能模块 | 描述 |
|---------|------|
| **📐 元数据管理** | 实体配置、字段管理、分类编辑器、表单布局设计器 |
| **👤 用户管理** | 用户列表、部门管理、团队管理、角色分配 |
| **🤖 机器人/自动化** | 触发器配置、数据转换、自动化工作流 |
| **🔗 系统集成** | API 密钥管理、外部集成（钉钉/飞书/企微）、系统配置、存储配置 |
| **📊 数据管理** | 报表模板、数据导入管理 |
| **🛡️ 角色权限** | 角色创建、实体权限（CRUD+A）、功能权限、菜单权限 |

### 🎨 界面设计

- **现代设计系统** — HSL 色彩变量、玻璃拟态效果、渐变装饰
- **深色模式** — 完整的深色主题支持，自动跟随系统偏好
- **响应式布局** — 完美适配桌面端和移动端
- **流畅动画** — 页面过渡、元素入场、骨架屏加载状态
- **命令面板** — ⌘K 快速导航，提升操作效率

### ⚡ 性能优化

- **Next.js 16** — 最新框架，PPR（部分预渲染）、App Router
- **自动代码分割** — 按路由和库自动分割，优化加载速度
- **图片优化** — AVIF/WebP 自动转换、响应式图片、懒加载
- **字体优化** — next/font 自托管，消除 CLS（布局偏移）
- **API 代理** — 开发环境自动代理，生产环境 API 重写
- **Docker 部署** — 多阶段构建，standalone 输出，最小化镜像

---

## 🛠 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| [Next.js](https://nextjs.org/) | 16.2.6 | React 全栈框架 |
| [React](https://react.dev/) | 19.2.4 | UI 库 |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | 原子化 CSS |
| [Radix UI](https://www.radix-ui.com/) | Latest | 无样式组件原语 |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.x | 轻量状态管理 |
| [Lucide Icons](https://lucide.dev/) | Latest | 图标库 |
| [ECharts](https://echarts.apache.org/) | 6.x | 数据可视化 |
| [Sonner](https://sonner.emilkowal.dev/) | 2.x | Toast 通知 |

### 后端

| 技术 | 用途 |
|------|------|
| [FastAPI](https://fastapi.tiangolo.com/) | 高性能 Python Web 框架 |
| [SQLAlchemy](https://www.sqlalchemy.org/) | ORM 数据库操作 |
| [Uvicorn](https://www.uvicorn.org/) | ASGI 服务器 |
| [SQLite/MySQL/PostgreSQL](https://www.sqlite.org/) | 数据库支持 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0
- **Python** >= 3.8
- **npm** / **yarn** / **pnpm**

### 1. 克隆项目

```bash
git clone https://github.com/getrebuild/rebuild.git
cd rebuild
```

### 2. 启动后端

```bash
pip install -r requirements.txt
python app/main.py
# 后端运行在 http://localhost:18080
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

### 4. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

> 首次访问会进入安装向导，按提示完成初始化配置即可。

---

## 📦 部署

### Docker 部署（推荐）

```bash
cd frontend

# 构建镜像
docker build -t rebuild-frontend .

# 运行容器
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://your-backend:18080 \
  rebuild-frontend
```

### 手动部署

```bash
cd frontend

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 | `http://localhost:18080` |
| `NEXT_PUBLIC_APP_URL` | 前端应用地址 | `http://localhost:3000` |

---

## 📁 项目结构

```
rebuild/
├── app/                          # FastAPI 后端
│   ├── api/                      # API 层
│   ├── core/                     # 核心功能（缓存、图表、批量操作）
│   ├── router/                   # 路由处理器
│   ├── templates/                # Jinja2 模板（旧版 UI）
│   ├── utils/                    # 工具函数
│   └── main.py                   # 应用入口
│
├── frontend/                     # Next.js 前端
│   ├── src/
│   │   ├── app/                  # App Router 页面
│   │   │   ├── (app)/            # 主应用路由组
│   │   │   │   ├── dashboard/    # 仪表盘
│   │   │   │   ├── entities/     # 实体管理
│   │   │   │   ├── projects/     # 项目管理
│   │   │   │   ├── feeds/        # 动态
│   │   │   │   ├── files/        # 文件管理
│   │   │   │   ├── contacts/     # 联系人
│   │   │   │   ├── notifications/# 通知中心
│   │   │   │   └── settings/     # 用户设置
│   │   │   ├── admin/            # 管理后台
│   │   │   │   ├── (admin)/      # 管理路由组
│   │   │   │   │   ├── metadata/ # 元数据管理
│   │   │   │   │   ├── users/    # 用户管理
│   │   │   │   │   ├── robots/   # 机器人/自动化
│   │   │   │   │   ├── integration/ # 系统集成
│   │   │   │   │   ├── data/     # 数据管理
│   │   │   │   │   └── role-privileges/ # 角色权限
│   │   │   │   ├── verify/       # 管理员认证
│   │   │   │   └── setup/        # 系统安装
│   │   │   ├── login/            # 登录页
│   │   │   └── ...               # 其他页面
│   │   ├── components/
│   │   │   ├── ui/               # 可复用 UI 组件库
│   │   │   └── layout/           # 布局组件
│   │   ├── lib/
│   │   │   ├── api.ts            # API 客户端
│   │   │   ├── auth.tsx          # 认证上下文
│   │   │   ├── store.ts          # Zustand 状态管理
│   │   │   └── utils.ts          # 工具函数
│   │   └── middleware.ts         # 路由中间件
│   ├── public/                   # 静态资源
│   ├── next.config.ts            # Next.js 配置
│   ├── Dockerfile                # Docker 构建文件
│   └── package.json              # 依赖配置
│
└── README.md                     # 本文件
```

---

## 🎯 UI 组件库

项目内置了一套基于 Radix UI + Tailwind CSS 的可复用组件库：

| 组件 | 文件 | 说明 |
|------|------|------|
| Button | `components/ui/button.tsx` | 按钮，支持多种变体和尺寸 |
| Input | `components/ui/input.tsx` | 输入框 |
| Card | `components/ui/card.tsx` | 卡片容器 |
| Dialog | `components/ui/dialog.tsx` | 模态对话框 |
| Badge | `components/ui/badge.tsx` | 标签徽章 |
| Tabs | `components/ui/tabs.tsx` | 标签页 |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | 下拉菜单 |
| Tooltip | `components/ui/tooltip.tsx` | 工具提示 |
| Avatar | `components/ui/avatar.tsx` | 头像 |
| Skeleton | `components/ui/skeleton.tsx` | 骨架屏加载 |
| Checkbox | `components/ui/checkbox.tsx` | 复选框 |
| ScrollArea | `components/ui/scroll-area.tsx` | 自定义滚动区域 |
| Progress | `components/ui/progress.tsx` | 进度条 |
| Separator | `components/ui/separator.tsx` | 分隔线 |
| EmptyState | `components/ui/empty-state.tsx` | 空状态占位 |
| DataTable | `components/ui/data-table.tsx` | 数据表格 |

---

## 🔐 认证与权限

- **JWT Token 认证** — 基于 Token 的无状态认证
- **路由中间件** — 自动保护需要登录的页面
- **管理员认证** — 独立的管理员验证流程
- **RBAC 权限模型** — 角色 → 实体/功能/菜单 三级权限控制

---

## 🌍 浏览器支持

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Edge |
|:---:|:---:|:---:|:---:|
| ✅ Last 2 versions | ✅ Last 2 versions | ✅ Last 2 versions | ✅ Last 2 versions |

---

## 🤝 贡献

我们欢迎所有形式的贡献！

1. Fork 本项目
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

### 开发规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用 PascalCase 命名
- 工具函数使用 camelCase 命名
- CSS 使用 Tailwind 原子类

---

## 📄 许可证

本项目基于 [GPL-3.0](LICENSE) 许可证开源。

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) — The React Framework
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python Web Framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-First CSS Framework
- [Radix UI](https://www.radix-ui.com/) — Unstyled UI Components
- [Lucide](https://lucide.dev/) — Beautiful Icons
- [shadcn/ui](https://ui.shadcn.com/) — UI Component Inspiration

---

<p align="center">
  <strong>如果 zyHello 对你有帮助，请给我们一个 ⭐ Star！</strong>
  <br />
  <sub>你的支持是我们持续改进的动力</sub>
</p>
