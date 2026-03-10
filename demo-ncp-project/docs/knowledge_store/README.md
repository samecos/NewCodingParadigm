# 项目级知识商店 (Knowledge Store)

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
