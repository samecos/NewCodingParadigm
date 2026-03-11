# AI项目开发团队工作流程设计

> 基于"AI编程新范式"的完整DevOps工作流

---

## 一、整体流程概览

```mermaid
flowchart TB
    subgraph 定义阶段["📋 定义阶段 (Definition Phase)"]
        D1[需求分析<br/>Requirements] --> D2[概要设计<br/>High-Level Design]
        D2 --> D3[详细设计<br/>Detailed Design]
        D3 --> D4[AI上下文固化<br/>AI Context固化]
        D4 --> D5[文档生成<br/>Documentation]
    end

    subgraph 测试验证阶段["🧪 测试验证阶段 (Test Phase)"]
        T1[测试代码编写<br/>Test Code] --> T2[测试数据集构建<br/>Test Dataset]
        T2 --> T3[验证程序开发<br/>Validation Program]
        T3 --> T4[数据探针埋入<br/>Data Probes]
    end

    subgraph 编码阶段["💻 编码阶段 (Coding Phase)"]
        C1[AI辅助代码生成<br/>AI Code Gen] --> C2[单元测试执行<br/>Unit Tests]
        C2 --> C3[覆盖率检查<br/>Coverage Check]
        C3 --> C4[代码审查<br/>Code Review]
    end

    subgraph 集成阶段["🔧 集成阶段 (Integration Phase)"]
        I1[自动化集成测试<br/>Auto Integration] --> I2[性能测试<br/>Performance]
        I2 --> I3[安全扫描<br/>Security Scan]
        I3 --> I4[部署验证<br/>Deploy Verify]
    end

    D5 -->|质量门禁| T1
    T4 -->|质量门禁| C1
    C4 -->|质量门禁| I1
    I4 -->|发布审批| REL[🚀 正式发布<br/>Release]

    %% 反馈循环
    C2 -.->|测试失败| C1
    I1 -.->|集成失败| C1
    T4 -.->|验证失败| D3
```

---

## 二、详细状态流转图

```mermaid
stateDiagram-v2
    [*] --> 需求分析: 项目启动
    
    需求分析 --> 概要设计: 需求评审通过
    需求分析 --> 需求分析: 评审不通过
    
    概要设计 --> 详细设计: 设计评审通过
    概要设计 --> 概要设计: 评审不通过
    
    详细设计 --> AI上下文固化: 设计完成
    AI上下文固化 --> 测试代码编写: 上下文就绪
    
    测试代码编写 --> 测试数据集构建: TDD驱动
    测试数据集构建 --> 验证程序开发: 数据就绪
    验证程序开发 --> 测试评审: 验证完成
    
    测试评审 --> AI代码生成: 评审通过
    测试评审 --> 测试代码编写: 评审不通过
    
    AI代码生成 --> 单元测试执行: 代码生成
    单元测试执行 --> 覆盖率检查: 测试执行
    
    覆盖率检查 --> AI代码生成: 覆盖率<85%
    覆盖率检查 --> 代码审查: 覆盖率≥85%
    
    代码审查 --> 集成测试: 审查通过
    代码审查 --> AI代码生成: 审查不通过
    
    集成测试 --> 性能测试: 集成通过
    集成测试 --> AI代码生成: 集成失败
    
    性能测试 --> 安全扫描: 性能达标
    性能测试 --> AI代码生成: 性能不达标
    
    安全扫描 --> 部署验证: 安全通过
    安全扫描 --> AI代码生成: 存在漏洞
    
    部署验证 --> 正式发布: 验证通过
    部署验证 --> AI代码生成: 验证失败
    
    正式发布 --> [*]: 发布完成
```

---

## 三、时序图：AI协作开发流程

