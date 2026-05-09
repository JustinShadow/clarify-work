# Clarify Work

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-blue)](./package.json)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop-1E3A5F)](./)
[![中文](https://img.shields.io/badge/语言-中文-blue)](./README.md) [![English](https://img.shields.io/badge/Lang-English-lightgrey)](./README.en.md)

基于 **GTD + STAR + PDCA** 混合框架的日循环工作管理系统，专为迭代任务驱动 + 随机任务混合型岗位（如软件测试、项目管理）设计。

围绕**日循环**设计：晨间规划自动继承昨日遗留，晚间日报记录执行成果，周报/月报逐级汇总向上汇报——形成闭环反馈。

> 🌊 「专注流」设计体系 — 深海蓝主色调 + 优先级暖色渐变，专为长时间高效使用设计。

---

## 为什么选择 Clarify Work？

### 不只是待办，是一套经过验证的方法论

传统待办工具孤立地管理任务。Clarify Work 实现了基于三大经典框架的**日循环**体系：

- **GTD**（Getting Things Done）— 收集、厘清、组织任务，优先级驱动的看板管理
- **STAR**（Situation-Task-Action-Result）— 以可衡量的成果结构化呈现周报/月报
- **PDCA**（Plan-Do-Check-Act）— 日/周粒度的持续改进闭环

### 一套代码，双平台运行

共享前端源码位于 `shared/src/` — 改一处，Web 和桌面应用同步生效。运行时 `isTauri` 检测自动切换 API 适配器。

---

## 功能特性

| 功能 | 说明 | 框架 |
|------|------|------|
| **看板管理** | 主线/支线任务看板，优先级排序，拖拽管理 | GTD |
| **晨间规划** | 自动继承昨日遗留，AI 辅助生成今日安排 | GTD |
| **日报** | 记录执行过程 + PDCA 复盘，AI 辅助生成 | GTD + PDCA |
| **周报** | 汇总一周日报，STAR 成果展现，PDCA 周度复盘 | PDCA + STAR |
| **月报** | 汇总月度周报，按迭代版本分组，向上汇报工作价值 | STAR |
| **AI 辅助** | 接入 OpenAI 兼容 API，流式生成报告内容 | — |

## 日循环

```
昨日日报 ──→ 晨间规划 ──→ 日间执行 ──→ 晚间日报 ──→ 明日晨间规划
（遗留任务） （今日安排）  （按规划执行） （成果记录）   （闭环）
```

**数据跨层级流转：**

```
日报 Done         → 周报 STAR 成果
日报 Waiting      → 周报阻塞跟踪
日报 Check/Act    → 周报 PDCA 复盘
周报 STAR         → 月报按迭代分组
周报统计          → 月报趋势分析
月报 Act          → 下月晨间规划（闭环）
```

---

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 18+
- 先安装根级依赖（供 `shared/` 模块解析）：

```bash
npm install
```

### Web 版

```bash
cd web-app
npm install
npm run dev
```

前端：http://localhost:5173 | 后端 API：http://localhost:3001

### 桌面版（需要 Rust + Tauri CLI）

```bash
cd desktop-app
npm install
npm run dev
```

详见 [Tauri 环境准备](https://v2.tauri.app/start/prerequisites/)。

### 配置 AI 服务

1. 启动应用后进入 **设置** 页面
2. 填写 API 配置：
   - **Provider**：OpenAI 兼容接口
   - **API Key**：你的密钥
   - **Base URL**：API 地址（默认 `https://api.openai.com/v1`）
   - **Model**：模型名称（默认 `gpt-4o-mini`）
3. 点击 **测试连接** 验证配置

---

## 技术栈

| 层级 | Web 版 | 桌面版 |
|------|--------|--------|
| 前端框架 | React 19 + TypeScript | React 19 + TypeScript |
| 共享源码 | `shared/src/`（Vite alias `@shared`） | 同左 |
| 构建工具 | Vite 8 | Vite 8 |
| CSS 方案 | Tailwind CSS 4 | Tailwind CSS 4 |
| 图标库 | Lucide React | Lucide React |
| 路由 | React Router DOM 7 | React Router DOM 7 |
| 后端 | Express 5 + Node.js | Tauri 2 + Rust |
| AI 接口 | OpenAI SDK（流式） | 同 Web 版 API |
| 数据存储 | JSON 文件 | JSON 文件 |

---

## 项目结构

```
clarify-work/
├── shared/                     # 唯一前端源码（真相源）
│   ├── src/
│   │   ├── api/                # API 层（运行时自动选择适配器）
│   │   │   ├── index.ts        # 命名空间 Proxy 导出 + 动态加载
│   │   │   ├── types.ts        # API 接口定义
│   │   │   ├── web-adapter.ts  # HTTP fetch 实现
│   │   │   └── tauri-adapter.ts# Tauri invoke() 实现
│   │   ├── components/         # 共享组件
│   │   ├── pages/              # 页面组件
│   │   ├── types/              # TypeScript 类型 + Tauri API stub
│   │   ├── utils/              # 工具函数
│   │   ├── prompts/            # LLM 系统提示词（共享）
│   │   ├── templates/          # 报告模板（共享）
│   │   ├── App.tsx             # 统一路由
│   │   └── index.css           # 全局样式
│   └── prompts/                # 提示词源文件（.txt）
│   └── templates/              # 模板源文件（.json）
├── web-app/                    # Web 版（React + Vite + Express）
│   ├── src/main.tsx            # 入口文件
│   ├── server/                 # Express 后端
│   └── vite.config.ts          # Vite alias + 代理
├── desktop-app/                # 桌面版（React + Vite + Tauri）
│   ├── src/main.tsx            # 入口文件
│   └── src-tauri/              # Tauri/Rust 后端
├── docs/                       # 文档
│   ├── DESIGN_GUIDELINE.md     # 「专注流」设计规范
│   └── color-palette-showcase.html  # 配色可视化预览
├── LICENSE                     # MIT 协议
└── package.json                # 根级依赖（共享模块解析）
```

### 架构要点

- **API 适配器自动切换**：`shared/src/api/index.ts` 运行时检测 `isTauri`，动态加载 `web-adapter.ts` 或 `tauri-adapter.ts`。使用前需调用 `initAPI()`（在 `main.tsx` 中完成）。
- **Tailwind CSS 分离**：`@import "tailwindcss"` 在各应用的 `index.css` 中导入，不在 `shared/` 中。`@source` 指令指向 `shared/src/**/*.{ts,tsx}` 供类名扫描。
- **Tauri 类型桩**：`shared/src/types/tauri-api-stub.d.ts` 提供 `@tauri-apps/api/core` 类型声明，无需安装依赖。Web 构建通过 `rollupOptions.external` 排除。

---

## 设计体系

「专注流」（Focus Flow）设计体系专为长时间高效使用设计：

- **主色**：`#1E3A5F`（深海蓝）— 导航栏、主按钮
- **优先级渐变**：P0 `#DC2626` → P1 `#EA580C` → P2 `#EAB308` → P3 `#9CA3AF`
- **功能色**：成功 `#10B981` / 警告 `#F97316` / 危险 `#EF4444` / 信息 `#3B82F6`
- **禁用紫色** — 所有原紫色统一替换为 `#3B82F6` 或 `#1E3A5F`

完整规范：[docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md)
配色预览：[docs/color-palette-showcase.html](./docs/color-palette-showcase.html)

---

## 参与贡献

欢迎贡献！步骤如下：

1. **Fork** 本仓库
2. 创建**功能分支**：`git checkout -b feature/your-feature`
3. 在 `shared/src/` 中修改代码（双平台自动生效）
4. 遵循设计规范 [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md)
5. **测试**双平台：`cd web-app && npm run dev` 和 `cd desktop-app && npm run dev`
6. 提交 **Pull Request**

### 代码规范

- 所有前端代码位于 `shared/src/` — 禁止在 `web-app/` 和 `desktop-app/` 之间复制代码
- 使用十六进制色值或 Tailwind 任意值（如 `bg-[#1e3a5f]`），不用 Tailwind 预设色名
- 图标：仅使用 Lucide React，AI 按钮使用 `Sparkles`
- 暂无测试框架 — 手动测试双平台即可

---

## 报告目录结构

生成的报告以 Markdown 文件保存：

```
reports/YYYY/MM/
├── daily/
│   ├── YYYY-MM-DD-plan.md    # 晨间规划
│   └── YYYY-MM-DD.md         # 日报
├── weekly/
│   └── YYYY-MM-DD.md         # 周报
└── YYYY-MM.md                 # 月报
```

---

## 开源协议

本项目基于 [MIT 协议](./LICENSE) 开源。

---

<p align="center">
  基于 React、Tauri 和 GTD + STAR + PDCA 框架构建 ❤️
</p>
