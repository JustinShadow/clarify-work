# Clarify Web App

工作汇报管理系统 Web 版本，基于 React + Vite + Express 构建。

## 架构

```
web-app/
├── src/                       # 前端（React + Vite）
│   ├── api/index.ts           # API 调用封装（fetch + SSE 流式）
│   ├── components/            # 通用组件
│   │   ├── Layout.tsx         # 全局布局 + 导航栏
│   │   ├── TaskCard.tsx       # 任务卡片
│   │   ├── TaskModal.tsx      # 任务新建/编辑弹窗
│   │   ├── KanbanBoard.tsx    # 看板组件（主线/支线）
│   │   ├── StatsBar.tsx       # 统计栏
│   │   ├── HoverDetail.tsx    # 悬停详情面板
│   │   ├── ReportCard.tsx     # 报告卡片
│   │   ├── DailyReportModal.tsx # 日报弹窗
│   │   └── LLMDialog.tsx      # AI 对话框（流式输出）
│   ├── pages/                 # 页面
│   │   ├── Board.tsx          # 看板页
│   │   ├── MorningPlan.tsx    # 晨间规划页
│   │   ├── DailyReports.tsx   # 日报页
│   │   ├── WeeklyReports.tsx  # 周报页
│   │   ├── MonthlyReports.tsx # 月报页
│   │   └── Settings.tsx       # 设置页
│   ├── types/index.ts         # TypeScript 类型定义
│   ├── utils/                 # 工具函数
│   │   ├── priority.ts        # 优先级工具
│   │   └── markdown.tsx       # Markdown 渲染
│   ├── App.tsx                # 路由配置
│   ├── index.css              # 全局样式
│   └── main.tsx               # 入口
├── server/                    # 后端（Express 5）
│   ├── index.js               # 全部后端逻辑
│   └── package.json
├── app-data/                  # 运行时数据（已 gitignore）
│   ├── config/                # LLM 配置
│   ├── data/                  # 任务、标签 JSON
│   └── reports/               # 报告 JSON
└── public/                    # 静态资源
```

## 开发

```bash
# 安装依赖
npm install
cd server && npm install && cd ..

# 启动（前端 + 后端 concurrently）
npm run dev
```

- 前端：http://localhost:5173（Vite，API 请求代理到后端）
- 后端：http://localhost:3001

单独启动：

```bash
npm run dev:client   # 仅前端
npm run dev:server   # 仅后端
```

## 构建

```bash
npm run build
```

输出到 `dist/`，需单独部署后端服务。

## 数据存储

所有数据存储在 `app-data/` 目录（已 gitignore），以 JSON 文件形式持久化：

- `app-data/data/tasks.json` - 任务列表
- `app-data/data/tags.json` - 标签列表
- `app-data/config/llm-config.json` - LLM API 配置
- `app-data/reports/` - 报告 JSON 数据

Markdown 格式报告同步输出到项目根目录 `reports/` 下。

## API 代理

Vite 开发服务器配置了 API 代理，将 `/api/*` 请求转发到 `http://localhost:3001`。生产环境需配置反向代理。

## 技术细节

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + React Router 7 + Lucide React
- **后端**：Express 5 + OpenAI SDK（流式 SSE）
- **通信**：REST API + Server-Sent Events（AI 生成场景）
- **数据**：JSON 文件存储，无数据库依赖
