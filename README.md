# Clarify - 工作汇报管理系统

基于 **GTD + STAR + PDCA** 混合框架的日循环工作管理系统，专为迭代任务驱动+随机任务混合型岗位设计。

## 功能概览

| 功能 | 说明 | 框架 |
|------|------|------|
| 看板管理 | 主线/支线任务看板，优先级排序，拖拽管理 | GTD |
| 晨间规划 | 自动继承昨日遗留，AI 辅助生成今日安排 | GTD |
| 日报 | 记录执行过程 + PDCA 复盘，AI 辅助生成 | GTD + PDCA |
| 周报 | 汇总一周日报，STAR 成果展现，PDCA 周度复盘 | PDCA + STAR |
| 月报 | 汇总月度周报，按迭代版本分组，向上汇报工作价值 | STAR |
| AI 辅助 | 接入 OpenAI 兼容 API，流式生成报告内容 | - |

## 日循环

```
昨日日报 ──→ 晨间规划 ──→ 日间执行 ──→ 晚间日报 ──→ 明日晨间规划
（遗留任务） （今日安排）  （按规划执行） （成果记录）   （闭环）
```

## 项目结构

```
work-report/
├── shared/                    # 共享前端源码（真相源）
│   └── src/
│       ├── api/               # API 调用层（运行时自动选择适配器）
│       │   ├── index.ts       # 命名空间 Proxy 导出 + 动态加载
│       │   ├── types.ts       # API 接口定义
│       │   ├── web-adapter.ts # HTTP fetch 实现
│       │   └── tauri-adapter.ts # Tauri invoke 实现
│       ├── components/        # 通用组件（9个）
│       ├── pages/             # 页面组件（6个）
│       ├── types/             # TypeScript 类型定义 + Tauri API stub
│       ├── utils/             # 工具函数
│       ├── App.tsx            # 统一路由
│       └── index.css          # 全局样式
├── web-app/                    # Web 版本（React + Vite + Express）
│   ├── src/main.tsx           # 入口文件
│   ├── server/                # Express 后端服务
│   └── app-data/              # 运行时数据（已 gitignore）
├── desktop-app/                # 桌面版（React + Vite + Tauri）
│   ├── src/main.tsx           # 入口文件
│   └── src-tauri/             # Tauri/Rust 后端
├── work-report-generator/     # AI Agent Skill（报告生成工作流）
│   ├── SKILL.md               # Skill 定义
│   ├── assets/                # 报告模板
│   └── references/            # 框架参考文档
├── reports/                   # 生成的 Markdown 报告文件
├── DESIGN_GUIDELINE.md        # 「专注流」前端设计规范
└── package.json               # 根级依赖（shared node_modules 解析）
```

### 架构说明

Web 和桌面应用共享同一套前端源码（`shared/src/`），各应用仅保留 `main.tsx` 入口文件。API 层通过运行时 `isTauri` 检测自动选择适配器：

- **Web**：`web-adapter.ts` → HTTP fetch 到 Express 后端
- **桌面**：`tauri-adapter.ts` → Tauri invoke 调用 Rust 后端

修改任何页面/组件只需改 `shared/src/` 中一处，两个应用自动生效。

## 技术栈

| 层级 | Web 版 (web-app) | 桌面版 (desktop-app) |
|------|-------------|----------------------|
| 前端框架 | React 19 + TypeScript | React 19 + TypeScript |
| 共享源码 | `shared/src/`（Vite alias `@shared`） | 同左 |
| 构建工具 | Vite 8 | Vite 8 |
| CSS 方案 | Tailwind CSS 4 | Tailwind CSS 4 |
| 图标库 | Lucide React | Lucide React |
| 路由 | React Router DOM 7 | React Router DOM 7 |
| 后端 | Express 5 + Node.js | Tauri 2 + Rust |
| AI 接口 | OpenAI SDK（流式） | 同 Web 版 API |
| 数据存储 | JSON 文件 | JSON 文件 |

## 快速开始

### 前置条件

```bash
# 安装根级依赖（供 shared/src/ 模块解析）
npm install
```

### Web 版

```bash
cd web-app
npm install
npm run dev
```

启动后访问 http://localhost:5173，后端 API 服务自动在 http://localhost:3001 启动。

### 桌面版

```bash
cd desktop-app
npm install
npm run dev
```

需要安装 [Rust](https://www.rust-lang.org/tools/install) 和 Tauri CLI。

## 配置 AI 服务

1. 启动应用后进入 **设置** 页面
2. 填写 API 配置：
   - **Provider**: OpenAI 兼容接口
   - **API Key**: 你的密钥
   - **Base URL**: API 地址（默认 `https://api.openai.com/v1`）
   - **Model**: 模型名称（默认 `gpt-4o-mini`）
3. 点击 **测试连接** 验证配置

## 报告目录结构

```
reports/YYYY/MM/
├── daily/
│   ├── YYYY-MM-DD-plan.md    # 晨间规划
│   └── YYYY-MM-DD.md         # 日报
├── weekly/
│   └── YYYY-MM-DD.md         # 周报
└── YYYY-MM.md                 # 月报
```

## API 接口

后端服务端口：`3001`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/tags` | 获取标签 |
| GET | `/api/stats` | 获取统计数据 |
| GET | `/api/llm/config` | 获取 LLM 配置 |
| PUT | `/api/llm/config` | 更新 LLM 配置 |
| POST | `/api/llm/test` | 测试 LLM 连接 |
| POST | `/api/llm/generate-morning-plan` | AI 生成晨间规划（SSE） |
| POST | `/api/llm/generate-daily` | AI 生成日报（SSE） |
| POST | `/api/llm/generate-weekly` | AI 生成周报（SSE） |
| POST | `/api/llm/generate-monthly` | AI 生成月报（SSE） |
| GET/POST/PUT/DELETE | `/api/reports/daily/*` | 日报 CRUD |
| GET/POST/DELETE | `/api/reports/weekly/*` | 周报 CRUD |
| GET/POST/DELETE | `/api/reports/monthly/*` | 月报 CRUD |
| GET/POST/PUT | `/api/reports/morning-plan/*` | 晨间规划 CRUD |

## 设计规范

详见 [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)，包含：

- 「专注流」配色方案（深海蓝主调 + 优先级暖色渐变）
- 组件规范（按钮、卡片、进度条、弹窗、输入框、标签）
- 页面布局（导航栏、页面头部、主题色分配）
- 文字排版、图标规范、响应式设计、动画过渡

配色可视化预览：[color-palette-showcase.html](./color-palette-showcase.html)

## 数据流转

```
昨日日报未完成    → 今日晨间规划待续
昨日日报 Waiting  → 今日晨间规划跟进
昨日日报明日计划  → 今日晨间规划继承
晨间规划工作安排  → 今日日报 Next Actions
晨间规划新增任务  → 今日日报 Inbox
日报 Done         → 周报 STAR 成果
日报 Waiting      → 周报阻塞跟踪
日报 Check/Act    → 周报 PDCA 复盘
周报 STAR         → 月报按迭代分组
周报统计          → 月报趋势分析
月报 Act          → 下月晨间规划（闭环）
```