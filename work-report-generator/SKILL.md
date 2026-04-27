---
name: work-report-generator
description: 日循环工作管理系统（晨间规划→晚间日报→周报→月报），基于 GTD+STAR+PDCA 混合框架。适用于软件测试等迭代任务驱动+随机任务混合型岗位。触发短语："晨间规划"、"今日规划"、"写日报"、"生成周报"、"生成月报"、"工作汇报"、"日报"、"周报"、"月报"。使用场景：(1) 每日晨间生成今日工作规划（自动继承昨日遗留），(2) 每日晚间记录工作成果生成日报，(3) 汇合一周日报生成周报，(4) 汇合月度周报生成月报。
---

# Work Report Generator

基于 **GTD + STAR + PDCA** 混合框架的三级工作报告生成系统。

## 框架设计

| 报告层级 | 主用框架 | 核心用途 |
|---------|---------|---------|
| 晨间规划 | GTD（任务流管理） | 每日工作安排指导 |
| 日报 | GTD + PDCA | 记录执行过程 + 复盘 |
| 周报 | PDCA（复盘改进） | 自我复盘与偏差分析 |
| 月报 | STAR（成果展现） | 向上汇报工作价值 |

详细理论框架说明见 `references/theory-frameworks.md`。

## 日循环

每日遵循 **晨间规划 → 日间执行 → 晚间日报** 循环：

```
昨日日报 ──→ 晨间规划 ──→ 日间执行 ──→ 晚间日报 ──→ 明日晨间规划
（遗留任务） （今日安排）  （按规划执行） （成果记录）   （闭环）
```

详细流程见 `references/workflow.md`。

## 晨间规划

**触发**：用户说"晨间规划"、"今日规划"、"今天安排"等

1. 确定日期（默认今天）
2. 查找昨日日报文件，若存在自动提取：
   - 未完成 Next Actions → 今日待续
   - Waiting → 今日跟进阻塞
   - 明日计划 → 今日继承
3. 若不存在昨日日报，跳过自动提取
4. 询问今日新增任务：逐条输入（内容|来源|优先级|预计耗时）
5. 合并遗留 + 新增，按优先级排序生成今日安排
6. 询问是否调整安排 + 注意事项
7. 读取模板 `assets/morning-plan-template.md`
8. 生成文件到 `reports/YYYY/MM/daily/YYYY-MM-DD-plan.md`

## 生成日报

**触发**：用户说"写日报"、"记录今日工作"等

1. 确定日期（默认今天）
2. 查找今日晨间规划文件，若存在自动提取：
   - 今日工作安排 → Next Actions 基准
   - 昨日遗留未完成 → 检查哪些今日已完成，转入 Done
   - 今日新增 → Inbox 基准
3. 若不存在晨间规划，全部从用户输入获取
4. 询问用户今日实际执行情况：
   - 对照晨间规划，哪些完成了？（Done）
   - 有什么阻塞事项？（Waiting）
   - 专注度评分（1-5）
   - 偏差分析（Check）
   - 改进措施（Act）
   - 明日计划
5. 读取模板 `assets/daily-report-template.md`
6. 填充数据，生成文件到 `reports/YYYY/MM/daily/YYYY-MM-DD.md`

## 生成周报

**触发**：用户说"写周报"、"汇总本周工作"等

1. 确定周范围（默认本周，可指定）
2. 读取本周所有日报文件（`reports/YYYY/MM/daily/` 下对应日期范围）
3. 自动汇总：
   - 任务完成率统计
   - 关键成果提取 → 按 STAR 格式重组
   - 阻塞事项跟踪
   - 偏差数据聚合 → PDCA 周度复盘
4. 询问用户补充：
   - 哪些成果需要 STAR 格式展开？
   - 周度偏差分析补充？
   - 下周计划？
5. 读取模板 `assets/weekly-report-template.md`
6. 填充数据，生成文件到 `reports/YYYY/MM/weekly/YYYY-WXX.md`

## 生成月报

**触发**：用户说"写月报"、"月度汇报"等

1. 确定月份（默认本月，可指定）
2. 读取本月所有周报文件（`reports/YYYY/MM/weekly/` 下）
3. 自动汇总：
   - 月度任务统计
   - STAR 成果按测试迭代版本分组重组
   - 数据趋势分析（与上月对比）
4. 询问用户补充：
   - 参与了哪些迭代版本？Bug 数据？
   - 月度亮点/不足/意外发现？
   - 下月展望？
5. 读取模板 `assets/monthly-report-template.md`
6. 填充数据，生成文件到 `reports/YYYY/MM/YYYY-MM.md`

## 目录结构与命名

详细规范见 `references/workflow.md`。

```
reports/YYYY/MM/daily/YYYY-MM-DD-plan.md  # 晨间规划
reports/YYYY/MM/daily/YYYY-MM-DD.md       # 日报
reports/YYYY/MM/weekly/YYYY-WXX.md        # 周报
reports/YYYY/MM/YYYY-MM.md                # 月报
```

## 数据流转

昨日日报未完成 → 今日晨间规划待续  
昨日日报 Waiting → 今日晨间规划跟进  
昨日日报明日计划 → 今日晨间规划继承  
晨间规划工作安排 → 今日日报 Next Actions（基准）  
晨间规划新增任务 → 今日日报 Inbox  
日报 Done → 周报 STAR 成果  
日报 Waiting → 周报阻塞跟踪  
日报 Check/Act → 周报 PDCA 复盘  
周报 STAR → 月报按迭代分组  
周报统计 → 月报趋势分析  
月报 Act → 下月晨间规划（闭环）