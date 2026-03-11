# AI编程新范式：完整工具链方案

> 基于"AI编程新范式"概念，为AI项目开发团队设计的完整工具链配置方案

---

## 目录

1. [AI编程助手选型对比](#1-ai编程助手选型对比)
2. [MCP服务器配置方案](#2-mcp服务器配置方案)
3. [测试框架推荐](#3-测试框架推荐)
4. [知识库/RAG工具选型](#4-知识库rag工具选型)
5. [文档和数据探针工具](#5-文档和数据探针工具)
6. [完整工具链集成配置](#6-完整工具链集成配置)

---

## 1. AI编程助手选型对比

### 1.1 主流工具对比表

| 特性 | **Cursor** | **Windsurf** | **GitHub Copilot** | **Claude Code** |
|------|------------|--------------|-------------------|-----------------|
| **基础技术** | Claude 3.5 Sonnet, GPT-4 | 多模型支持 | OpenAI Codex, Claude 3.5 | Claude 3.5 Sonnet |
| **IDE类型** | VS Code Fork | VS Code Fork | 多IDE插件 | 命令行工具 |
| **代码补全** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐⭐ 优秀 | N/A |
| **多文件编辑** | ⭐⭐⭐⭐⭐ Composer模式 | ⭐⭐⭐⭐⭐ Cascade模式 | ⭐⭐⭐⭐ Agent模式 | ⭐⭐⭐⭐⭐ 支持 |
| **上下文理解** | ⭐⭐⭐⭐⭐ 深度感知 | ⭐⭐⭐⭐⭐ 深度感知 | ⭐⭐⭐⭐ 有限 | ⭐⭐⭐⭐⭐ 深度感知 |
| **自然语言命令** | ⭐⭐⭐⭐⭐ 高级 | ⭐⭐⭐⭐⭐ 高级 | ⭐⭐⭐ 有限 | ⭐⭐⭐⭐⭐ 高级 |
| **Agent模式** | ✅ Composer | ✅ Cascade | ✅ Agent | ✅ 原生支持 |
| **隐私模式** | ✅ 可用 | ✅ 可用 | ⚠️ Enterprise only | ✅ 可用 |
| **终端集成** | ⚠️ 有限 | ⚠️ 有限 | ❌ 不支持 | ⭐⭐⭐⭐⭐ 原生 |

### 1.2 定价对比

| 计划 | GitHub Copilot | Cursor | Windsurf | Claude Code |
|------|----------------|--------|----------|-------------|
| **免费版** | 60天试用 | 2000补全/月 + 50高级请求 | 两周试用 | 有限免费 |
| **个人月付** | $10/月 | $20/月 | $15/月 | $20/月 (Claude Pro) |
| **个人年付** | $100/年 | $240/年 | $180/年 | $240/年 |
| **团队版** | $19/用户/月 | $40/用户/月 | $30/用户/月 | 企业定制 |
| **企业版** | $39/用户/月 | 定制 | $60/用户/月 | 企业定制 |
| **学生/开源** | ✅ 免费 | ❌ | ❌ | ❌ |

### 1.3 选型建议

| 场景 | 推荐工具 | 理由 |
|------|----------|------|
| **个人开发者/预算敏感** | Windsurf | $15/月，功能接近Cursor |
| **复杂多文件项目** | Cursor | 最强的Composer多文件编辑 |
| **企业/安全优先** | GitHub Copilot | 成熟的企业安全特性 |
| **终端重度用户** | Claude Code | 原生终端集成，自主任务 |
| **多IDE切换** | GitHub Copilot | 支持VS Code/JetBrains/Neovim |
| **快速原型开发** | Cursor + Claude Code | 组合使用，效率最大化 |

### 1.4 安装命令

```bash
# Cursor
# 下载: https://cursor.sh/
# macOS
brew install --cask cursor

# Windsurf
# 下载: https://codeium.com/windsurf
# macOS
brew install --cask windsurf

# GitHub Copilot (VS Code扩展)
# 在VS Code扩展商店搜索 "GitHub Copilot"

# Claude Code
npm install -g @anthropic-ai/claude-code
```

---

## 2. MCP服务器配置方案

### 2.1 MCP简介

**Model Context Protocol (MCP)** 是Anthropic于2024年底推出的开放标准，定义AI Agent如何以标准化方式连接外部数据源、工具和服务。MCP允许AI Agent直接与数据库、应用程序和其他资源"对话"。

### 2.2 推荐MCP服务器列表

| 服务器 | 用途 | 语言 | GitHub Stars |
|--------|------|------|--------------|
| **GitHub MCP** | 代码仓库管理 | Go | 3000+ |
| **PostgreSQL MCP** | 数据库查询 | Python | 800+ |
| **Notion MCP** | 文档管理 | TypeScript | 1200+ |
| **Slack MCP** | 团队通讯 | Python | 600+ |
| **Brave Search MCP** | 网络搜索 | Python | 900+ |
| **Filesystem MCP** | 文件操作 | TypeScript | 1500+ |
| **Puppeteer MCP** | 浏览器自动化 | TypeScript | 700+ |

### 2.3 Cursor MCP配置

创建 `.cursor/mcp.json` 文件：

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "${NOTION_TOKEN}"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    }
  }
}
```

### 2.4 Claude Desktop MCP配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "weather": {
      "command": "python3",
      "args": ["/path/to/weather_mcp_server.py"]
    },
    "sqlite": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "${DB_PATH}:/data.db",
        "mcp/sqlite",
        "/data.db"
      ]
    }
  }
}
```

### 2.5 自定义MCP服务器示例

```python
# custom_mcp_server.py
from mcp.server.fastmcp import FastMCP
import httpx

mcp = FastMCP("my-custom-server")

@mcp.tool()
async def search_codebase(query: str) -> str:
    """Search the codebase for relevant code snippets."""
    # 实现代码搜索逻辑
    results = await search_local_codebase(query)
    return format_results(results)

@mcp.tool()
async def generate_tests(file_path: str) -> str:
    """Generate unit tests for the specified file."""
    code = read_file(file_path)
    tests = await ai_generate_tests(code)
    return tests

@mcp.resource("docs://api-reference")
def get_api_docs() -> str:
    """Return API documentation."""
    return load_api_documentation()

if __name__ == "__main__":
    mcp.run()
```

---

## 3. 测试框架推荐

### 3.1 AI测试生成工具对比

| 工具 | 支持语言 | 特点 | 价格 |
|------|----------|------|------|
| **GitHub Copilot** | 多语言 | 实时测试建议，Agent模式自动修复 | $10/月起 |
| **Diffblue Cover** | Java/Kotlin | 静态分析，自动生成JUnit测试 | 企业定价 |
| **Ponicode (CircleCI)** | JS/Python | 一键生成Jest/PyTest | CI集成 |
| **Codeium/Qodo** | Python/JS/Java | 意图感知测试生成 | 免费/付费 |
| **TestGPT** | 多语言 | 开源CLI，支持本地LLM | 免费 |

### 3.2 按语言推荐测试框架

#### Python

```bash
# 安装
pip install pytest pytest-asyncio pytest-cov pytest-mock

# AI测试生成插件
pip install pytest-sugar  # 美化输出
pip install pytest-xdist  # 并行执行
```

```python
# test_example.py - AI友好的测试结构
import pytest
from unittest.mock import Mock, patch

class TestUserService:
    """Test suite for UserService."""
    
    @pytest.fixture
    def mock_db(self):
        return Mock()
    
    @pytest.fixture  
    def user_service(self, mock_db):
        from myapp.services import UserService
        return UserService(db=mock_db)
    
    def test_create_user_success(self, user_service, mock_db):
        """Test successful user creation."""
        # Arrange
        mock_db.insert.return_value = {"id": 1, "name": "Alice"}
        
        # Act
        result = user_service.create_user("Alice")
        
        # Assert
        assert result["id"] == 1
        mock_db.insert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_fetch_user_async(self, user_service):
        """Test async user fetch."""
        result = await user_service.fetch_user(1)
        assert result is not None
```

#### JavaScript/TypeScript

```bash
# 安装
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/react @testing-library/jest-dom

# AI测试生成支持
npm install --save-dev jest-ai  # AI辅助断言
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // AI友好的配置
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

```typescript
// user.service.test.ts - AI友好的测试结构
describe('UserService', () => {
  let service: UserService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
      find: jest.fn(),
    } as any;
    service = new UserService(mockDb);
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = { name: 'Alice', email: 'alice@example.com' };
      mockDb.insert.mockResolvedValue({ id: 1, ...userData });

      // Act
      const result = await service.createUser(userData);

      // Assert
      expect(result.id).toBe(1);
      expect(mockDb.insert).toHaveBeenCalledWith('users', userData);
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      mockDb.insert.mockRejectedValue(new Error('Duplicate'));

      // Act & Assert
      await expect(service.createUser({ email: 'dup@example.com' }))
        .rejects.toThrow('User already exists');
    });
  });
});
```

### 3.3 AI驱动的测试工作流

```yaml
# .github/workflows/ai-tests.yml
name: AI-Generated Tests