```mermaid
sequenceDiagram
    participant PM as 产品经理
    participant Arch as 架构师
    participant AI as AI助手
    participant Dev as 开发工程师
    participant QA as 测试工程师
    participant CI as CI/CD系统

    %% 定义阶段
    rect rgb(230, 245, 255)
        Note over PM,AI: ===== 定义阶段 =====
        PM->>Arch: 提供业务需求
        Arch->>AI: 生成概要设计文档
        AI-->>Arch: 返回设计草案
        Arch->>Arch: 人工评审与修正
        Arch->>AI: 生成详细设计<br/>（函数/方法级别）
        AI-->>Arch: 返回详细设计
        Arch->>PM: 设计评审会议
        PM-->>Arch: 评审意见
    end

    %% 测试验证阶段
    rect rgb(255, 245, 230)
        Note over QA,AI: ===== 测试验证阶段 =====
        Arch->>QA: 传递设计文档<br/>（含AI上下文）
        QA->>AI: 生成测试代码框架
        AI-->>QA: 返回测试代码
        QA->>QA: 补充边界条件测试
        QA->>AI: 生成测试数据集
        AI-->>QA: 返回测试数据
        QA->>QA: 数据质量校验
        QA->>CI: 提交测试代码
    end

    %% 编码阶段
    rect rgb(230, 255, 230)
        Note over Dev,AI: ===== 编码阶段 =====
        Dev->>AI: 请求代码生成<br/>（基于设计+测试）
        AI-->>Dev: 返回实现代码
        Dev->>CI: 提交代码触发构建
        CI-->>Dev: 返回测试结果
        alt 测试失败
            Dev->>AI: 提供错误上下文
            AI-->>Dev: 返回修复代码
        else 覆盖率不足
            Dev->>AI: 请求补充测试
            AI-->>Dev: 返回补充测试
        end
        Dev->>Arch: 代码审查申请
        Arch-->>Dev: 审查意见
    end

    %% 集成阶段
    rect rgb(255, 230, 245)
        Note over CI,QA: ===== 集成阶段 =====
        CI->>CI: 自动化集成测试
        CI->>CI: 性能基准测试
        CI->>CI: 安全漏洞扫描
        CI->>QA: 测试报告
        QA->>PM: 验收确认
        PM-->>CI: 发布批准
        CI->>CI: 生产环境部署
    end
```

---

## 四、各阶段详细步骤与检查清单

### 4.1 定义阶段（Definition Phase）

#### 目标
- 将业务需求转化为AI可理解的技术规范
- 固化领域知识和设计约束
- 生成人类可读 + AI可解析的双模文档

#### 详细步骤

| 步骤 | 任务 | 负责人 | 输出物 |
|------|------|--------|--------|
| 1.1 | 业务需求收集与分析 | 产品经理 | 需求规格说明书 |
| 1.2 | 概要设计（架构层面） | 架构师 | 架构设计文档 |
| 1.3 | 详细设计（模块/函数级别） | 架构师+AI | 详细设计文档 |
| 1.4 | AI上下文固化 | 架构师 | `.ai-context/` 目录 |
| 1.5 | 数据探针设计 | 架构师 | 探针规范文档 |
| 1.6 | 设计评审会议 | 全团队 | 评审纪要 |

#### ✅ 检查清单

- [ ] 需求规格说明书已完成，包含功能/非功能需求
- [ ] 概要设计文档包含：系统架构图、模块划分、接口定义
- [ ] 详细设计文档颗粒度达到函数/方法级别
- [ ] 每个函数包含：输入参数、返回值、异常处理、复杂度分析
- [ ] `.ai-context/` 目录已创建，包含：
  - [ ] `domain-knowledge.md` - 领域知识汇总
  - [ ] `design-constraints.md` - 设计约束条件
  - [ ] `coding-standards.md` - 编码规范
  - [ ] `api-specifications.md` - API规范
- [ ] 数据探针位置已标记（使用 `<!-- AI-PROBE: xxx -->` 格式）
- [ ] 设计评审会议已召开，问题已闭环

---

### 4.2 测试验证阶段（Test Phase）

#### 目标
- 建立TDD驱动的测试体系
- 固化测试代码和验证程序
- 人的作用主要是评审

#### 详细步骤

| 步骤 | 任务 | 负责人 | 输出物 |
|------|------|--------|--------|
| 2.1 | 测试策略制定 | 测试负责人 | 测试策略文档 |
| 2.2 | 测试代码框架生成 | AI助手+测试工程师 | 测试代码框架 |
| 2.3 | 单元测试用例编写 | AI助手+测试工程师 | 单元测试代码 |
| 2.4 | 测试数据集构建 | 测试工程师 | 测试数据集 |
| 2.5 | 验证程序开发 | 测试工程师 | 验证程序 |
| 2.6 | 数据探针埋入 | 测试工程师 | 带探针的测试代码 |
| 2.7 | 测试评审 | 架构师+开发负责人 | 评审意见 |

