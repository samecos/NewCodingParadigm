---
description: 自动拉取题目并初始化探针（供子Agent自动执行）
---

此工作流用于拉取指定的 LeetCode 题目，并自动设立开发环境。无需人类干预。

1. 你会接收到一个题目的标识（题号或英文 slug，如 "two-sum"）。
   // turbo
2. 执行准备好的脚本拉取题目数据并在 `problems/{slug}` 创建基础目录结构与 raw 面板描述：
   `npx tsx scripts/fetch_problem.ts <slug>`
3. 查看提取出的题目要求在 `problems/{slug}/raw.md` 中。
4. 分析题目要求，在这个目录下直接生成包含 AI 新范式的数据探针文件 `problems/{slug}/problem.md`（包括 Requirement 探针和 Design 探针，必须按 YAML-in-Markdown 格式书写，设定 `@probe_id`）。
5. 依据这些探针，在这同样的目录下生成一个用于 TDD 测试的起始文件 `problems/{slug}/solution.test.ts`，要求写好基本断言和探针注释关联。
6. 接着生成空的纯函数实现文件 `problems/{slug}/solution.ts`。
7. 删除 `problems/{slug}/raw.md`，报告完成，提示人类此时可以进行正式编码（或触发 leetcode_flow.md）。