on: [push, pull_request]

jobs:
  generate-and-run-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate missing tests with AI
        run: |
          # 使用AI工具检测未测试的代码并生成测试
          npx ai-test-generator --coverage-threshold=80
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 4. 知识库/RAG工具选型

### 4.1 RAG架构组件对比

| 组件 | 工具 | 特点 | 适用场景 |
|------|------|------|----------|
| **向量数据库** | Pinecone | 托管服务，快速启动 | 初创团队 |
| **向量数据库** | Weaviate | 开源，混合搜索 | 高级用例 |
| **向量数据库** | Qdrant | Rust编写，高性能 | 性能关键型 |
| **向量数据库** | Chroma | 轻量级，Python原生 | 原型开发 |
| **Embedding** | OpenAI text-embedding-3 | 高质量，1536维 | 通用场景 |
| **Embedding** | Cohere Embed | 多语言优化 | 国际化项目 |
| **Embedding** | Ollama本地模型 | 隐私优先 | 敏感数据 |

### 4.2 RAG完整方案推荐

#### 方案A：快速启动（Pinecone + OpenAI）

```python
# rag_setup.py
from pinecone import Pinecone, ServerlessSpec
import openai

# 初始化
pc = Pinecone(api_key="YOUR_PINECONE_API_KEY")
openai.api_key = "YOUR_OPENAI_API_KEY"

# 创建索引
index_name = "project-knowledge-base"
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

index = pc.Index(index_name)

def embed_text(text: str) -> list:
    """Generate embedding for text."""
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def add_document(doc_id: str, content: str, metadata: dict = None):
    """Add document to knowledge base."""
    embedding = embed_text(content)
    index.upsert(vectors=[{
        "id": doc_id,
        "values": embedding,
        "metadata": metadata or {"content": content}
    }])

def search_knowledge_base(query: str, top_k: int = 5) -> list:
    """Search knowledge base for relevant documents."""
    query_embedding = embed_text(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return results.matches
```