#### ✅ 检查清单

- [ ] 测试策略文档已完成，包含：测试范围、测试方法、通过标准
- [ ] 单元测试覆盖所有函数/方法
- [ ] 测试用例包含：
  - [ ] 正常路径测试（Happy Path）
  - [ ] 边界条件测试
  - [ ] 异常处理测试
  - [ ] 性能基准测试
- [ ] 测试数据集已构建，包含：
  - [ ] 正向测试数据
  - [ ] 边界测试数据
  - [ ] 异常测试数据
- [ ] 验证程序可自动化执行
- [ ] 数据探针已埋入关键验证点
- [ ] 测试评审通过，问题已闭环

---

### 4.3 编码阶段（Coding Phase）

#### 目标
- AI辅助代码生成
- 单元测试覆盖率≥85%
- 提高测试代码和验证程序的健壮性

#### 详细步骤

| 步骤 | 任务 | 负责人 | 输出物 |
|------|------|--------|--------|
| 3.1 | AI代码生成请求 | 开发工程师 | 代码生成Prompt |
| 3.2 | 代码生成与审查 | AI助手+开发工程师 | 实现代码 |
| 3.3 | 单元测试执行 | CI系统 | 测试报告 |
| 3.4 | 覆盖率检查 | CI系统 | 覆盖率报告 |
| 3.5 | 代码静态分析 | CI系统 | 分析报告 |
| 3.6 | 代码审查 | 开发负责人 | 审查意见 |
| 3.7 | 测试代码强化 | 开发工程师 | 增强的测试代码 |

#### ✅ 检查清单

- [ ] 代码生成Prompt包含完整上下文（设计文档+测试代码）
- [ ] 实现代码符合编码规范
- [ ] 所有单元测试通过
- [ ] 代码覆盖率≥85%
  - [ ] 行覆盖率 ≥ 85%
  - [ ] 分支覆盖率 ≥ 80%
  - [ ] 函数覆盖率 ≥ 90%
- [ ] 静态代码分析无严重问题
  - [ ] 无高危漏洞
  - [ ] 无严重代码异味
  - [ ] 圈复杂度 < 15
- [ ] 代码审查通过
- [ ] 测试代码健壮性检查：
  - [ ] 测试用例独立，无相互依赖
  - [ ] 测试数据可重复生成
  - [ ] 测试清理逻辑完善

---

### 4.4 集成测试阶段（Integration Phase）

#### 目标
- 自动化测试环境验证
- 全链路质量门禁

#### 详细步骤

| 步骤 | 任务 | 负责人 | 输出物 |
|------|------|--------|--------|
| 4.1 | 集成测试环境准备 | DevOps工程师 | 测试环境 |
| 4.2 | 自动化集成测试 | CI系统 | 集成测试报告 |
| 4.3 | 性能测试 | CI系统 | 性能测试报告 |
| 4.4 | 安全扫描 | CI系统 | 安全扫描报告 |
| 4.5 | 部署验证 | CI系统 | 部署验证报告 |
| 4.6 | 发布审批 | 产品经理+架构师 | 发布批准 |
| 4.7 | 生产部署 | CI/CD系统 | 生产版本 |

#### ✅ 检查清单

- [ ] 集成测试环境就绪
- [ ] 自动化集成测试全部通过
  - [ ] API集成测试
  - [ ] 数据库集成测试
  - [ ] 第三方服务集成测试
- [ ] 性能测试达标
  - [ ] 响应时间满足SLA
  - [ ] 吞吐量满足预期
  - [ ] 资源使用率正常
- [ ] 安全扫描通过
  - [ ] 无高危漏洞
  - [ ] 无中危漏洞（或已评估接受）
  - [ ] 依赖组件无已知漏洞
- [ ] 部署验证通过
  - [ ] 健康检查通过
  - [ ] 冒烟测试通过
  - [ ] 回滚方案就绪
- [ ] 发布审批完成

---

## 五、质量门禁设计（Quality Gates）

### 5.1 门禁架构图

