# WorkFlow 前端设计规范文档

> 版本：v1.0  
> 更新日期：2026-04-28  
> 适用项目：工作汇报管理系统（WorkFlow）

---

## 📋 目录

1. [设计概述](#一设计概述)
2. [配色规范](#二配色规范)
3. [组件规范](#三组件规范)
4. [页面布局](#四页面布局)
5. [文字排版](#五文字排版)
6. [图标规范](#六图标规范)
7. [响应式设计](#七响应式设计)

---

## 一、设计概述

### 1.1 设计理念

**「专注流」** - 专为工作汇报与任务管理系统设计的视觉系统

- **专业感**：深海蓝主调传达信任与专业，适合生产力工具场景
- **状态清晰**：四种功能色明确区分任务状态，一目了然
- **舒适使用**：低饱和中性色减少眼部疲劳，适合长时间使用
- **可访问性**：所有颜色对比度符合 WCAG AA 标准，清晰可读

### 1.2 设计原则

1. **一致性**：同类组件、按钮、状态使用统一配色
2. **层次性**：通过颜色深浅建立视觉层次
3. **反馈性**：交互状态有明确的视觉反馈
4. **简洁性**：避免过多颜色，保持界面清爽

---

## 二、配色规范

### 2.1 主色调（蓝色系）

| 颜色名称 | 色值 | 使用场景 |
|---------|------|----------|
| **P0 - 紧急** | `#DC2626` | 最关键任务、逾期事项，鲜红色 |
| **P1 - 高** | `#F97316` | 重要任务，亮橙色，与P0明显区分 |
| **P2 - 中** | `#EAB308` | 常规任务，金黄色 |
| **P3 - 低** | `#6B7280` | 低优先级，灰色 |

**CSS 变量**：
```css
--color-p0: #dc2626;
--color-p0-light: #fef2f2;
--color-p1: #f97316;
--color-p1-light: #fff7ed;
--color-p2: #eab308;
--color-p2-light: #fefce8;
--color-p3: #6b7280;
--color-p3-light: #f3f4f6;
```

### 2.2 强调色

| 颜色名称 | 色值 | 使用场景 |
|---------|------|----------|
| **琥珀金** | `#F59E0B` | 支线任务、次要任务提醒、月报主题 |
| **淡琥珀** | `#FEF3C7` | 支线任务看板背景 |
| **琥珀边框** | `#FBBF24` | 支线看板边框 |

**CSS 变量**：
```css
--color-accent: #f59e0b;
--color-accent-light: #fef3c7;
```

### 2.3 功能色

| 功能 | 颜色名称 | 色值 | 使用场景 |
|------|---------|------|----------|
| **成功** | 森林绿 | `#10B981` | 已完成、成功状态、日报主题 |
| **警告** | 暖橙 | `#F97316` | 阻塞状态、警告、需要注意 |
| **危险** | 砖红 | `#EF4444` | 逾期、删除、高优先级 |
| **信息** | 天际蓝 | `#3B82F6` | 提示信息、AI相关（统一使用蓝色） |

**CSS 变量**：
```css
--color-success: #10b981;
--color-success-light: #d1fae5;
--color-warning: #f97316;
--color-warning-light: #ffedd5;
--color-danger: #ef4444;
--color-danger-light: #fee2e2;
--color-info: #3b82f6;
--color-info-light: #eff6ff;
```

### 2.4 优先级配色（渐进暖色）

| 优先级 | 颜色 | 色值 | 说明 |
|--------|------|------|------|
| **P0 - 紧急** | 深红 | `#DC2626` | 最关键任务、逾期事项，需要立即处理 |
| **P1 - 高** | 橙红 | `#EA580C` | 重要任务、今日截止，应尽快完成 |
| **P2 - 中** | 金黄 | `#EAB308` | 常规任务、正常处理，按计划进行 |
| **P3 - 低** | 灰色 | `#9CA3AF` | 低优先级任务、可延后处理 |

**设计逻辑**：红→橙→黄的暖色渐变，直观传达紧急程度

**CSS 变量**：
```css
--color-p0: #dc2626;
--color-p0-light: #fee2e2;
--color-p1: #ea580c;
--color-p1-light: #ffedd5;
--color-p2: #eab308;
--color-p2-light: #fef9c3;
--color-p3: #9ca3af;
--color-p3-light: #f3f4f6;
```

### 2.5 状态配色

| 状态 | 背景色 | 边框色 | 指示点 | 文字色 |
|------|--------|--------|--------|--------|
| **待办** | `#F8FAFC` | `#CBD5E1` | `#94A3B8` | `#64748B` |
| **进行中** | `#EFF6FF` | `#3B82F6` | `#3B82F6` | `#1D4ED8` |
| **已完成** | `#ECFDF5` | `#10B981` | `#10B981` | `#047857` |
| **已阻塞** | `#FFF7ED` | `#F97316` | `#F97316` | `#C2410C` |

### 2.6 中性色阶

| 用途 | 色值 | Tailwind 类名 |
|------|------|---------------|
| **页面背景** | `#F8FAFC` | `bg-[#f8fafc]` |
| **卡片背景** | `#FFFFFF` | `bg-white` |
| **卡片次级背景** | `#F1F5F9` | `bg-[#f1f5f9]` |
| **边框颜色** | `#E2E8F0` | `border-[#e2e8f0]` |
| **分割线** | `#CBD5E1` | `border-[#cbd5e1]` |
| **占位文字** | `#CBD5E1` | `text-[#cbd5e1]` |
| **次要文字** | `#94A3B8` | `text-[#94a3b8]` |
| **主要文字** | `#64748B` | `text-[#64748b]` |
| **标题文字** | `#1E293B` | `text-[#1e293b]` |
| **深色强调** | `#475569` | `text-[#475569]` |

---

## 三、组件规范

### 3.1 按钮规范

#### 主按钮（Primary Button）
- **背景**：`#1E3A5F`（深海蓝）
- **文字**：白色
- **悬停**：`#1E4976`（稍亮）
- **圆角**：`rounded-xl`（12px）
- **内边距**：`px-5 py-2.5`
- **字体**：`font-semibold text-sm`
- **阴影**：`shadow-md`

```jsx
<button className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold shadow-md">
  按钮文字
</button>
```

#### 次按钮（Secondary Button）
- **背景**：`#F1F5F9`（淡灰）
- **文字**：`#475569`
- **悬停**：`#E2E8E0`
- **圆角**：`rounded-xl`
- **内边距**：`px-5 py-2.5`

```jsx
<button className="px-5 py-2.5 bg-[#f1f5f9] text-[#475569] rounded-xl hover:bg-[#e2e8f0] transition text-sm font-semibold">
  按钮文字
</button>
```

#### AI辅助按钮
- **背景**：`#EFF6FF`（极淡蓝）
- **文字**：`#1E40AF`（深蓝）
- **边框**：`border-[#BFDBFE]`
- **悬停**：`#DBEAFE`

```jsx
<button className="px-4 py-2.5 bg-[#eff6ff] text-[#1e40af] hover:bg-[#dbeafe] rounded-xl transition font-semibold border border-[#bfdbfe]">
  <Sparkles size={16} /> AI 辅助生成
</button>
```

### 3.2 卡片规范

#### 任务卡片（TaskCard）
- **背景**：白色（默认）/ `#FEF2F2`（逾期）/ `#FFF7ED`（阻塞）
- **边框**：`#E2E8F0`（默认）/ `#FECACA`（逾期）/ `#FED7AA`（阻塞）
- **圆角**：`rounded-lg`（8px）
- **阴影**：`shadow-sm`，悬停 `shadow-md`
- **内边距**：`px-3 py-2.5`

#### 看板卡片（KanbanBoard）
**主线任务看板**：
- **背景**：渐变 `from-[#eff6ff] to-[#dbeafe]`
- **边框**：`#3B82F6`
- **标题**：`#1E3A5F`

**支线任务看板**：
- **背景**：渐变 `from-[#fffbeb] to-[#fef3c7]`
- **边框**：`#FBBF24`
- **标题**：`#92400E`

### 3.3 进度条规范

#### 任务进度条
- **高度**：`h-[3px]`（卡片内）/ `h-2`（详情内）
- **背景槽**：`#F1F5F9`
- **填充色**：
  - 进行中 → `#3B82F6`（天际蓝）**统一使用，不按进度变化**
  - 已完成 → `#10B981`（森林绿）
  - 已阻塞 → `#F97316`（暖橙）

```jsx
<div className="w-full h-[3px] bg-[#f1f5f9]">
  <div className="h-full bg-[#3b82f6] transition-all duration-300" style={{ width: `${progress}%` }} />
</div>
```

### 3.4 弹窗规范

#### 模态弹窗（Modal）
- **遮罩层**：`bg-[#1e3a5f]/30 backdrop-blur-sm`
- **弹窗背景**：白色
- **圆角**：`rounded-2xl`（16px）
- **阴影**：`shadow-2xl`
- **边框**：`border-[#e2e8f0]`
- **最大宽度**：`max-w-lg`（小）/ `max-w-2xl`（中）/ `max-w-3xl`（大）

#### 弹窗头部
- **布局**：Flex 左右对齐
- **标题**：`text-lg font-bold text-[#1e293b]`
- **关闭按钮**：右上角，`p-2 hover:bg-[#f1f5f9] rounded-lg`
- **底部边框**：`border-b border-[#e2e8f0]`

### 3.5 输入框规范

#### 文本输入
- **背景**：`#F8FAFC`
- **边框**：`#E2E8F0`，聚焦时 `border-[#3B82F6]`
- **圆角**：`rounded-xl`
- **聚焦环**：`focus:ring-2 focus:ring-[#3b82f6]`
- **内边距**：`px-4 py-2.5`

```jsx
<input 
  className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
/>
```

#### 下拉选择
- 与文本输入样式一致
- 选项悬停：`hover:bg-[#f1f5f9]`

### 3.6 标签规范

#### 优先级标签
```jsx
// P0 紧急
<span className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#dc2626] text-white border border-[#b91c1c]">
  P0 紧急
</span>

// P1 高
<span className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]">
  P1 高
</span>

// P2 中
<span className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#fefce8] text-[#a16207] border border-[#fde047]">
  P2 中
</span>

// P3 低
<span className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#f3f4f6] text-[#4b5563] border border-[#d1d5db]">
  P3 低
</span>
```

#### 普通标签
- **背景**：`#F1F5F9`
- **文字**：`#64748B`
- **圆角**：`rounded-full`
- **内边距**：`px-2 py-0.5`
- **字体**：`text-[10px]`

---

## 四、页面布局

### 4.1 导航栏（Layout）

- **高度**：`h-16`
- **背景**：`#1E3A5F`（深海蓝）
- **位置**：`sticky top-0`
- **阴影**：`shadow-lg`

**Logo 区域**：
- 图标容器：`w-8 h-8 bg-white/20 rounded-lg backdrop-blur-sm`
- 文字：`text-lg font-bold text-white`

**导航链接**：
- 默认：`text-white/70 hover:bg-white/10 hover:text-white`
- 选中：`bg-white/15 text-white shadow-sm`
- 圆角：`rounded-lg`
- 内边距：`px-4 py-2`

### 4.2 页面头部

统一布局结构：
```jsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    {/* 图标区域 */}
    <div className="w-12 h-12 bg-[主题色对应背景] rounded-xl flex items-center justify-center">
      <Icon size={24} className="text-[主题色]" />
    </div>
    {/* 文字区域 */}
    <div>
      <h1 className="text-2xl font-bold text-[#1e3a5f]">页面标题</h1>
      <p className="text-sm text-[#64748b]">页面副标题描述</p>
    </div>
  </div>
  {/* 操作按钮 */}
  <button className="...主按钮样式...">操作</button>
</div>
```

### 4.3 页面主题色分配

| 页面 | 主题色 | 图标背景 | 图标颜色 |
|------|--------|----------|----------|
| **看板 (Board)** | 蓝色系 | `#EFF6FF` | `#1E3A5F` |
| **规划 (MorningPlan)** | 琥珀金 | `#FEF3C7` | `#F59E0B` |
| **日报 (DailyReports)** | 森林绿 | `#ECFDF5` | `#10B981` |
| **周报 (WeeklyReports)** | 天际蓝 | `#EFF6FF` | `#3B82F6` |
| **月报 (MonthlyReports)** | 琥珀金 | `#FEF3C7` | `#F59E0B` |
| **设置 (Settings)** | 蓝色系 | `#EFF6FF` | `#3B82F6` |

### 4.4 内容区域

- **最大宽度**：`max-w-7xl mx-auto`
- **水平内边距**：`px-4 sm:px-6`
- **垂直内边距**：`py-6`
- **背景**：`#F8FAFC`

### 4.5 栅格系统

- **看板列**：`grid-cols-3 gap-3`
- **统计栏**：`grid-cols-3 sm:grid-cols-6 gap-3`
- **表单布局**：`grid-cols-2 gap-4`
- **响应式**：`lg:grid-cols-3`（大屏三列）

---

## 五、文字排版

### 5.1 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### 5.2 字号规范

| 用途 | 大小 | 字重 | 颜色 |
|------|------|------|------|
| **页面标题** | `text-2xl` (24px) | `font-bold` (700) | `#1E3A5F` |
| **卡片标题** | `text-lg` (18px) | `font-bold` (700) | 主题色 |
| **区块标题** | `text-sm` (14px) | `font-semibold` (600) | `#475569` |
| **正文** | `text-sm` (14px) | `font-normal` (400) | `#64748B` |
| **辅助文字** | `text-xs` (12px) | `font-normal` (400) | `#94A3B8` |
| **极小文字** | `text-[10px]` (10px) | `font-medium` (500) | `#94A3B8` |

### 5.3 行高

- **标题**：`leading-snug` (1.375)
- **正文**：`leading-relaxed` (1.625)
- **紧凑文字**：`leading-tight` (1.25)

### 5.4 文字截断

```jsx
// 单行截断
<h4 className="truncate">...</h4>

// 多行截断（最多3行）
<p className="line-clamp-3">...</p>
```

---

## 六、图标规范

### 6.1 图标库

使用 **Lucide React** 图标库：
```jsx
import { IconName } from 'lucide-react'
```

### 6.2 图标尺寸

| 场景 | 尺寸 |
|------|------|
| **导航栏图标** | `size={16}` |
| **页面头部图标** | `size={24}` |
| **卡片标题图标** | `size={16}` |
| **按钮内图标** | `size={16}` |
| **列表项图标** | `size={14}` |
| **状态图标** | `size={12}` / `size={10}` |

### 6.3 常用图标映射

| 功能 | 图标 | 颜色 |
|------|------|------|
| **新建/添加** | `Plus` | 白色（按钮内） |
| **编辑** | `Pencil` | `#64748B` |
| **删除** | `Trash2` | `#94A3B8` → 悬停 `#EF4444` |
| **完成** | `Check` / `CheckCircle2` | `#10B981` |
| **进行中** | `Loader` / `Clock` | `#3B82F6` |
| **阻塞** | `Ban` / `AlertTriangle` | `#F97316` |
| **AI/智能** | `Sparkles` | 主题色 |
| **日历** | `Calendar` | 主题色 |
| **设置** | `Settings` | `#64748B` |
| **关闭** | `X` | `#94A3B8` |
| **箭头** | `ChevronRight` / `ChevronLeft` | `#94A3B8` |

---

## 七、响应式设计

### 7.1 断点设置

| 断点 | 宽度 | Tailwind 前缀 |
|------|------|---------------|
| **手机** | < 640px | 默认 |
| **平板** | 640px - 1024px | `sm:` |
| **桌面** | 1024px - 1280px | `lg:` |
| **大屏** | > 1280px | `xl:` |

### 7.2 响应式规则

**导航栏**：
- 手机：隐藏部分导航项，显示汉堡菜单
- 平板/桌面：显示完整导航

**看板**：
- 手机：单列显示
- 平板：`grid-cols-2`
- 桌面：`grid-cols-3`

**统计栏**：
- 手机：`grid-cols-3`（紧凑）
- 平板/桌面：`grid-cols-6`

**弹窗**：
- 手机：`mx-4`（边距）
- 平板/桌面：`max-w-lg` / `max-w-2xl`

### 7.3 触摸适配

- 按钮最小点击区域：44px × 44px
- 列表项内边距适当增加
- 触摸反馈：`active:scale-95`

---

## 八、动画与过渡

### 8.1 过渡效果

```css
/* 默认过渡 */
transition: all 0.2s ease-out;

/* 颜色过渡 */
transition-colors: color 0.2s, background-color 0.2s, border-color 0.2s;

/* 阴影过渡 */
transition-shadow: box-shadow 0.2s;

/* 变形过渡 */
transition-transform: transform 0.2s;
```

### 8.2 动画效果

```css
/* 淡入上滑 */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 淡入下滑 */
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 脉冲（用于逾期提醒） */
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

/* 旋转（用于加载） */
animation: spin 1s linear infinite;
```

---

## 九、代码示例

### 9.1 完整按钮组件

```tsx
// 主按钮
export function PrimaryButton({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold disabled:opacity-50 shadow-md flex items-center gap-2"
    >
      {children}
    </button>
  )
}

// 次按钮
export function SecondaryButton({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 bg-[#f1f5f9] text-[#475569] rounded-xl hover:bg-[#e2e8f0] transition text-sm font-semibold"
    >
      {children}
    </button>
  )
}
```

### 9.2 任务卡片组件

```tsx
export function TaskCard({ task }: { task: Task }) {
  const progressColor = task.status === 'done' 
    ? 'bg-[#10b981]' 
    : task.blocked 
      ? 'bg-[#f97316]' 
      : 'bg-[#3b82f6]'
  
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white shadow-sm hover:shadow-md transition-all p-3">
      {/* 卡片内容 */}
      <div className="w-full h-[3px] bg-[#f1f5f9] mt-2">
        <div className={`h-full ${progressColor} transition-all`} style={{ width: `${task.progress}%` }} />
      </div>
    </div>
  )
}
```

### 9.3 页面头部组件

```tsx
export function PageHeader({ 
  icon: Icon, 
  iconBg, 
  iconColor, 
  title, 
  subtitle, 
  action 
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={24} className={iconColor} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{title}</h1>
          <p className="text-sm text-[#64748b]">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
```

---

## 十、附录

### 10.1 禁用颜色

以下颜色不再使用，统一替换为配色方案内颜色：

| 禁用颜色 | 替换为 | 说明 |
|---------|--------|------|
| `#9333EA` 紫色 | `#3B82F6` 蓝色 | AI相关 |
| `#8B5CF6` 紫色 | `#3B82F6` 蓝色 | AI图标 |
| `#6366F1` 靛蓝 | `#3B82F6` 蓝色 | 聚焦环 |
| `#A855F7` 紫色 | `#3B82F6` 蓝色 | 按钮 |
| `#EDE9FE` 淡紫 | `#EFF6FF` 淡蓝 | 背景 |
| `#F3E8FF` 淡紫 | `#FEF3C7` 淡琥珀 | 规划页 |
| `#581C87` 深紫 | `#92400E` 深琥珀 | 文字 |
| `purple-500` | `#3B82F6` | Tailwind类 |
| `purple-600` | `#1E3A5F` | Tailwind类 |

### 10.2 快速参考卡

```
┌─────────────────────────────────────────────────────────────┐
│                    「专注流」配色速查                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  主按钮    ████ #1E3A5F                                     │
│  次按钮    ████ #3B82F6                                     │
│  成功      ████ #10B981                                     │
│  警告      ████ #F97316                                     │
│  危险      ████ #EF4444                                     │
│                                                             │
│  P0紧急    ████ #DC2626                                     │
│  P1高      ████ #F97316                                     │
│  P2中      ████ #EAB308                                     │
│  P3低      ████ #6B7280                                     │
│                                                             │
│  背景      ████ #F8FAFC                                     │
│  卡片      ████ #FFFFFF                                     │
│  边框      ████ #E2E8F0                                     │
│  文字      ████ #64748B                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**文档结束**

如有疑问或需要更新，请联系前端开发团队。