#### 方案B：本地部署（Chroma + Ollama）

```python
# local_rag.py
import chromadb
from chromadb.config import Settings

# 本地Chroma客户端
chroma_client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chroma_db"
))

# 创建集合
collection = chroma_client.create_collection(
    name="project_docs",
    metadata={"hnsw:space": "cosine"}
)

# 使用Ollama生成本地embedding
def get_local_embedding(text: str) -> list:
    import requests
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]

def add_to_knowledge_base(doc_id: str, content: str):
    """Add document using local embeddings."""
    embedding = get_local_embedding(content)
    collection.add(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[content],
        metadatas=[{"source": "project_docs"}]
    )
```

### 4.3 开源RAG框架

| 框架 | 特点 | GitHub Stars |
|------|------|--------------|
| **LangChain** | 完整的RAG管道，生态丰富 | 95k+ |
| **LlamaIndex** | 专注于数据索引和检索 | 38k+ |
| **Haystack** | 企业级搜索管道 | 15k+ |
| **Kotaemon** | 可定制的RAG UI | 12k+ |
| **DB-GPT** | 蚂蚁开源，支持GraphRAG | 15k+ |

```python
# 使用LlamaIndex的RAG示例
from llama_index import VectorStoreIndex, SimpleDirectoryReader
from llama_index.embeddings import OpenAIEmbedding

# 加载文档
documents = SimpleDirectoryReader("./docs").load_data()

# 创建索引
index = VectorStoreIndex.from_documents(
    documents,
    embed_model=OpenAIEmbedding()
)

# 创建查询引擎
query_engine = index.as_query_engine()

# 查询
response = query_engine.query("项目的主要架构是什么？")
print(response)
```