```mermaid
flowchart LR
    subgraph Gate1["🚪 Gate 1: 定义完成"]
        G1A[文档完整性]
        G1B[AI上下文就绪]
        G1C[设计评审通过]
    end

    subgraph Gate2["🚪 Gate 2: 测试就绪"]
        G2A[测试代码完整]
        G2B[测试数据就绪]
        G2C[测试评审通过]
    end

    subgraph Gate3["🚪 Gate 3: 编码完成"]
        G3A[单元测试通过]
        G3B[覆盖率≥85%]
        G3C[代码审查通过]
    end

    subgraph Gate4["🚪 Gate 4: 集成通过"]
        G4A[集成测试通过]
        G4B[性能达标]
        G4C[安全扫描通过]
    end

    subgraph Gate5["🚪 Gate 5: 发布批准"]
        G5A[验收通过]
        G5B[审批完成]
    end

    Gate1 --> Gate2 --> Gate3 --> Gate4 --> Gate5
```

### 5.2 门禁详细规则

#### Gate 1: 定义完成门禁

| 检查项 | 规则 | 权重 | 失败处理 |
|--------|------|------|----------|
| 需求文档完整性 | 必须包含功能/非功能需求 | 必须 | 阻塞 |
| 设计文档完整性 | 概要+详细设计齐全 | 必须 | 阻塞 |
| AI上下文完整性 | `.ai-context/` 目录存在且非空 | 必须 | 阻塞 |
| 数据探针完整性 | 关键位置已标记探针 | 建议 | 警告 |
| 设计评审状态 | 评审通过，问题已闭环 | 必须 | 阻塞 |

#### Gate 2: 测试就绪门禁

| 检查项 | 规则 | 权重 | 失败处理 |
|--------|------|------|----------|
| 测试代码存在 | 每个函数有对应测试 | 必须 | 阻塞 |
| 测试数据集存在 | 数据集文件存在且有效 | 必须 | 阻塞 |
| 测试可执行 | 测试可自动化运行 | 必须 | 阻塞 |
| 测试评审状态 | 评审通过 | 必须 | 阻塞 |

#### Gate 3: 编码完成门禁

| 检查项 | 规则 | 权重 | 失败处理 |
|--------|------|------|----------|
| 单元测试通过 | 100%测试通过 | 必须 | 阻塞 |
| 行覆盖率 | ≥ 85% | 必须 | 阻塞 |
| 分支覆盖率 | ≥ 80% | 必须 | 阻塞 |
| 函数覆盖率 | ≥ 90% | 建议 | 警告 |
| 静态分析 | 无高危问题 | 必须 | 阻塞 |
| 代码审查 | 审查通过 | 必须 | 阻塞 |

#### Gate 4: 集成通过门禁

| 检查项 | 规则 | 权重 | 失败处理 |
|--------|------|------|----------|
| 集成测试通过 | 100%通过 | 必须 | 阻塞 |
| 性能测试 | 达标 | 必须 | 阻塞 |
| 安全扫描 | 无高危漏洞 | 必须 | 阻塞 |
| 部署验证 | 健康检查通过 | 必须 | 阻塞 |

#### Gate 5: 发布批准门禁

| 检查项 | 规则 | 权重 | 失败处理 |
|--------|------|------|----------|
| 验收测试 | 产品验收通过 | 必须 | 阻塞 |
| 发布审批 | 相关负责人签字 | 必须 | 阻塞 |
| 回滚方案 | 方案就绪 | 建议 | 警告 |

---

## 六、评审节点定义

### 6.1 评审矩阵

| 评审节点 | 评审内容 | 参与角色 | 评审标准 | 输出物 |
|----------|----------|----------|----------|--------|
| **需求评审** | 需求规格说明书 | PM, 架构师, 开发负责人 | 需求清晰、可测试、可实现 | 评审纪要 |
| **设计评审** | 概要+详细设计 | 架构师, 开发负责人, 测试负责人 | 设计合理、可扩展、可维护 | 评审纪要 |
| **测试评审** | 测试策略+测试代码 | 测试负责人, 架构师, 开发负责人 | 覆盖完整、用例有效 | 评审纪要 |
| **代码评审** | 实现代码 | 开发负责人, 架构师 | 符合规范、逻辑正确 | 审查意见 |
| **发布评审** | 全量交付物 | PM, 架构师, 测试负责人, DevOps | 质量达标、可发布 | 发布批准 |

### 6.2 评审流程图

