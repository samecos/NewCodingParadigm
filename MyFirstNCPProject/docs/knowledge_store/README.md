# 项目级知识商店 (Knowledge Store)

本目录用于存放 AI 编程新范式下的所有机器可读"数据探针"。

请将需求文档 (PRD) 或架构设计文档 (SDD) 存放于此，并使用标准的 `YAML-in-Markdown` 语法标注探针。

## 文档列表

| 文档 | 说明 |
|------|------|
| PRD-001-Overview.md | 产品需求文档 - 定义功能需求探针 |
| SDD-001-Architecture.md | 系统设计文档 - 定义架构设计探针 |

## 探针格式规范

```yaml
#@Probe: [唯一标识符]
type: Requirement | Architecture
category: 分类
target: 目标模块
content: >
  详细的约束描述内容
constraints:
  - 约束条件1
  - 约束条件2
```

## 代码中的探针引用

在代码中通过以下方式引用探针：

```python
"""
@probe_ref: GS-Req-004
"""
def train_gaussian_model():
    ...
```

或在测试中断言探针约束：

```python
def test_psnr_constraint():
    """
    @probe_id: GS-Req-004
    验证 PSNR 性能指标约束: PSNR ≥ 30 dB
    """
    assert metrics.psnr >= 30.0
```
