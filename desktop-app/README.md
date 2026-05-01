# Clarify Desktop App

工作汇报管理系统桌面版，基于 React + Vite + Tauri 2 构建。

## 架构

```
desktop-app/
├── src/                    # 前端源码（与 web-app/src 同步）
│   ├── api/index.ts        # API 调用
│   ├── components/         # 组件
│   ├── pages/              # 页面
│   ├── types/index.ts      # 类型定义
│   ├── utils/              # 工具函数
│   ├── App.tsx             # 路由
│   ├── App.css             # 应用样式
│   ├── index.css           # 全局样式
│   └── main.tsx            # 入口
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/                # Rust 源码
│   ├── icons/              # 应用图标
│   ├── capabilities/       # Tauri 权限配置
│   ├── Cargo.toml          # Rust 依赖
│   ├── build.rs            # 构建脚本
│   └── tauri.conf.json     # Tauri 配置
└── public/                 # 静态资源
```

## 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install)（Tauri 2 要求）
- 系统依赖参考 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)

## 开发

```bash
npm install
npm run dev
```

首次运行会自动编译 Rust 后端，耗时较长。后续启动热更新速度正常。

单独启动前端：

```bash
npm run dev:client
```

## 构建

```bash
# 构建前端
npm run build

# 构建桌面安装包
npm run tauri:build
```

输出安装包在 `src-tauri/target/release/bundle/` 目录下。

## Tauri 配置

`src-tauri/tauri.conf.json` 关键配置：

| 配置项 | 值 |
|--------|-----|
| 产品名 | Clarify |
| 版本 | 0.1.0 |
| 窗口尺寸 | 1280 x 800 |
| 可调整大小 | 是 |
| 居中启动 | 是 |

## 与 Web 版的差异

| 特性 | Web 版 (web-app) | 桌面版 (desktop-app) |
|------|-------------|----------------------|
| 后端 | Express (Node.js) | Tauri (Rust) |
| 数据存储 | app-data/ JSON 文件 | 应用数据目录 |
| 分发 | 浏览器访问 | 原生安装包 |
| 系统集成 | 无 | 原生窗口、文件系统 |
| 前端代码 | 基本同步 | 基本同步 |

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + React Router 7 + Lucide React
- **后端**：Tauri 2 + Rust
- **构建**：Vite 8
