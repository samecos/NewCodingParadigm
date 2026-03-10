# 多模型配置指南

## 目标
配置多个轻量级模型(GPT-3.5/Claude Haiku等)来加速TDD桩生成任务。

## 成本对比

| 模型 | 每1K tokens | 适合场景 |
|------|------------|---------|
| Claude Sonnet 4.6 | $3.00 | 复杂分析、架构设计 |
| GPT-3.5 Turbo | $0.50 | 格式转换、模板填充、简单提取 |
| Claude Haiku | $0.25 | 快速验证、简单分类 |
| 本地 Llama 3 8B | $0 | 批量处理、隐私敏感 |

**预期节省**: 使用 GPT-3.5 处理简单任务，成本降低约 **80%**

## 快速开始

### 1. 获取 OpenRouter API Key

1. 访问 https://openrouter.ai/
2. 注册账号并充值
3. 创建 API Key

### 2. 配置环境变量

```bash
# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxx"
$env:LIGHT_MODEL="gpt-3.5-turbo"

# 或者修改 .env.models 文件后加载
Get-Content .env.models | ForEach-Object {
    $name, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}
```

### 3. 运行轻量级批量生成

```bash
cd scripts

# 生成第6-100题
node batch-generate-light.js 0006 0100

# 生成第200-300题
node batch-generate-light.js 0200 0300
```

## Claude Code 中使用轻量级模型

### 方法: 任务分层策略

在派遣子Agent时，明确指定任务复杂度：

```
主 Agent (Claude Sonnet 4.6)
  ├── 复杂任务: 保持使用 Sonnet
  │   └── 分析算法、设计探针、处理边界情况
  └── 简单任务: 调用 GPT-3.5
      └── 格式转换、模板填充、生成标准测试用例
```

### 实际调用示例

在子 Agent 任务中，可以调用轻量级模型：

```javascript
// 子 Agent 任务中
const { generateProblemFiles } = require('./scripts/light-agent');

// 对于格式固定的任务，使用轻量级模型
if (isSimpleFormatTask(problem)) {
    const files = await generateProblemFiles(rawContent, problemNum);
} else {
    // 复杂任务使用当前模型继续处理
}
```

## 性能对比

### 单题生成速度

| 方式 | 耗时 | 质量 |
|------|------|------|
| Claude Sonnet | 15-30s | 高 |
| GPT-3.5 Turbo | 3-8s | 中 |
| 本地 Llama 3 | 1-5s | 低-中 |

### 批量处理建议

**小规模 (1-50题)**: 直接用当前模型，保证质量
**大规模 (100+题)**: 使用轻量级模型脚本并行处理

## 混合策略配置

创建 `agent-router.js` 自动分配：

```javascript
function routeTask(problemRaw) {
    const complexity = analyzeComplexity(problemRaw);

    if (complexity === 'simple') {
        return { model: 'gpt-3.5-turbo', strategy: 'fast' };
    } else if (complexity === 'medium') {
        return { model: 'gpt-3.5-turbo', strategy: 'careful' };
    } else {
        return { model: 'claude-sonnet', strategy: 'detailed' };
    }
}
```

## 故障排除

### API 限流
- 添加 `await sleep(1000)` 每10题
- 使用指数退避重试

### 质量下降
- 对复杂题使用当前模型复核
- 设置质量检查步骤

### 成本过高
- 切换到 Claude Haiku ($0.25/1K)
- 或本地部署 Llama 3

## 下一步

1. 申请 OpenRouter API Key
2. 测试 `node scripts/batch-generate-light.js 0006 0010`
3. 根据效果调整模型选择
