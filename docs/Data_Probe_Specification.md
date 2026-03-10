# 数据探针 (Data Probe) 规范与应用指南

## 1. 设计核心理念

在“AI编程新范式”中，数据探针 (Data Probe) 是连接“人类意图”与“AI执行约束”的桥梁。探针的设计必须兼顾两个看似矛盾的维度：

1.  **Human-Readable (人类程序员易写易读)**：探针不能引入过于繁琐的 XML 或深层嵌套的 JSON 结构，否则会严重增加程序员的心智负担。它应该像自然语言的引文或轻量级的 Markdown/DSL 标签一样自然，能够无缝融入需求文档、设计文档和代码注释中。
2.  **Machine-Parsable (AI极度易识别易解析)**：对于 AI 代理（特别是后续用于挂载存储的 RAG 和 MCP 解析器），这些探针必须具备绝对的结构化特征。它们需要能被正则表达式、AST解析器或简单的 YAML/JSON 解析器以 100% 的准确率提取，进而构建出项目级别的知识图谱。

## 2. 数据探针架构 (Schema Design)

为了平衡上述两点，我们采用 **YAML-in-Markdown (文档级) + 特殊注释块 (代码级)** 的混合设计。

### 2.1 核心字段定义

无论在哪里，一个标准的数据探针都应该包含以下核心元数据：

- `probe_id`: 探针全局唯一标识（建议：模块名-功能名-流水号）。
- `type`: 探针类型 (`Requirement` | `Design` | `Constraint` | `Test_Spec`)。
- `target`: 约束的具体目标（如某个特定的函数名、API路径、组件名）。
- `context`: （可选）依赖的其他探针ID，用于构建知识图条目之间的关联。
- `content`: 具体约束的自然语言或伪代码描述。

### 2.2 文档级探针 (Markdown 格式)

在需求文档 (`.md`) 或设计文档中，我们使用被特定标记包裹的 YAML 块（或者类似于 GitHub Alert 的语法），这种格式既不会破坏 Markdown 的阅读体验，又极易被解析器（如 python-frontmatter 或正则表达式）提取。

**语法范例：**

```markdown
> [!PROBE] UserAuth-Req-001
> type: Requirement
> target: UserLoginFlow
> content: 用户登录失败超过3次，必须触发人机验证机制。
> context: [UserAuth-Design-001]
```

或者使用更严谨的代码块包裹：

```yaml
#@Probe: UserAuth-Design-001
type: Design
target: authenticate_user(username, password)
content: >
  必须使用 bcrypt 进行密码比对。
  成功后返回包含 userId 和 roles 的 JWT Token。
```

### 2.3 代码级探针 (注释格式)

在代码实现中，探针主要用于双向追溯（从代码追溯到文档）以及为 AI 提供实时的上下文断言。我们采用类 JSDoc/JavaDoc 的特殊标签 `@probe`。

**语法范例（以 Python 为例）：**

```python
def authenticate_user(username, password):
    """
    用户身份验证与令牌签发。

    @probe_id: UserAuth-Design-001
    @probe_type: Design_Implementation
    @probe_assert: JWT token must contain 'userId' and 'roles'
    """
    # 业务逻辑实现...
    pass
```

## 3. 探针在开发生命周期的流转示例

### 场景：实现“修改密码”功能

#### 步骤 1: 需求阶段 (写在产品需求文档 PRD.md 中)

```markdown
> [!PROBE] UserProfile-Req-012
> type: Requirement
> target: ChangePasswordFlow
> content: 新密码不能与最近3次使用过的历史密码相同。
```

#### 步骤 2: 设计阶段 (写在系统设计文档 SDD.md 中)

```yaml
#@Probe: UserProfile-Design-012
type: Design
target: validate_new_password(user_id, new_password)
context: [UserProfile-Req-012]
content: >
  1. 查询 PasswordHistory 表，获取该 user_id 最近的3条 hash 记录。
  2. 对比 new_password 的 hash。如有匹配则抛出 PasswordReuseException。
```

#### 步骤 3: 编码与测试阶段 (实施人员与 AI 的协同)

当 AI 工程师（如 Antigravity）被派发去编写 `validate_new_password` 函数时：

1. 人类在 IDE 中写下函数签名和探针 ID：
   ```python
   def validate_new_password(user_id, new_password):
       # @probe_ref: UserProfile-Design-012
       pass
   ```
2. AI 代理（通过 MCP 插件）扫描到 `@probe_ref: UserProfile-Design-012`。
3. AI 自动向“项目级碎片化知识商店”发起查询，拉取到该探针的具体内容（查近3次历史表、比对 hash、抛异常）。
4. AI 在这个**零幻觉**的强约束上下文中，输出高质量的实现代码，并顺手生成以该探针为验证基准的单元测试。