```mermaid
flowchart TB
    subgraph 评审提交["📤 评审提交"]
        RS1[准备评审材料]
        RS2[创建评审请求]
        RS3[通知评审人]
    end

    subgraph 评审执行["🔍 评审执行"]
        RE1[评审人审阅]
        RE2[记录评审意见]
        RE3{是否通过?}
    end

    subgraph 评审闭环["✅ 评审闭环"]
        RC1[修改问题]
        RC2[重新提交]
        RC3[评审通过]
    end

    RS1 --> RS2 --> RS3 --> RE1 --> RE2 --> RE3
    RE3 -->|不通过| RC1 --> RC2 --> RS2
    RE3 -->|通过| RC3

    RC3 --> 归档[评审归档]
```

### 6.3 评审检查清单模板

#### 设计评审清单

```markdown
## 设计评审检查清单

### 基本信息
- 评审对象: [设计文档名称]
- 评审日期: [YYYY-MM-DD]
- 评审人: [姓名]

### 检查项

#### 架构层面
- [ ] 架构设计是否满足需求
- [ ] 模块划分是否合理
- [ ] 接口定义是否清晰
- [ ] 数据流设计是否正确

#### 详细设计
- [ ] 函数粒度是否合适
- [ ] 输入输出定义是否完整
- [ ] 异常处理是否考虑周全
- [ ] 复杂度是否在可控范围

#### AI上下文
- [ ] 领域知识是否完整
- [ ] 设计约束是否明确
- [ ] 编码规范是否清晰

#### 可测试性
- [ ] 设计是否便于测试
- [ ] 测试点是否可识别

### 评审结论
- [ ] 通过
- [ ] 有条件通过（需修改）
- [ ] 不通过

### 问题列表
1. [问题描述] - [严重程度] - [处理人]
```

---

## 七、CI/CD配置示例

### 7.1 GitHub Actions完整配置