---

## 5. 文档和数据探针工具

### 5.1 文档工具对比

| 工具 | 类型 | 特点 | 最佳用途 |
|------|------|------|----------|
| **Notion** | 协作文档 | 数据库+文档，AI集成 | 团队知识库 |
| **Obsidian** | 本地笔记 | 双向链接，图谱视图 | 个人知识管理 |
| **MkDocs** | 静态站点 | Markdown驱动，主题丰富 | 项目文档站点 |
| **Docusaurus** | 静态站点 | React-based，版本控制 | 开源项目文档 |
| **Sphinx** | 文档生成 | Python生态，API文档 | Python项目 |
| **ReadMe** | 托管文档 | API文档，交互式 | API产品文档 |

### 5.2 数据探针设计

数据探针是在代码和文档中嵌入的标记，帮助AI工具定位和理解项目结构。

#### 探针标记规范

```python
# === AI-PROBE: MODULE_START ===
# @module: user_service
# @description: 用户管理核心服务
# @dependencies: database, auth_service
# @ai-context: 处理用户CRUD操作，包含验证逻辑
# === AI-PROBE: MODULE_END ===

class UserService:
    """
    [AI-DOCS]
    category: Service Layer
    related: User, UserRepository, AuthService
    test-coverage: required
    
    用户服务类，处理所有与用户相关的业务逻辑。
    [AI-DOCS-END]
    """
    
    # === AI-PROBE: METHOD_START ===
    # @method: create_user
    # @description: 创建新用户
    # @parameters: user_data (dict)
    # @returns: User object
    # @errors: DuplicateUserError, ValidationError
    # === AI-PROBE: METHOD_END ===
    def create_user(self, user_data: dict) -> User:
        """Create a new user with validation."""
        pass
```

```typescript
// === AI-PROBE: COMPONENT_START ===
// @component: UserProfile
// @description: 用户资料展示组件
// @props: userId, editable
// @dependencies: UserService, AvatarComponent
// === AI-PROBE: COMPONENT_END ===

interface UserProfileProps {
  userId: string;
  editable?: boolean;
}

/**
 * [AI-DOCS]
 * category: UI Component
 * related: UserSettings, AvatarComponent
 * test-coverage: required
 * 
 * 用户资料组件，支持编辑模式。
 * [AI-DOCS-END]
 */
export const UserProfile: React.FC<UserProfileProps> = ({ userId, editable }) => {
  // ...
};
```

### 5.3 探针解析工具

