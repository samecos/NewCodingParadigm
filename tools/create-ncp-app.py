import os
import sys
import argparse
from pathlib import Path

# --- 模板定义 ---

RULES_MD_TEMPLATE = """# 🤖 Project Meta-Rules: 新范式 AI 协同准则

**Identity 身份定义**：
你不再是一个简单的“代码补全器”。你是本项目的“架构执行者”与“规则守护者”。在编写任何具体业务代码前，你必须遵循以下范式：

**Rule 1: 无探针，不编码 (No Probe, No Code)**
- 在你生成任何业务函数前，必须首先检查是否有对应的『数据探针』（如 `@probe_id`）。
- 如果没有，你有权拒绝直接编写业务代码，并要求用户先提供 Requirement/Design 层面的 Markdown 探针定义。

**Rule 2: 测试即法律 (Tests as Law)**
- 所有的业务逻辑，必须先编写测试用例。
- 你的测试用例不仅要覆盖路径，必须显式断言『数据探针』中规定的业务约束条件。
- 业务代码的唯一目的是让这些承载了探针约束的测试用例通过。

**Rule 3: 寻求知识商店上下文 (Context Lookup)**
- 当你看到代码中有 `@probe_ref: [ID]` 时，不要自行脑补逻辑。
- 这意味着当前目录（或系统中）存在关于该 ID 的详细文档约束。请使用全局搜索或你的知识检索工具拉取该 ID 的 YAML/Markdown 定义，再进行后续操作。

**Rule 4: 语言约束**
- 我们之间的所有关于架构、设计、评审的交流语言必须为**中文**。
"""

WORKFLOW_TEMPLATE = """---
description: 基于数据探针的 TDD 开发微循环
---

当你接到一项具体的增量开发任务时，请严格按以下步骤执行：

1. **查探针**：使用 `grep_search` 或 MCP Query 搜索与任务目标相关的数据探针 (YAML/Markdown 格式)。
2. **写测试**：阅读探针的 `content` 约束，据此在测试目录生成测试文件，并写好针对该约束的断言逻辑。
3. **嵌标识**：在测试函数和即将编写的业务函数上方，打上 `@probe_id: xxx` 的注释标签。
4. **跑红蓝**：尝试运行测试（此时应失败，呈现红色）。
5. **填逻辑**：编写最小可用代码使测试通过（呈现绿色）。如有必要，在此过程调用重构。
6. **产报告**：总结受该探针约束的代码变更，并在当前阶段任务中进行 Check-off。
"""

KNOWLEDGE_STORE_README = """# 项目级知识商店 (Knowledge Store)

本目录用于存放 AI 编程新范式下的所有机器可读“数据探针”。
请将需求文档 (PRD) 或架构设计文档 (SDD) 存放于此，并使用标准的 `YAML-in-Markdown` 语法标注探针。

## 示例探针：
```yaml
#@Probe: Auth-Req-001
type: Requirement
target: login_flow
content: >
  登录函数必须接收 username 和 password。
  如果失败返回 False，成功返回 JWT 格式的字符串。
```
"""

MICRO_PACKAGE_PY = """def example_pure_function(a: int, b: int) -> int:
    \"\"\"
    示例纯函数单元。
    
    @probe_id: Math-Req-001
    \"\"\"
    # 请 AI 根据探针 Math-Req-001 和测试用例来填充实现
    pass
"""

MICRO_PACKAGE_TEST = """import pytest
from src.math_utils import example_pure_function

def test_example_pure_function():
    \"\"\"
    @probe_id: Math-Req-001
    \"\"\"
    # 遵循“测试即法律”原则，我们在 AI 填补逻辑前写好测试红绿灯
    assert example_pure_function(2, 3) == 5
    assert example_pure_function(-1, 1) == 0
"""


def create_scaffold(project_name: str, dest_dir: str = "."):
    """一键生成 AI 新范式项目骨架"""
    base_path = Path(dest_dir) / project_name
    
    print(f"🚀 开始在 {base_path.absolute()} 初始化【AI编程新范式】工程...")
    
    # 1. 创建基础目录树
    directories = [
        ".agents/workflows",
        "docs/knowledge_store",
        "src",
        "tests"
    ]
    
    for _dir in directories:
        (base_path / _dir).mkdir(parents=True, exist_ok=True)
        print(f"📁 创建目录: {_dir}")
        
    # 2. 注入核心元指令文件
    rules_path = base_path / ".ai-rules.md"
    rules_path.write_text(RULES_MD_TEMPLATE, encoding="utf-8")
    print("✅ 注入全局指令锁: .ai-rules.md")
    
    # 3. 注入标准工作流
    workflow_path = base_path / ".agents/workflows/probe_driven_dev.md"
    workflow_path.write_text(WORKFLOW_TEMPLATE, encoding="utf-8")
    print("✅ 注入智能体工作流: .agents/workflows/probe_driven_dev.md")
    
    # 4. 初始化知识商店 (探针库)
    store_readme = base_path / "docs/knowledge_store/README.md"
    store_readme.write_text(KNOWLEDGE_STORE_README, encoding="utf-8")
    print("✅ 初始化微型知识商店: docs/knowledge_store/README.md")
    
    # 5. 初始化微包 (Micro-package) 架构样例
    src_file = base_path / "src/math_utils.py"
    src_file.write_text(MICRO_PACKAGE_PY, encoding="utf-8")
    test_file = base_path / "tests/test_math_utils.py"
    test_file.write_text(MICRO_PACKAGE_TEST, encoding="utf-8")
    print("✅ 创建函数式“微包”模板: src/math_utils.py 及其测试。")
    
    print(f"\n🎉 恭喜！[{project_name}] 初始化完成。")
    print("AI 代理在进入该工程时，将会自动被 .ai-rules.md 降维打击，强制执行“探针驱动开发”。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a New Coding Paradigm Application")
    parser.add_argument("project_name", type=str, help="The name of your new AI-native project")
    parser.add_argument("--dir", type=str, default=".", help="Target directory")
    
    args = parser.parse_args()
    create_scaffold(args.project_name, args.dir)