```yaml
# .github/workflows/ai-dev-workflow.yml
name: AI Development Workflow

on:
  push:
    branches: [ main, develop, feature/* ]
  pull_request:
    branches: [ main, develop ]

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'
  COVERAGE_THRESHOLD: 85

jobs:
  # ============================================
  # Job 1: 定义阶段检查
  # ============================================
  definition-gate:
    name: 🚪 Gate 1 - Definition Check
    runs-on: ubuntu-latest
    outputs:
      passed: ${{ steps.check.outputs.passed }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check documentation completeness
        id: check
        run: |
          echo "🔍 Checking definition phase completeness..."
          
          # 检查设计文档存在
          if [ ! -f "docs/design/overview.md" ]; then
            echo "❌ Missing design overview document"
            exit 1
          fi
          
          # 检查AI上下文目录
          if [ ! -d ".ai-context" ]; then
            echo "❌ Missing .ai-context directory"
            exit 1
          fi
          
          # 检查数据探针标记
          PROBE_COUNT=$(grep -r "<!-- AI-PROBE:" docs/ .ai-context/ 2>/dev/null | wc -l)
          echo "📍 Found $PROBE_COUNT AI probes"
          
          if [ "$PROBE_COUNT" -lt 5 ]; then
            echo "⚠️ Warning: Less than 5 AI probes found"
          fi
          
          echo "passed=true" >> $GITHUB_OUTPUT
          echo "✅ Definition gate passed"

  # ============================================
  # Job 2: 测试验证阶段
  # ============================================
  test-validation:
    name: 🧪 Gate 2 - Test Validation
    runs-on: ubuntu-latest
    needs: definition-gate
    if: needs.definition-gate.outputs.passed == 'true'
    outputs:
      passed: ${{ steps.validate.outputs.passed }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install pytest pytest-cov

      - name: Validate test completeness
        id: validate
        run: |
          echo "🔍 Validating test completeness..."
          
          # 检查测试目录存在
          if [ ! -d "tests" ]; then
            echo "❌ Missing tests directory"
            exit 1
          fi
          
          # 检查测试数据存在
          if [ ! -d "tests/data" ]; then
            echo "⚠️ Warning: Missing tests/data directory"
          fi
          
          # 统计测试文件数量
          TEST_FILES=$(find tests -name "test_*.py" | wc -l)
          echo "📝 Found $TEST_FILES test files"
          
          if [ "$TEST_FILES" -lt 1 ]; then
            echo "❌ No test files found"
            exit 1
          fi
          
          echo "passed=true" >> $GITHUB_OUTPUT
          echo "✅ Test validation gate passed"

  # ============================================
  # Job 3: 编码阶段 - 单元测试与覆盖率
  # ============================================
  unit-tests:
    name: 💻 Gate 3 - Unit Tests & Coverage
    runs-on: ubuntu-latest
    needs: test-validation
    if: needs.test-validation.outputs.passed == 'true'
    outputs:
      coverage: ${{ steps.coverage.outputs.coverage }}
      passed: ${{ steps.coverage.outputs.passed }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-html

      - name: Run unit tests
        run: |
          pytest tests/ -v --tb=short

      - name: Generate coverage report
        id: coverage
        run: |
          pytest --cov=src --cov-report=xml --cov-report=html --cov-report=term tests/
          
          # 提取覆盖率数值
          COVERAGE=$(grep -o 'total.*[0-9]\+%' coverage.xml | grep -o '[0-9]\+' | head -1)
          echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT
          
          echo "📊 Coverage: $COVERAGE%"
          
          # 检查覆盖率阈值
          if [ "$COVERAGE" -lt ${{ env.COVERAGE_THRESHOLD }} ]; then
            echo "❌ Coverage $COVERAGE% is below threshold ${{ env.COVERAGE_THRESHOLD }}%"
            echo "passed=false" >> $GITHUB_OUTPUT
            exit 1
          fi
          
          echo "passed=true" >> $GITHUB_OUTPUT
          echo "✅ Coverage gate passed"

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: htmlcov/

  # ============================================
  # Job 4: 静态代码分析
  # ============================================
  static-analysis:
    name: 🔍 Static Code Analysis
    runs-on: ubuntu-latest
    needs: test-validation
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install linters
        run: |
          pip install flake8 pylint bandit black

      - name: Run flake8
        run: |
          flake8 src/ --max-line-length=100 --statistics

      - name: Run pylint
        run: |
          pylint src/ --disable=C,R --fail-under=8.0

      - name: Run security scan (bandit)
        run: |
          bandit -r src/ -f json -o bandit-report.json || true
          bandit -r src/ -ll

      - name: Check code formatting
        run: |
          black --check src/ tests/

  # ============================================
  # Job 5: 集成测试
  # ============================================
  integration-tests:
    name: 🔧 Gate 4 - Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-tests, static-analysis]
    if: needs.unit-tests.outputs.passed == 'true'
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
        run: |
          pytest tests/integration/ -v --tb=short

  # ============================================
  # Job 6: 性能测试
  # ============================================
  performance-tests:
    name: ⚡ Performance Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install locust

      - name: Run performance benchmark
        run: |
          # 运行性能基准测试
          python -m pytest tests/performance/ -v

      - name: Upload performance report
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: performance-report/

  # ============================================
  # Job 7: 安全扫描
  # ============================================
  security-scan:
    name: 🔒 Security Scan
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Check for high severity vulnerabilities
        run: |
          # 检查高危漏洞
          HIGH_VULNS=$(grep -c "HIGH" trivy-results.sarif || echo "0")
          CRITICAL_VULNS=$(grep -c "CRITICAL" trivy-results.sarif || echo "0")
          
          if [ "$CRITICAL_VULNS" -gt 0 ]; then
            echo "❌ Found $CRITICAL_VULNS CRITICAL vulnerabilities"
            exit 1
          fi
          
          if [ "$HIGH_VULNS" -gt 5 ]; then
            echo "⚠️ Found $HIGH_VULNS HIGH vulnerabilities"
          fi

  # ============================================
  # Job 8: 构建与部署
  # ============================================
  build-and-deploy:
    name: 🚀 Build & Deploy
    runs-on: ubuntu-latest
    needs: [performance-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to staging
        run: |
          echo "🚀 Deploying to staging environment..."
          # 部署脚本

      - name: Run smoke tests
        run: |
          echo "🔥 Running smoke tests..."
          # 冒烟测试

      - name: Deploy to production
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          echo "🚀 Deploying to production..."
          # 生产部署脚本

  # ============================================
  # Job 9: 工作流总结
  # ============================================
  workflow-summary:
    name: 📊 Workflow Summary
    runs-on: ubuntu-latest
    needs: [build-and-deploy]
    if: always()
    steps:
      - name: Generate summary
        run: |
          echo "## 🎯 AI Development Workflow Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Gate | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Definition | ${{ needs.definition-gate.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Test Validation | ${{ needs.test-validation.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.unit-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Static Analysis | ${{ needs.static-analysis.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Integration Tests | ${{ needs.integration-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Performance Tests | ${{ needs.performance-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Security Scan | ${{ needs.security-scan.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Build & Deploy | ${{ needs.build-and-deploy.result }} |" >> $GITHUB_STEP_SUMMARY
```