```python
# probe_parser.py
import re
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class AIProbe:
    probe_type: str
    name: str
    properties: dict
    start_line: int
    end_line: int

class ProbeParser:
    """Parse AI probe markers from source code."""
    
    PROBE_PATTERN = re.compile(
        r'# === AI-PROBE: (\w+) ===\n'
        r'((?:# @\w+: .*\n)+)'
        r'# === AI-PROBE: \w+ ===',
        re.MULTILINE
    )
    
    DOC_PATTERN = re.compile(
        r'\[AI-DOCS\](.*?)\[AI-DOCS-END\]',
        re.DOTALL
    )
    
    def parse_file(self, filepath: str) -> List[AIProbe]:
        """Parse all probes from a file."""
        with open(filepath, 'r') as f:
            content = f.read()
            lines = content.split('\n')
        
        probes = []
        for match in self.PROBE_PATTERN.finditer(content):
            probe_type = match.group(1)
            props_text = match.group(2)
            
            # Parse properties
            properties = {}
            for prop_match in re.finditer(r'# @(\w+): (.*)', props_text):
                properties[prop_match.group(1)] = prop_match.group(2).strip()
            
            # Calculate line numbers
            start_pos = match.start()
            start_line = content[:start_pos].count('\n') + 1
            end_line = start_line + match.group(0).count('\n')
            
            probes.append(AIProbe(
                probe_type=probe_type,
                name=properties.get('module') or properties.get('method') or properties.get('component'),
                properties=properties,
                start_line=start_line,
                end_line=end_line
            ))
        
        return probes
    
    def generate_context(self, filepath: str) -> str:
        """Generate AI-friendly context from probes."""
        probes = self.parse_file(filepath)
        
        context = f"# File: {filepath}\n\n"
        for probe in probes:
            context += f"## {probe.name} ({probe.probe_type})\n"
            for key, value in probe.properties.items():
                context += f"- **{key}**: {value}\n"
            context += f"- **Location**: lines {probe.start_line}-{probe.end_line}\n\n"
        
        return context

# 使用示例
parser = ProbeParser()
probes = parser.parse_file("src/services/user_service.py")
context = parser.generate_context("src/services/user_service.py")
print(context)
```

### 5.4 AGENTS.md规范

在项目根目录创建 `AGENTS.md` 文件，为AI助手提供项目级指导：

```markdown
# AGENTS.md - AI Assistant Project Guidelines

## Project Overview

- **Name**: MyAwesomeProject
- **Language**: Python 3.10+
- **Framework**: FastAPI + SQLAlchemy
- **Architecture**: Clean Architecture / Hexagonal

## Coding Standards

### Python

- Assume minimum Python version is 3.10
- Prefer async libraries and functions over synchronous ones
- Always define dependencies in `pyproject.toml`
- Use keyword arguments instead of positional arguments
- Do not put `import` statements inside functions unless necessary
- Follow PEP 8 style guide

### Testing

- Use pytest for all tests
- Maintain minimum 80% code coverage
- Write tests before implementing features (TDD)
- Mock external dependencies

### Documentation

- All public functions must have docstrings
- Use Google-style docstrings
- Keep README.md up to date

## Project Structure

```
myproject/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
├── scripts/       # Utility scripts
└── config/        # Configuration files
```

## Common Commands

```bash
# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest --cov=src --cov-report=html

# Format code
black src/ tests/
ruff check src/ tests/

# Type check
mypy src/
```

## AI Probe Locations

- Service layer: `src/services/`
- API routes: `src/api/`
- Database models: `src/models/`
```

---

## 6. 完整工具链集成配置

### 6.1 VS Code/Cursor 完整配置

```json
// .vscode/settings.json
{
  // === AI Assistant Settings ===
  "cursor.aiRules": "${workspaceFolder}/AGENTS.md",
  "cursor.enableAutoImport": true,
  "cursor.aiPreview": true,
  
  // === Editor Settings ===
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll": "explicit"
  },
  "editor.rulers": [80, 120],
  "editor.wordWrap": "wordWrapColumn",
  "editor.wordWrapColumn": 120,
  
  // === Python Settings ===
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  
  // === TypeScript/JavaScript Settings ===
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "javascript.updateImportsOnFileMove.enabled": "always",
  
  // === Linting & Formatting ===
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.ruffEnabled": true,
  "python.linting.mypyEnabled": true,
  
  // === File Associations ===
  "files.associations": {
    "*.py": "python",
    "*.test.ts": "typescript",
    "AGENTS.md": "markdown"
  },
  
  // === Search Settings ===
  "search.exclude": {
    "**/.git": true,
    "**/.venv": true,
    "**/__pycache__": true,
    "**/node_modules": true,
    "**/.pytest_cache": true,
    "**/coverage": true
  },
  
  // === Git Settings ===
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.autofetch": true,
  
  // === Terminal Settings ===
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.cwd": "${workspaceFolder}",
  
  // === Extensions Recommendations ===
  "extensions.ignoreRecommendations": false
}
```

### 6.2 项目结构模板

