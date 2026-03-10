# AI 编程新范式 (New Coding Paradigm) - 项目级辅助工具指南

欢迎来到 AI 编程新范式的实践基础。本仓库提供了一套用于落地“数据探针”与“大小模型协同开发”理念的工程化工具集（存放在 `tools/` 目录下）。

本说明将引导您如何从零开始，使用这套工具构建一个对 AI 绝对友好的**新范式工程**，并体验基于 MCP 的本地知识商店。

---

## 🚀 核心工具库清单

1. **`create-ncp-app.py`**：一键生成新范式工程骨架的命令行脚手架。
2. **`ncp-mcp-server.py`**：一个基于 FastMCP 编写的知识商店服务端 PoC（提供探针查询 API）。

---

## 第一步：使用脚手架初始化新工程

每次开启一个新项目，您只需要运行如下命令（假设我们需要开发一个名为 `my-ai-project` 的项目）：

```bash
# 在此目录终端下执行：
python tools/create-ncp-app.py my-ai-project
```

### 观察成果：

脚手架会在当前目录下生成一个名为 `my-ai-project` 的文件夹，其目录结构长这样：

```text
my-ai-project/
├── .ai-rules.md                    # (核心级) 强制约束来到这里的所有 AI 的最全局统括规则
├── .agents/
│   └── workflows/
│       └── probe_driven_dev.md     # (流转级) 提供给具有工作流执行能力的打工 AI 的 TDD 微循环操作手册
├── docs/
│   └── knowledge_store/            # (库级别) 您（架构师/Product Owner）在此放入 YAML 格式探针设计的地方
│       └── README.md
├── src/
│   └── math_utils.py               # 带有 @probe_id: XXX 注释的业务空壳（纯函数微包）
└── tests/
    └── test_math_utils.py          # 带有 @probe_id: XXX 注释并提前写好的自动化验证用例
```

一旦任何 AI 读取了这个目录，它马上就会被 `.ai-rules.md` 感染，自动切换到“不看探针不写代码”、“没有测试不写业务”的新范式工作状态。

---

## 第二步：启动项目级知识商店服务端 (MCP)

只有规则还不够，AI 还需要能够查询具体的探针对应对不对，我们启动知识库服务端连接两边。

```bash
# 请确保安装了 mcp 和 httpx 依赖：
# pip install mcp httpx

# 运行服务器（保持该终端后台运行即可）
python tools/ncp-mcp-server.py
```

> **提示**：目前该服务器是 PoC 版，内部用字典模拟了在 `docs/knowledge_store/` 内提取到的 Markdown 数据：
>
> - `Auth-Req-001` (规定登录逻辑的探针)
> - `Math-Req-001` (规定纯函数加法的探针)

---

## 第三步：体验一次典型的新范式大/小模型流水线

现在，让我们看看整个新范式是怎么跑起来的。

### 角色分配：

- **您**：产品经理/架构师。
- **您的 IDE AI (如 Antigravity)**：大模型架构师与执行调度者。
- **本地或后端的代码生成模型**：小模型（打字工）。

### 模拟一天的工作：

1. **撰写需求**：
   有一天您接到需求要在 `my-ai-project/src/math_utils.py` 中写一个数学函数。
   您在 `docs/knowledge_store/xxx.md` 中写下了一个探针：

   ```yaml
   #@Probe: Math-Req-001
   type: Requirement
   content: 遇到负数，就强制返回 0。这是我们的奇葩业务规则。
   ```

2. **AI 拉取约束 (Context Lookup)**：
   您对 AI 输入提示语：“去实现 `math_utils.py`”。
   因为当前项目存在全局锁 `.ai-rules.md`，AI 一进去，发现代码里写了 `@probe_id: Math-Req-001`。
   AI 马上不敢乱写代码，它自动呼叫 `ncp-mcp-server.py` 的读取接口查找该探针的 Content。

3. **立规矩写测试 (Tests as Law)**：
   大模型知道了“负数强返 0”，它首先在 `tests/test_math_utils.py` 里写死断言：
   `assert example_pure_function(-1, 5) == 0`，这时候代码跑不通是一片红色的。

4. **小模型填坑 (Coding Execution)**：
   在后台，极快极便宜的小模型看到了红色的报错和纯函数的类型签名。小模型疯狂重试几秒钟生成了一个带有 `if a < 0 or b < 0: return 0` 的精准“微包代码”，测试变绿。

5. **大工告成**：
   AI 向您汇报：在探针 Math-Req-001 约束下，新的小纯函数已部署并验证完成。