### 7.2 GitLab CI配置示例

```yaml
# .gitlab-ci.yml
stages:
  - definition
  - test-validation
  - code-quality
  - testing
  - integration
  - security
  - deploy

variables:
  PYTHON_VERSION: "3.11"
  COVERAGE_THRESHOLD: "85"
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

cache:
  paths:
    - .cache/pip
    - venv/

# ============================================
# Stage 1: 定义阶段检查
# ============================================
definition-gate:
  stage: definition
  script:
    - echo "🔍 Checking definition phase completeness..."
    - |
      if [ ! -f "docs/design/overview.md" ]; then
        echo "❌ Missing design overview document"
        exit 1
      fi
    - |
      if [ ! -d ".ai-context" ]; then
        echo "❌ Missing .ai-context directory"
        exit 1
      fi
    - echo "✅ Definition gate passed"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 2: 测试验证
# ============================================
test-validation:
  stage: test-validation
  needs: [definition-gate]
  script:
    - echo "🧪 Validating test completeness..."
    - |
      if [ ! -d "tests" ]; then
        echo "❌ Missing tests directory"
        exit 1
      fi
    - TEST_COUNT=$(find tests -name "test_*.py" | wc -l)
    - echo "Found $TEST_COUNT test files"
    - |
      if [ "$TEST_COUNT" -lt 1 ]; then
        echo "❌ No test files found"
        exit 1
      fi
    - echo "✅ Test validation passed"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 3: 代码质量检查
# ============================================
lint:
  stage: code-quality
  image: python:$PYTHON_VERSION
  before_script:
    - pip install flake8 pylint black isort
  script:
    - flake8 src/ --max-line-length=100
    - black --check src/ tests/
    - isort --check-only src/ tests/
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 4: 单元测试与覆盖率
# ============================================
unit-tests:
  stage: testing
  image: python:$PYTHON_VERSION
  needs: [test-validation]
  before_script:
    - python -m venv venv
    - source venv/bin/activate
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
  script:
    - pytest --cov=src --cov-report=xml --cov-report=term tests/
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    paths:
      - coverage.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 5: 集成测试
# ============================================
integration-tests:
  stage: integration
  image: python:$PYTHON_VERSION
  needs: [unit-tests]
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_PASSWORD: test
    POSTGRES_DB: testdb
    DATABASE_URL: postgresql://postgres:test@postgres/testdb
    REDIS_URL: redis://redis:6379
  before_script:
    - pip install -r requirements.txt
    - pip install pytest
  script:
    - pytest tests/integration/ -v
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 6: 安全扫描
# ============================================
security-scan:
  stage: security
  image: aquasec/trivy:latest
  needs: [integration-tests]
  script:
    - trivy fs --exit-code 1 --severity HIGH,CRITICAL .
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# ============================================
# Stage 7: 构建与部署
# ============================================
build:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  needs: [security-scan]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

deploy-staging:
  stage: deploy
  image: alpine/k8s:latest
  needs: [build]
  script:
    - echo "Deploying to staging..."
    # kubectl apply -f k8s/staging/
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

deploy-production:
  stage: deploy
  image: alpine/k8s:latest
  needs: [deploy-staging]
  script:
    - echo "Deploying to production..."
    # kubectl apply -f k8s/production/
  environment:
    name: production
    url: https://production.example.com
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### 7.3 AI上下文配置模板

```yaml
# .ai-context/config.yaml
# AI开发助手配置

project:
  name: "AI Project Name"
  type: "microservice"  # microservice / monolith / library
  language: "python"
  framework: "fastapi"

context:
  # 领域知识文件
  domain_knowledge:
    - path: "domain/business-rules.md"
      priority: high
    - path: "domain/data-model.md"
      priority: high
  
  # 设计约束
  design_constraints:
    - path: "constraints/architecture.md"
    - path: "constraints/performance.md"
  
  # 编码规范
  coding_standards:
    - path: "standards/python-style.md"
    - path: "standards/api-design.md"
  
  # API规范
  api_specifications:
    - path: "api/openapi.yaml"
    - path: "api/graphql-schema.md"