```
ai-project-template/
├── .cursor/
│   └── mcp.json              # Cursor MCP配置
├── .vscode/
│   ├── settings.json         # VS Code设置
│   ├── extensions.json       # 推荐扩展
│   └── launch.json           # 调试配置
├── src/
│   ├── __init__.py
│   ├── services/             # 业务逻辑层
│   │   ├── __init__.py
│   │   └── user_service.py   # 带AI探针
│   ├── api/                  # API路由
│   │   ├── __init__.py
│   │   └── routes/
│   ├── models/               # 数据模型
│   ├── repositories/         # 数据访问层
│   └── utils/                # 工具函数
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # pytest fixtures
│   ├── unit/                 # 单元测试
│   └── integration/          # 集成测试
├── docs/
│   ├── api/                  # API文档
│   ├── architecture/         # 架构文档
│   └── guides/               # 使用指南
├── scripts/
│   ├── setup.sh              # 项目初始化
│   └── probe_parser.py       # 探针解析工具
├── knowledge_base/           # RAG知识库
│   ├── embeddings/           # 向量数据
│   └── documents/            # 源文档
├── .github/
│   └── workflows/
│       ├── test.yml          # 测试工作流
│       └── ai-tests.yml      # AI生成测试
├── AGENTS.md                 # AI助手指南
├── pyproject.toml            # Python项目配置
├── pytest.ini               # pytest配置
├── README.md                 # 项目说明
├── .gitignore
└── docker-compose.yml        # 开发环境
```

### 6.3 Docker开发环境

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/.venv
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
    depends_on:
      - db
      - redis
    command: uvicorn src.main:app --reload --host 0.0.0.0

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  chroma:
    image: chromadb/chroma:latest
    volumes:
      - chroma_data:/chroma/chroma
    ports:
      - "8001:8000"

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

volumes:
  postgres_data:
  chroma_data:
  ollama_data:
```

### 6.4 一键初始化脚本

```bash
#!/bin/bash
# scripts/setup.sh - 项目初始化脚本

set -e

echo "🚀 Initializing AI Project Development Environment..."

# 检查依赖
echo "📋 Checking dependencies..."
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is recommended but not required."; }

# 创建虚拟环境
echo "🐍 Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

# 安装Python依赖
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -e ".[dev]"

# 安装Node依赖
echo "📦 Installing Node dependencies..."
npm install

# 设置Git hooks
echo "🪝 Setting up Git hooks..."
npx husky install

# 创建环境文件
echo "🔧 Creating environment files..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please update .env with your API keys"
fi

# 启动Docker服务
echo "🐳 Starting Docker services..."
docker-compose up -d db redis chroma

# 等待数据库就绪
echo "⏳ Waiting for database..."
sleep 5

# 运行数据库迁移
echo "🔄 Running database migrations..."
alembic upgrade head

# 初始化RAG知识库
echo "📚 Initializing knowledge base..."
python scripts/init_knowledge_base.py

# 运行测试
echo "🧪 Running tests..."
pytest --cov=src --cov-report=html -q

echo ""
echo "✅ Setup complete! Next steps:"
echo "   1. Update .env with your API keys"
echo "   2. Run 'docker-compose up' to start all services"
echo "   3. Open the project in Cursor/VS Code"
echo "   4. Check AGENTS.md for AI assistant guidelines"
echo ""
echo "🎉 Happy coding with AI!"
```

### 6.5 GitHub Actions工作流

```yaml
# .github/workflows/ai-dev-pipeline.yml
name: AI Development Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -e ".[dev]"
      
      - name: Run linters
        run: |
          black --check src/ tests/
          ruff check src/ tests/
          mypy src/
      
      - name: Check AI probes
        run: |
          python scripts/verify_probes.py

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -e ".[dev]"
      
      - name: Run tests with coverage
        run: |
          pytest --cov=src --cov-report=xml --cov-report=html
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  ai-test-generation:
    runs-on: ubuntu-latest
    needs: quality-checks
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -e ".[dev]"
          pip install ai-test-generator
      
      - name: Generate missing tests
        run: |
          # 检测未测试的代码并生成测试
          ai-test-generator --coverage-threshold=80 --auto-generate
      
      - name: Commit generated tests
        uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "🤖 Auto-generate tests for uncovered code"
          file_pattern: "tests/**/*.py"

  knowledge-base-sync:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Sync docs to knowledge base
        run: |
          python scripts/sync_docs_to_kb.py
        env:
          PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### 6.6 推荐VS Code扩展

