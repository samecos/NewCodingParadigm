# 项目级知识商店 (Knowledge Store) 架构与接口定义

在“AI编程新范式”中，**项目级知识商店**是整个系统的“长期记忆中枢”。它不仅需要存储人类编写的结构化“数据探针”，还必须能够响应 AI 代理（如当前IDE中的智能体）在编码过程中的高频查询。

为实现这一目标，我们将其设计为一个 **基于 MCP (Model Context Protocol) 协议的本地微服务**。

## 1. 核心架构设计

知识商店主要由三个层级构成：

```mermaid
graph TD
    A[AI 代理/IDE 插件] <-->|MCP Protocol (JSON-RPC)| B(MCP Server 接入层)
    B --> C{探针解析与路由层}

    C -->|结构化元数据查询| D[(轻量级关系型数据库)]
    C -->|自然语言语义相似度| E[(本地向量数据库)]
    C -->|工程文件实体| F[本地文件系统]

    D -.-> G[知识图谱构建]
    E -.-> G
```

### 1.1 存储层技术选型 (RAG Engine)

为了兼顾个人开发者的极速启动体验和团队级项目的扩展性，存储层采用**混合存储策略**：

- **关系型/图存储 (SQLite / DuckDB)**：用于存储探针的强结构化属性（如 `probe_id`, `type`, `target` 以及它们之间的上下文双向链表）。这保证了根据 ID 精确查找时的 100% 准确率。
- **向量存储 (ChromaDB / SQLite-VSS / Qdrant 本地版)**：用于存储探针的 `content`（自然语言约束）。当 AI 代理遇到一个未标记探针的模糊代码块时，可以通过语义相似度搜索，找回可能相关的业务规则。

### 1.2 接入层设计 (MCP Server)

使用 Model Context Protocol 作为 AI 代理与知识商店对话的标准语言。MCP 屏蔽了底层数据库的复杂性，将知识商店暴露为一个拥有特定 `Tools` (工具) 和 `Resources` (资源) 的服务。

## 2. MCP 接口定义 (API Design)

知识商店应当向外暴露以下核心 MCP Tools：

### 2.1 写入与提取 (Ingestion)

这部分主要由后台 Indexer（索引器）调用，或者当人类/AI 修改文档时触发。

- **`index_probes_from_file`**
  - **参数**: `file_path` (string)
  - **功能**: 扫描传入的 Markdown 或代码文件，利用正则或 AST 提取其中所有的文档级和代码级数据探针，如果发生变更则更新到数据库，建立向量索引。

### 2.2 精确检索 (Lookup) - 基于上下文寻址

这是编程时最常用的接口。当 AI 生成代码前，根据上下文给定的 `@probe_id` 进行拉取。

- **`get_probe_by_id`**
  - **参数**: `probe_id` (string)
  - **返回**: 完整的探针结构（JSON），包含所需遵循的明确代码约束和上下文依赖（对应的需求节点）。

- **`get_probes_by_target`**
  - **参数**: `target_name` (string) - 对应的类名、函数名或模块名。
  - **返回**: 挂载在该目标实体上的所有探针列表。AI 可藉此一次性获得编写该函数的全部前置条件。

### 2.3 语义检索 (Semantic Search) - 基于 RAG

用于解决“不知道 ID，但我正在写登录逻辑”的模糊查询。

- **`search_knowledge`**
  - **参数**: `query` (string), `type_filter` (optional string, 如 'Design' | 'Test_Spec')
  - **功能**: 将 query 向量化后，在向量数据库中寻找 Top-K 个最相关的探针内容。

## 3. 下一步：PoC（概念验证）落地路径

要将这个理论落地，最好的方式是**先建立一个最简可用的 MCP 服务原型**。

**推荐技术栈（Python 体系最适合 AI）：**

1. 框架：`mcp` (官方 Python SDK) / `FastAPI` (作为基础容器)
2. 内部存储引擎：`SQLite` (存元数据) + `ChromaDB` (极简本地向量库)
3. 文本解析：简单的 Python `re` 模块提取 YAML 块和注释。

**开发计划**：
首先在项目中初始化一个 `./knowledge-mcp-server` 目录，编写一个能够**监听本地文档变化，自动提取上文我们定义的那种 Markdown 探针，并通过 MCP 暴露查询接口**的极简 Python 脚本。一旦打通这一步，全自动化的 AI RAG 编程闭环就跑通了第一里路。
