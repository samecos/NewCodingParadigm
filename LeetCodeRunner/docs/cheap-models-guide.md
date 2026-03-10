# 低成本模型配置指南

## GitHub Copilot 的真实情况

GitHub Copilot **无法直接作为 API 使用**，因为它：
- 没有公开的 REST API
- 只能在 IDE 内使用
- 有严格的速率限制

## 推荐方案（真正的低成本）

### 方案 1: Groq（强烈推荐）

**价格**: Llama 3 8B 仅 **$0.05/1M tokens**（GPT-3.5的1/10）
**速度**: 1000+ tokens/秒（比 GPT-4 快 10倍）
**免费额度**: $5/月 免费

```bash
# 1. 注册 https://console.groq.com/
# 2. 创建 API Key（免费）
# 3. 配置环境变量

$env:GROQ_API_KEY="gsk_your_key_here"
$env:GROQ_MODEL="llama3-8b-8192"

# 4. 运行批量生成
node scripts/batch-groq.js 0006 0500
```

**成本计算**:
- 生成 1000 题 TDD 桩
- 每题平均 2000 tokens
- 总计: 200万 tokens
- 成本: 200 * $0.05 = **$0.10（1毛钱）**

### 方案 2: Google Gemini（完全免费）

```bash
# 注册 https://ai.google.dev/
# 免费额度: 1500 requests/day

$env:GEMINI_API_KEY="your_key"
node scripts/batch-gemini.js 0006 0500
```

### 方案 3: 阿里云通义千问（国内友好）

```bash
# 注册 https://dashscope.aliyun.com/
# 免费额度: 100万 tokens

$env:DASHSCOPE_API_KEY="your_key"
node scripts/batch-qwen.js 0006 0500
```

## 快速配置

### Windows PowerShell

```powershell
# 创建配置文件
notepad $PROFILE

# 添加以下内容
$env:GROQ_API_KEY="gsk_your_key"
$env:GROQ_MODEL="llama3-8b-8192"

# 重新加载
. $PROFILE
```

### 验证配置

```bash
node -e "require('./scripts/groq-agent').callGroq('你好').then(console.log)"
```

## 模型对比

| 模型 | 价格/1M | 速度 | 质量 | 推荐场景 |
|------|---------|------|------|----------|
| Groq Llama 3 8B | $0.05 | 极速 | 中 | 批量生成 ✅ |
| Groq Mixtral 8x7B | $0.27 | 快 | 高 | 复杂题目 |
| Gemini 1.5 Flash | 免费 | 快 | 中 | 日常任务 |
| 通义千问 Turbo | 免费 | 中 | 中 | 中文题目 |

## 建议配置

**最优性价比组合**:
```bash
# 简单题目 (80%) - 最快最便宜
GROQ_MODEL="llama3-8b-8192"

# 复杂题目 (20%) - 质量更高
GROQ_MODEL="mixtral-8x7b-32768"
```

**成本预估**:
- 3000题 * 平均复杂度
- 预估 600万 tokens
- Groq 成本: **$0.30（3毛钱）**