```json
// .vscode/extensions.json
{
  "recommendations": [
    // AI Assistant
    "cursor.cursor",
    "github.copilot",
    "github.copilot-chat",
    "codeium.codeium",
    
    // Python
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "ms-python.black-formatter",
    "matangover.mypy",
    
    // JavaScript/TypeScript
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    
    // Testing
    "hbenl.vscode-test-explorer",
    "littlefoxteam.vscode-python-test-adapter",
    
    // Documentation
    "yzhang.markdown-all-in-one",
    "shd101wyy.markdown-preview-enhanced",
    "bierner.markdown-mermaid",
    
    // Git
    "eamodio.gitlens",
    "github.vscode-pull-request-github",
    
    // Utilities
    "usernamehw.errorlens",
    "aaron-bond.better-comments",
    "wayou.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    
    // Docker
    "ms-azuretools.vscode-docker",
    
    // Database
    "cweijan.vscode-database-client2"
  ],
  "unwantedRecommendations": []
}
```

---

## 7. 工具链选型决策树

```
开始选型
│
├─ 预算敏感？
│  ├─ 是 → Windsurf ($15/月) 或 GitHub Copilot ($10/月)
│  └─ 否 → 继续
│
├─ 需要多文件编辑/Agent模式？
│  ├─ 是 → Cursor 或 Windsurf
│  └─ 否 → GitHub Copilot
│
├─ 终端重度用户？
│  ├─ 是 → Claude Code
│  └─ 否 → 继续
│
├─ 企业/安全优先？
│  ├─ 是 → GitHub Copilot Enterprise
│  └─ 否 → Cursor Pro
│
└─ 推荐组合
   ├─ 个人开发者: Windsurf + Claude Code
   ├─ 小团队: Cursor Team + 自建MCP服务器
   └─ 企业: GitHub Copilot Enterprise + 本地RAG
```

---

## 8. 快速参考卡片

### 8.1 常用命令速查

```bash
# === Cursor/Windsurf ===
Cmd+K          # 打开AI命令面板
Cmd+L          # 打开AI聊天
Tab            # 接受AI建议
Cmd+I          # 内联编辑

# === Claude Code ===
claude         # 启动Claude Code
/claude help   # 查看帮助
/claude config # 配置设置

# === MCP ===
npx @modelcontextprotocol/server-filesystem /path  # 文件系统服务器
npx @modelcontextprotocol/server-postgres $DB_URL   # PostgreSQL服务器

# === 测试 ===
pytest -v                      # 详细输出
pytest --cov=src              # 覆盖率报告
pytest -x                     # 失败即停止
pytest -k "test_name"         # 运行特定测试

# === RAG ===
python scripts/init_kb.py     # 初始化知识库
python scripts/sync_docs.py   # 同步文档到知识库
```

### 8.2 配置文件位置

| 配置 | 位置 |
|------|------|
| Cursor MCP | `.cursor/mcp.json` |
| Claude Desktop MCP | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| VS Code设置 | `.vscode/settings.json` |
| AI助手指南 | `AGENTS.md` |
| Python项目 | `pyproject.toml` |
| pytest配置 | `pytest.ini` |

---

## 总结

本工具链方案围绕"AI编程新范式"核心概念，提供了从AI编程助手、MCP服务器、测试框架、RAG知识库到文档探针的完整解决方案。

**核心推荐组合：**
- **AI编程助手**: Cursor Pro ($20/月) 或 Windsurf ($15/月)
- **MCP服务器**: GitHub + PostgreSQL + Filesystem
- **测试框架**: pytest (Python) / Jest (JS)
- **RAG工具**: Pinecone + OpenAI Embedding
- **文档工具**: MkDocs + Obsidian

通过合理的工具选型和配置，可以显著提升AI辅助开发的效率和代码质量。

---

*文档生成时间: 2025年*
*版本: 1.0*
