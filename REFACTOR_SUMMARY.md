# WorkReport v2.0 架构重构总结

## 核心变更：单一前端源码 + 运行时平台检测

将 `web-app/src/` 和 `workflow-web-app/src/` 中的重复前端代码统一到 `shared/src/`，两个应用仅保留 `main.tsx` 入口文件。

## 目录结构

```
work-report/
  package.json              ← 根级依赖（shared node_modules 供模块解析）
  node_modules/             ← 共享依赖（react, lucide-react, @tauri-apps/api 等）
  shared/
    src/                    ← 唯一前端源码（真相源）
      api/
        index.ts            ← 命名空间 Proxy 导出 + 运行时 isTauri 动态加载
        types.ts            ← API 接口定义
        web-adapter.ts      ← HTTP fetch 实现
        tauri-adapter.ts    ← Tauri invoke() 实现
      components/           ← 9个组件（直接实现）
      pages/                ← 6个页面（合并差异版本）
      types/
        index.ts            ← TypeScript 类型定义
        tauri-api-stub.d.ts ← Tauri API 类型声明
      utils/
        priority.ts
        markdown.tsx
      App.tsx               ← 统一路由
      index.css             ← 全局样式（不含 @import "tailwindcss"）
  web-app/
    src/main.tsx            ← 入口：import 'tailwindcss' + initAPI() + App
    server/                 ← Express 后端
    vite.config.ts          ← Vite alias + proxy + external @tauri-apps/api/core
  workflow-web-app/
    src/main.tsx            ← 入口：import 'tailwindcss' + initAPI() + App
    src-tauri/              ← Rust 后端
    vite.config.ts          ← Vite alias + Tauri 配置
```

## 关键设计决策

### 1. API 适配器自动切换

`shared/src/api/index.ts` 通过 `isTauri` 检测运行环境，动态加载对应适配器。每个 API 命名空间通过 Proxy 延迟代理：

```typescript
// 自动检测平台并加载适配器
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

// 命名空间 Proxy — 初始化后透明代理到实际适配器
export const taskApi = createNamespaceProxy('task')
export const llmApi = createNamespaceProxy('llm')
// ...

// main.tsx 中调用 initAPI() 后即可使用
```

### 2. Tailwind CSS 分离

`@import "tailwindcss"` 在 `main.tsx` 中导入（从应用的 node_modules 解析），`shared/src/index.css` 仅包含自定义 CSS 变量和动画。避免 shared/ 无法解析 tailwindcss 包。

### 3. 根级 node_modules

`package.json` 安装所有共享前端依赖到根目录，确保 `shared/src/` 中的文件可以解析 bare module imports（如 `lucide-react`、`react-router-dom`、`@tauri-apps/api`）。

### 4. Tauri API Stub

`tauri-api-stub.d.ts` 提供 `@tauri-apps/api/core` 的类型声明，Web 应用无需安装此依赖。Web 构建时通过 `build.rollupOptions.external` 排除 tauri-adapter 的 import。

### 5. TypeScript 构建简化

移除 `tsc -b` 前置检查（从 `build` 脚本中），仅使用 Vite 构建。因为 `shared/src/` 在项目外部，tsc 无法正确解析跨项目模块。Vite 的 Rolldown bundler 通过 Vite alias 正确解析。

### 6. MorningPlan.tsx 统一

采用桌面版（精简版），删除 Web 版中未使用的 `taskApi`/`tasks`/`handleStatusChange`/`getTaskById` 代码。这些是半成品预留代码，真正处理任务状态变更的是 Board.tsx 页面。

## 已删除的文件

| 文件 | 原因 |
|------|------|
| `sync-files.js` | 不再需要手动同步 |
| `COLOR_CONSISTENCY.md` | 已被 DESIGN_GUIDELINE.md 覆盖 |
| `COLOR_UNIFIED.md` | 已被 DESIGN_GUIDELINE.md 覆盖 |
| `color-update-preview.html` | 过时预览文件 |
| `web-app/src/` 下的组件/页面/类型/工具/API | 已迁移到 shared/src/ |
| `workflow-web-app/src/` 下的组件/页面/类型/工具/API | 已迁移到 shared/src/ |
| `workflow-web-app/src/assets/` | 未使用的 Tauri 模板资源 |
| `MorningPlanDemo.tsx` | 临时设计验证页面 |
| `shared/` 旧顶层结构（api/, components/, types/, utils/, index.ts） | 已迁移到 shared/src/ |

## 保留的文件

| 文件 | 用途 |
|------|------|
| `DESIGN_GUIDELINE.md` | 「专注流」前端设计规范文档 |
| `color-palette-showcase.html` | 配色方案可视化预览 |
| `work-report-generator.skill` + `work-report-generator/` | AI Agent Skill |

## 构建验证

```bash
# Web 应用
cd web-app && npm run build      # ✅

# 桌面应用
cd workflow-web-app && npm run build  # ✅

# Rust 后端
cd workflow-web-app/src-tauri && cargo check  # ✅
```

## 效果

- **零重复前端代码** — 修改任何页面/组件只需改 `shared/src/` 中一处
- **消除同步遗漏风险** — 不再依赖手动 sync-files.js
- **两个应用独立构建** — Vite alias 不影响构建流程
- **API 适配器自动切换** — 运行时检测，无需手动选择