# 数据探针配置
probes:
  enabled: true
  prefix: "<!-- AI-PROBE:"
  suffix: "-->"
  categories:
    - design
    - implementation
    - test
    - validation

# 代码生成配置
code_generation:
  test_first: true
  coverage_target: 85
  max_complexity: 15
  docstring_required: true
  type_hints: true

# 质量门禁
quality_gates:
  definition:
    required_files:
      - "docs/design/overview.md"
      - ".ai-context/config.yaml"
  
  test:
    min_test_files: 1
    required_data_sets: true
  
  code:
    min_coverage: 85
    max_complexity: 15
    no_high_severity_issues: true
  
  integration:
    all_tests_pass: true
    performance_baseline: true
    security_scan_pass: true
```

---

## 八、项目目录结构建议

```
project-root/
├── .ai-context/                    # AI上下文目录
│   ├── config.yaml                 # AI配置
│   ├── domain-knowledge.md         # 领域知识
│   ├── design-constraints.md       # 设计约束
│   ├── coding-standards.md         # 编码规范
│   └── api-specifications.md       # API规范
│
├── docs/                           # 文档目录
│   ├── design/                     # 设计文档
│   │   ├── overview.md             # 概要设计
│   │   ├── architecture.md         # 架构设计
│   │   └── modules/                # 模块详细设计
│   ├── requirements/               # 需求文档
│   └── api/                        # API文档
│
├── src/                            # 源代码
│   ├── __init__.py
│   ├── main.py
│   └── modules/                    # 业务模块
│
├── tests/                          # 测试目录
│   ├── unit/                       # 单元测试
│   ├── integration/                # 集成测试
│   ├── performance/                # 性能测试
│   └── data/                       # 测试数据
│       ├── fixtures/
│       └── expected/
│
├── .github/                        # GitHub配置
│   └── workflows/                  # CI/CD工作流
│       └── ai-dev-workflow.yml
│
├── scripts/                        # 脚本目录
│   ├── setup.sh
│   └── deploy.sh
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 九、快速启动指南

### 9.1 初始化项目

```bash
# 1. 克隆项目模板
git clone https://github.com/template/ai-project-template.git my-project
cd my-project

# 2. 初始化AI上下文
mkdir -p .ai-context
cat > .ai-context/config.yaml << 'EOF'
project:
  name: "My AI Project"
  type: "microservice"
  language: "python"
  framework: "fastapi"
EOF

# 3. 创建目录结构
mkdir -p docs/design/modules
mkdir -p tests/{unit,integration,performance,data}
mkdir -p src/modules

# 4. 安装依赖
pip install -r requirements.txt

# 5. 运行初始化检查
python scripts/validate-setup.py
```

### 9.2 开发工作流

```bash
# 1. 创建功能分支
git checkout -b feature/my-feature

# 2. 编写设计文档（定义阶段）
# 编辑 docs/design/modules/my-feature.md

# 3. 编写测试代码（测试验证阶段）
# 编辑 tests/unit/test_my_feature.py

# 4. AI辅助编码（编码阶段）
# 使用AI助手生成实现代码

# 5. 本地验证
pytest tests/unit/test_my_feature.py --cov=src

# 6. 提交代码
git add .
git commit -m "feat: add my-feature"
git push origin feature/my-feature

# 7. 创建PR，触发CI/CD
# CI会自动执行所有质量门禁
```

---

## 十、总结

本文档定义了基于"AI编程新范式"的完整开发工作流程，核心特点：

1. **AI上下文固化**：通过 `.ai-context/` 目录固化领域知识和设计约束
2. **TDD驱动**：测试先行，代码生成基于测试约束
3. **五级质量门禁**：定义→测试→编码→集成→发布
4. **自动化优先**：CI/CD流水线覆盖全流程
5. **人机协作**：AI负责生成，人类负责评审

### 关键指标

| 指标 | 目标值 |
|------|--------|
| 单元测试覆盖率 | ≥ 85% |
| 代码审查通过率 | 100% |
| 集成测试通过率 | 100% |
| 高危漏洞数 | 0 |
| 自动化部署频率 | 按需/每日 |

---

*文档版本: 1.0*
*最后更新: 2024年*
