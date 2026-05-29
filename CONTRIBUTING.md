# 贡献指南

感谢你对 Rebuild 项目的关注！我们欢迎所有形式的贡献。

## 🚀 如何贡献

### 报告 Bug

1. 在 [Issues](https://github.com/getrebuild/rebuild/issues) 中搜索是否已有相同问题
2. 如果没有，创建一个新的 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 期望行为 vs 实际行为
   - 环境信息（OS、浏览器、Node/Python 版本）

### 提交功能建议

1. 在 Issues 中创建带有 `enhancement` 标签的 Issue
2. 详细描述你的建议和使用场景
3. 等待社区讨论和维护者反馈

### 提交代码

1. **Fork** 本项目
2. **克隆** 你的 Fork：
   ```bash
   git clone https://github.com/your-username/rebuild.git
   cd rebuild
   ```
3. **创建分支**：
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **开发** 并遵循下方的代码规范
5. **测试** 你的更改
6. **提交**：
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **推送**：
   ```bash
   git push origin feature/your-feature-name
   ```
8. **创建 Pull Request**

## 📝 Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型 (type)

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不是新功能也不是修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链变更 |

### 示例

```
feat(dashboard): add real-time chart updates
fix(auth): resolve token refresh race condition
docs(readme): update deployment instructions
perf(api): optimize query with proper indexing
```

## 💻 代码规范

### TypeScript

- 使用严格模式 (`strict: true`)
- 为所有函数参数和返回值添加类型
- 优先使用 `interface` 而非 `type`（除非需要联合类型或交叉类型）
- 避免使用 `any`，使用 `unknown` 或具体类型

### React

- 使用函数组件和 Hooks
- 使用 `"use client"` 指令标记客户端组件
- 使用 `useCallback` / `useMemo` 优化性能
- 组件使用 PascalCase 命名
- 文件名与组件名保持一致

### CSS / Tailwind

- 优先使用 Tailwind 原子类
- 使用 `cn()` 工具函数合并类名
- 设计令牌使用 CSS 变量（HSL 格式）
- 响应式设计：`sm:` → `md:` → `lg:` → `xl:`

### 文件组织

```
src/
├── components/
│   ├── ui/           # 通用 UI 组件
│   └── layout/       # 布局组件
├── lib/
│   ├── api.ts        # API 客户端
│   ├── auth.tsx      # 认证
│   ├── store.ts      # 全局状态
│   └── utils.ts      # 工具函数
└── app/
    ├── (app)/        # 主应用
    └── admin/        # 管理后台
```

## 🧪 测试

```bash
# 运行前端 lint 检查
cd frontend && npm run lint

# 运行后端测试
cd app && python -m pytest
```

## 📋 Pull Request 检查清单

- [ ] 代码遵循项目规范
- [ ] 没有 TypeScript 错误
- [ ] ESLint 检查通过
- [ ] 新功能包含文档
- [ ] Commit 消息遵循 Conventional Commits
- [ ] PR 描述清晰说明了变更内容

## 📜 行为准则

- 尊重所有参与者
- 接受建设性批评
- 专注于对社区最有利的事情
- 对他人表示同理心

## ❓ 有问题？

如果你有任何问题，欢迎在 [Discussions](https://github.com/getrebuild/rebuild/discussions) 中提问。

---

再次感谢你的贡献！🎉
