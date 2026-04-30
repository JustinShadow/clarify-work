# WorkReport 项目简化方案总结

## 完成的工作

### 核心简化：单一前端源码 + 运行时平台检测

将 `app/src/` 和 `workflow-app/src/` 中的重复前端代码统一到 `shared/src/`，两个应用仅保留 `main.tsx` 入口文件。

### 新目录结构

```
work-report/
  package.json              ← 根级依赖（shared node_modules 供模块解析）
  node_modules/             ← 共享依赖（react, lucide-react, @tauri-apps/api 等）
  shared/
    src/                    ← 唯一前端源码（真相源）
      api/
        index.ts            ← 运行时自动检测平台，懒加载适配器
        types.ts            ← API 接口定义
        web-adapter.ts      ← HTTP fetch 实现
        tauri-adapter.ts    ← Tauri invoke() 实现
      components/           ← 9个组件（直接实现，不再 re-export）
      pages/                ← 6个页面（合并差异版本）
      types/
        index.ts            ← TypeScript 类型定义
        tauri-api-stub.d.ts ← Tauri API 类型声明（Web 构建不需要安装 @tauri-apps/api）
      utils/
        priority.ts
        markdown.tsx
      App.tsx               ← 统一路由
      index.css             ← 全局样式（不含 @import "tailwindcss"）
  app/
    src/
      main.tsx              ← 入口：import 'tailwindcss' + initAPI() + App
    server/                 ← Express 后端（保持不变）
    vite.config.ts          ← Vite alias + proxy + external @tauri-apps/api/core
    package.json
  workflow-app/
    src/
      main.tsx              ← 入口：import 'tailwindcss' + initAPI() + App
      assets/               ← Tauri 模板资源
    src-tauri/              ← Rust 后端（保持不变）
    vite.config.ts          ← Vite alias + Tauri 配置
    package.json
```

### 关键设计决策

1. **API 适配器自动切换**：`shared/src/api/index.ts` 通过 `isTauri` 检测运行环境，动态加载对应适配器。每个 API 命名空间（`taskApi`、`llmApi` 等）通过 Proxy 延迟代理到实际实例。

2. **Tailwind CSS 分离**：`@import "tailwindcss"` 在 `main.tsx` 中导入（从应用的 node_modules 解析），`shared/src/index.css` 仅包含自定义 CSS。

3. **根级 node_modules**：`package.json` 安装所有共享前端依赖到根目录，确保 `shared/src/` 中的文件可以解析 bare module imports（如 `lucide-react`、`react-router-dom`）。

4. **Tauri API Stub**：`tauri-api-stub.d.ts` 提供 `@tauri-apps/api/core` 的类型声明，Web 应用无需安装此依赖。Web 构建时通过 `build.rollupOptions.external` 排除。

5. **TypeScript 构建简化**：移除 `tsc -b` 前置检查（从 `build` 脚本中），仅使用 Vite 构建。因为 `shared/src/` 在项目外部，tsc 无法正确解析跨项目模块。

6. **MorningPlan.tsx 统一**：采用桌面版（精简版），删除 Web 版中未使用的 `taskApi`/`tasks`/`handleStatusChange`/`getTaskById` 代码。

7. **MorningPlanDemo.tsx 删除**：设计验证页面不再保留。

### 构建验证

```bash
# Web 应用
cd app && npm run build      # ✅ 通过

# 桌面应用
cd workflow-app && npm run build  # ✅ 通过
```

### 效果

- **零重复前端代码** — 修改任何页面/组件只需改 `shared/src/` 中一处
- **消除同步遗漏风险** — 不再依赖手动 sync-files.js
- **两个应用独立构建** — Vite alias 不影响构建流程
- **API 适配器自动切换** — 运行时检测，无需手动选择
