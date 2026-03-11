# 项目级碎片化知识商店技术方案

> 基于"AI编程新范式"概念的知识管理系统设计

---

## 一、系统架构设计

### 1.1 整体架构图

```mermaid
flowchart TB
    subgraph Input["📥 知识输入层"]
        A1[代码文件]
        A2[Markdown文档]
        A3[对话记录]
        A4[MCP Skills]
    end

    subgraph Processing["⚙️ 处理层"]
        B1[数据探针解析器]
        B2[代码AST分析]
        B3[文档分块器]
        B4[元数据提取器]
    end

    subgraph Storage["💾 存储层"]
        C1[(向量数据库<br/>Chroma/Milvus)]
        C2[(图数据库<br/>Neo4j)]
        C3[(关系数据库<br/>PostgreSQL)]
        C4[(对象存储<br/>MinIO)]
    end

    subgraph Retrieval["🔍 检索层"]
        D1[混合检索引擎]
        D2[重排序器]
        D3[上下文组装器]
    end

    subgraph Service["🚀 服务层"]
        E1[Knowledge Store API]
        E2[MCP Server]
        E3[上下文注入器]
    end

    subgraph Consumer["👤 消费层"]
        F1[AI Agent]
        F2[IDE插件]
        F3[Web界面]
    end

    A1 & A2 & A3 & A4 --> B1 & B2 & B3 & B4
    B1 & B2 & B3 & B4 --> C1 & C2 & C3 & C4
    C1 & C2 & C3 --> D1
    D1 --> D2 --> D3
    D3 --> E1 & E2 & E3
    E1 & E2 & E3 --> F1 & F2 & F3
```

### 1.2 核心组件说明

| 组件 | 功能 | 推荐技术 |
|------|------|----------|
| 向量数据库 | 语义检索 | Chroma, Milvus, Qdrant |
| 图数据库 | 关系推理 | Neo4j, NebulaGraph |
| 关系数据库 | 元数据管理 | PostgreSQL, SQLite |
| 对象存储 | 原始文件存储 | MinIO, S3 |
| 嵌入模型 | 文本向量化 | text-embedding-3, bge-m3 |
| 重排序模型 | 结果精排 | bge-reranker |

---

## 二、数据探针设计方案

### 2.1 数据探针格式规范

数据探针是在文档/代码中埋入的元数据标记，帮助AI快速定位和提取关键信息。

#### 2.1.1 文档级探针（Markdown）

```markdown
<!-- @probe:type=module -->
<!-- @probe:domain=authentication -->
<!-- @probe:tags=["auth", "jwt", "security"] -->
<!-- @probe:version=1.2.0 -->
<!-- @probe:author=team-backend -->
<!-- @probe:related=["user-service", "token-manager"] -->
<!-- @probe:dependencies=["jwt-library:v2.1"] -->

# 认证模块设计

<!-- @probe:type=function -->
<!-- @probe:name=validateToken -->
<!-- @probe:params=["token:string", "options:ValidateOptions"] -->
<!-- @probe:returns=Payload|Error -->
<!-- @probe:complexity=O(n) -->
<!-- @probe:test-coverage=94% -->

## 函数说明

验证JWT Token的有效性...
```

#### 2.1.2 代码级探针（多语言支持）

**TypeScript/JavaScript:**
```typescript
/**
 * @probe:type=function
 * @probe:domain=payment
 * @probe:tags=["stripe", "webhook", "async"]
 * @probe:complexity=high
 * @probe:critical-path=true
 * @probe:related=["PaymentService", "InvoiceGenerator"]
 * @probe:cache-strategy=5m
 * @probe:error-handling=["StripeError", "ValidationError"]
 */
async function processStripeWebhook(
  event: StripeEvent,
  signature: string
): Promise<WebhookResult> {
  // ...
}
```

**Python:**
```python
# @probe:type=class
# @probe:domain=data-processing
# @probe:tags=["etl", "pipeline", "batch"]
# @probe:inheritance=[BaseProcessor, Loggable]
# @probe:thread-safe=true
class DataTransformer:
    """数据转换器类"""
    pass
```

### 2.2 探针解析器实现

```python
# probe_parser.py
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum

class ProbeType(Enum):
    MODULE = "module"
    FUNCTION = "function"
    CLASS = "class"
    VARIABLE = "variable"
    TEST = "test"
    CONFIG = "config"
    WORKFLOW = "workflow"

@dataclass
class DataProbe:
    """数据探针实体"""
    probe_type: ProbeType
    location: str  # 文件路径:行号
    properties: Dict[str, Any]
    raw_content: str
    
class ProbeParser:
    """数据探针解析器"""
    
    # Markdown探针正则
    MD_PROBE_PATTERN = re.compile(
        r'<!--\s*@probe:(\w+)=(.+?)\s*-->',
        re.MULTILINE
    )
    
    # JSDoc/Docstring探针正则
    CODE_PROBE_PATTERN = re.compile(
        r'[@#]\s*@probe:(\w+)=(.+?)(?:\n|$)',
        re.MULTILINE
    )
    
    # Python注释探针正则
    PYTHON_PROBE_PATTERN = re.compile(
        r'#\s*@probe:(\w+)=(.+?)(?:\n|$)',
        re.MULTILINE
    )
    
    def parse_file(self, file_path: str, content: str) -> List[DataProbe]:
        """解析文件中的数据探针"""
        probes = []
        
        if file_path.endswith('.md'):
            probes.extend(self._parse_markdown(content, file_path))
        elif file_path.endswith(('.ts', '.tsx', '.js', '.jsx')):
            probes.extend(self._parse_jsdoc(content, file_path))
        elif file_path.endswith('.py'):
            probes.extend(self._parse_python(content, file_path))
            
        return probes
    
    def _parse_markdown(self, content: str, path: str) -> List[DataProbe]:
        """解析Markdown中的探针"""
        probes = []
        lines = content.split('\n')
        current_block = {}
        block_start_line = 0
        
        for i, line in enumerate(lines):
            match = self.MD_PROBE_PATTERN.match(line.strip())
            if match:
                key, value = match.groups()
                current_block[key] = self._parse_value(value)
                if block_start_line == 0:
                    block_start_line = i + 1
            elif current_block and line.strip() and not line.strip().startswith('<!--'):
                # 探针块结束，创建探针对象
                if 'type' in current_block:
                    probes.append(DataProbe(
                        probe_type=ProbeType(current_block['type']),
                        location=f"{path}:{block_start_line}",
                        properties=current_block,
                        raw_content='\n'.join(lines[block_start_line-1:i])
                    ))
                current_block = {}
                block_start_line = 0
                
        return probes
    
    def _parse_value(self, value: str) -> Any:
        """解析探针值（支持JSON格式）"""
        value = value.strip()
        if value.startswith('[') and value.endswith(']'):
            try:
                import json
                return json.loads(value)
            except:
                return [v.strip() for v in value[1:-1].split(',')]
        elif value.startswith('{') and value.endswith('}'):
            try:
                import json
                return json.loads(value)
            except:
                return value
        elif value.lower() in ('true', 'false'):
            return value.lower() == 'true'
        elif value.replace('.', '').isdigit():
            return float(value) if '.' in value else int(value)
        return value
```

---

## 三、知识存储结构设计

### 3.1 核心实体JSON Schema

#### 3.1.1 知识片段 (KnowledgeChunk)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "KnowledgeChunk",
  "type": "object",
  "required": ["id", "chunk_type", "content", "embedding", "metadata"],
  "properties": {
    "id": {
      "type": "string",
      "description": "唯一标识符",
      "pattern": "^chunk_[a-z0-9]{12}$"
    },
    "chunk_type": {
      "type": "string",
      "enum": ["code_function", "code_class", "documentation", "conversation", "config", "workflow", "mcp_skill"]
    },
    "content": {
      "type": "string",
      "description": "原始内容文本"
    },
    "embedding": {
      "type": "array",
      "items": { "type": "number" },
      "description": "向量嵌入（1536维或768维）"
    },
    "embedding_model": {
      "type": "string",
      "default": "text-embedding-3-small"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "source_file": { "type": "string" },
        "line_start": { "type": "integer" },
        "line_end": { "type": "integer" },
        "language": { "type": "string" },
        "project": { "type": "string" },
        "domain": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "probes": {
          "type": "array",
          "items": { "$ref": "#/definitions/DataProbe" }
        },
        "ast_signature": { "type": "string" },
        "dependencies": {
          "type": "array",
          "items": { "type": "string" }
        },
        "dependents": {
          "type": "array",
          "items": { "type": "string" }
        },
        "test_coverage": { "type": "number" },
        "complexity_score": { "type": "number" },
        "last_modified": { "type": "string", "format": "date-time" },
        "author": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "semantic_context": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" },
        "key_concepts": {
          "type": "array",
          "items": { "type": "string" }
        },
        "usage_patterns": {
          "type": "array",
          "items": { "type": "string" }
        },
        "common_errors": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "relationships": {
      "type": "object",
      "properties": {
        "parent_id": { "type": ["string", "null"] },
        "child_ids": {
          "type": "array",
          "items": { "type": "string" }
        },
        "related_ids": {
          "type": "array",
          "items": { "type": "string" }
        },
        "implements": {
          "type": "array",
          "items": { "type": "string" }
        },
        "extends": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  },
  "definitions": {
    "DataProbe": {
      "type": "object",
      "properties": {
        "probe_type": { "type": "string" },
        "location": { "type": "string" },
        "properties": { "type": "object" }
      }
    }
  }
}
```

#### 3.1.2 MCP Skill定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MCPSkill",
  "type": "object",
  "required": ["id", "name", "description", "tools"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^skill_[a-z0-9]{12}$"
    },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["code_generation", "code_review", "testing", "documentation", "refactoring", "debugging", "architecture"]
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "input_schema": { "type": "object" },
          "output_schema": { "type": "object" },
          "examples": {
            "type": "array",
            "items": { "type": "object" }
          }
        }
      }
    },
    "knowledge_dependencies": {
      "type": "array",
      "items": { "type": "string" },
      "description": "依赖的知识片段ID列表"
    },
    "context_templates": {
      "type": "array",
      "items": { "type": "string" }
    },
    "version": { "type": "string" },
    "author": { "type": "string" },
    "usage_stats": {
      "type": "object",
      "properties": {
        "call_count": { "type": "integer" },
        "success_rate": { "type": "number" },
        "avg_response_time": { "type": "number" }
      }
    }
  }
}
```

#### 3.1.3 项目上下文 (ProjectContext)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProjectContext",
  "type": "object",
  "required": ["id", "project_name", "knowledge_graph"],
  "properties": {
    "id": { "type": "string" },
    "project_name": { "type": "string" },
    "description": { "type": "string" },
    "tech_stack": {
      "type": "object",
      "properties": {
        "languages": { "type": "array", "items": { "type": "string" } },
        "frameworks": { "type": "array", "items": { "type": "string" } },
        "databases": { "type": "array", "items": { "type": "string" } },
        "tools": { "type": "array", "items": { "type": "string" } }
      }
    },
    "architecture": {
      "type": "object",
      "properties": {
        "pattern": { "type": "string" },
        "layers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "components": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    },
    "knowledge_graph": {
      "type": "object",
      "properties": {
        "nodes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "label": { "type": "string" },
              "type": { "type": "string" },
              "properties": { "type": "object" }
            }
          }
        },
        "edges": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "source": { "type": "string" },
              "target": { "type": "string" },
              "relation": { "type": "string" },
              "weight": { "type": "number" }
            }
          }
        }
      }
    },
    "domain_modules": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "entry_points": { "type": "array", "items": { "type": "string" } },
          "key_files": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "coding_standards": {
      "type": "array",
      "items": { "type": "string" }
    },
    "common_patterns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "example": { "type": "string" },
          "applies_to": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

### 3.2 数据库表结构设计

```sql
-- 知识片段主表
CREATE TABLE knowledge_chunks (
    id VARCHAR(32) PRIMARY KEY,
    chunk_type VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- pgvector扩展
    embedding_model VARCHAR(64),
    source_file VARCHAR(512),
    line_start INTEGER,
    line_end INTEGER,
    language VARCHAR(32),
    project VARCHAR(128),
    domain VARCHAR(128),
    tags TEXT[],
    ast_signature VARCHAR(512),
    test_coverage DECIMAL(5,2),
    complexity_score DECIMAL(5,2),
    last_modified TIMESTAMP,
    author VARCHAR(128),
    version VARCHAR(32),
    summary TEXT,
    key_concepts TEXT[],
    parent_id VARCHAR(32),
    child_ids TEXT[],
    related_ids TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 全文搜索索引
CREATE INDEX idx_chunks_content_fts ON knowledge_chunks 
USING GIN (to_tsvector('english', content));

-- 向量相似度索引
CREATE INDEX idx_chunks_embedding ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 标签索引
CREATE INDEX idx_chunks_tags ON knowledge_chunks USING GIN (tags);

-- 项目+领域组合索引
CREATE INDEX idx_chunks_project_domain ON knowledge_chunks (project, domain);

-- 知识关系表（图结构）
CREATE TABLE knowledge_relations (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(32) REFERENCES knowledge_chunks(id),
    target_id VARCHAR(32) REFERENCES knowledge_chunks(id),
    relation_type VARCHAR(64) NOT NULL,
    weight DECIMAL(4,3) DEFAULT 1.0,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, target_id, relation_type)
);

-- MCP Skills表
CREATE TABLE mcp_skills (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    tools JSONB NOT NULL,
    knowledge_dependencies TEXT[],
    context_templates TEXT[],
    version VARCHAR(32),
    author VARCHAR(128),
    call_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    avg_response_time DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目上下文表
CREATE TABLE project_contexts (
    id VARCHAR(32) PRIMARY KEY,
    project_name VARCHAR(128) UNIQUE NOT NULL,
    description TEXT,
    tech_stack JSONB,
    architecture JSONB,
    domain_modules JSONB,
    coding_standards TEXT[],
    common_patterns JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据探针表
CREATE TABLE data_probes (
    id SERIAL PRIMARY KEY,
    probe_type VARCHAR(64) NOT NULL,
    location VARCHAR(512) NOT NULL,
    properties JSONB NOT NULL,
    chunk_id VARCHAR(32) REFERENCES knowledge_chunks(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、检索和上下文组装策略

### 4.1 混合检索架构

```mermaid
flowchart LR
    Query[用户查询] --> Preprocess[查询预处理]
    Preprocess --> Parallel{并行检索}
    
    Parallel --> Semantic[语义检索<br/>向量相似度]
    Parallel --> Keyword[关键词检索<br/>BM25/TF-IDF]
    Parallel --> Graph[图检索<br/>关系扩展]
    Parallel --> Probe[探针检索<br/>元数据匹配]
    
    Semantic --> Fusion[结果融合]
    Keyword --> Fusion
    Graph --> Fusion
    Probe --> Fusion
    
    Fusion --> Rerank[重排序<br/>Cross-Encoder]
    Rerank --> Assemble[上下文组装]
    Assemble --> Output[最终上下文]
```

### 4.2 检索策略实现

```python
# retrieval_engine.py
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np

@dataclass
class RetrievalResult:
    chunk_id: str
    content: str
    score: float
    source: str  # semantic|keyword|graph|probe
    metadata: Dict[str, Any]

class HybridRetrievalEngine:
    """混合检索引擎"""
    
    def __init__(
        self,
        vector_store,
        text_search_engine,
        graph_db,
        embedding_model,
        reranker_model
    ):
        self.vector_store = vector_store
        self.text_search = text_search_engine
        self.graph_db = graph_db
        self.embedding_model = embedding_model
        self.reranker = reranker_model
        
        # 检索权重配置
        self.weights = {
            'semantic': 0.4,
            'keyword': 0.25,
            'graph': 0.2,
            'probe': 0.15
        }
    
    async def retrieve(
        self,
        query: str,
        context: Dict[str, Any],
        top_k: int = 10,
        filters: Optional[Dict] = None
    ) -> List[RetrievalResult]:
        """
        执行混合检索
        
        Args:
            query: 用户查询
            context: 当前上下文（当前文件、项目、领域等）
            top_k: 返回结果数量
            filters: 过滤条件
        """
        # 1. 查询预处理
        enhanced_query = self._enhance_query(query, context)
        query_embedding = await self.embedding_model.embed(enhanced_query)
        
        # 2. 并行执行多种检索
        results_map = await self._parallel_retrieve(
            query=enhanced_query,
            query_embedding=query_embedding,
            context=context,
            filters=filters
        )
        
        # 3. 结果融合
        fused_results = self._fuse_results(results_map, top_k * 2)
        
        # 4. 重排序
        reranked_results = await self._rerank(fused_results, query)
        
        # 5. 去重和截断
        final_results = self._deduplicate_and_truncate(reranked_results, top_k)
        
        return final_results
    
    def _enhance_query(self, query: str, context: Dict) -> str:
        """增强查询（添加上下文信息）"""
        enhancements = []
        
        if 'current_file' in context:
            enhancements.append(f"file:{context['current_file']}")
        if 'project' in context:
            enhancements.append(f"project:{context['project']}")
        if 'domain' in context:
            enhancements.append(f"domain:{context['domain']}")
            
        if enhancements:
            return f"{query} [{' '.join(enhancements)}]"
        return query
    
    async def _parallel_retrieve(
        self,
        query: str,
        query_embedding: np.ndarray,
        context: Dict,
        filters: Optional[Dict]
    ) -> Dict[str, List[RetrievalResult]]:
        """并行执行多种检索策略"""
        import asyncio
        
        tasks = {
            'semantic': self._semantic_search(query_embedding, filters),
            'keyword': self._keyword_search(query, filters),
            'graph': self._graph_search(context, filters),
            'probe': self._probe_search(context, filters)
        }
        
        results = await asyncio.gather(*tasks.values())
        return dict(zip(tasks.keys(), results))
    
    async def _semantic_search(
        self,
        query_embedding: np.ndarray,
        filters: Optional[Dict]
    ) -> List[RetrievalResult]:
        """语义检索（向量相似度）"""
        results = await self.vector_store.similarity_search(
            embedding=query_embedding,
            k=20,
            filters=filters
        )
        
        return [
            RetrievalResult(
                chunk_id=r['id'],
                content=r['content'],
                score=r['score'] * self.weights['semantic'],
                source='semantic',
                metadata=r['metadata']
            )
            for r in results
        ]
    
    async def _keyword_search(
        self,
        query: str,
        filters: Optional[Dict]
    ) -> List[RetrievalResult]:
        """关键词检索（BM25）"""
        results = await self.text_search.search(
            query=query,
            k=20,
            filters=filters
        )
        
        return [
            RetrievalResult(
                chunk_id=r['id'],
                content=r['content'],
                score=r['score'] * self.weights['keyword'],
                source='keyword',
                metadata=r['metadata']
            )
            for r in results
        ]
    
    async def _graph_search(
        self,
        context: Dict,
        filters: Optional[Dict]
    ) -> List[RetrievalResult]:
        """图检索（关系扩展）"""
        # 获取当前上下文中已知的实体
        known_entities = context.get('known_entities', [])
        
        # 执行图遍历查询
        query = """
        MATCH (n:KnowledgeChunk)-[r]-(m:KnowledgeChunk)
        WHERE n.id IN $known_entities
        RETURN m, r, count(*) as relevance
        ORDER BY relevance DESC
        LIMIT 20
        """
        
        results = await self.graph_db.run(query, known_entities=known_entities)
        
        return [
            RetrievalResult(
                chunk_id=r['m']['id'],
                content=r['m']['content'],
                score=(r['relevance'] / 10) * self.weights['graph'],
                source='graph',
                metadata=r['m']
            )
            for r in results
        ]
    
    async def _probe_search(
        self,
        context: Dict,
        filters: Optional[Dict]
    ) -> List[RetrievalResult]:
        """探针检索（元数据匹配）"""
        # 从上下文中提取探针条件
        probe_conditions = []
        
        if 'domain' in context:
            probe_conditions.append(f"domain = '{context['domain']}'")
        if 'tags' in context:
            tags = context['tags']
            probe_conditions.append(f"tags && ARRAY{tags}")
            
        if not probe_conditions:
            return []
            
        # 执行探针查询
        query = f"""
        SELECT * FROM knowledge_chunks
        WHERE {' AND '.join(probe_conditions)}
        ORDER BY test_coverage DESC, complexity_score ASC
        LIMIT 20
        """
        
        results = await self.vector_store.raw_query(query)
        
        return [
            RetrievalResult(
                chunk_id=r['id'],
                content=r['content'],
                score=0.8 * self.weights['probe'],
                source='probe',
                metadata=r
            )
            for r in results
        ]
    
    def _fuse_results(
        self,
        results_map: Dict[str, List[RetrievalResult]],
        top_k: int
    ) -> List[RetrievalResult]:
        """融合多种检索结果（RRF算法）"""
        from collections import defaultdict
        
        # RRF常数
        k = 60
        
        # 按chunk_id聚合分数
        scores = defaultdict(lambda: {'score': 0, 'sources': [], 'result': None})
        
        for source, results in results_map.items():
            for rank, result in enumerate(results, 1):
                chunk_id = result.chunk_id
                rrf_score = 1 / (k + rank)
                scores[chunk_id]['score'] += rrf_score
                scores[chunk_id]['sources'].append(source)
                if scores[chunk_id]['result'] is None:
                    scores[chunk_id]['result'] = result
        
        # 排序并返回
        sorted_results = sorted(
            scores.items(),
            key=lambda x: x[1]['score'],
            reverse=True
        )
        
        fused = []
        for chunk_id, data in sorted_results[:top_k]:
            result = data['result']
            result.score = data['score']
            fused.append(result)
            
        return fused
    
    async def _rerank(
        self,
        results: List[RetrievalResult],
        query: str
    ) -> List[RetrievalResult]:
        """使用Cross-Encoder重排序"""
        pairs = [(query, r.content) for r in results]
        rerank_scores = await self.reranker.predict(pairs)
        
        for result, score in zip(results, rerank_scores):
            result.score = score
            
        return sorted(results, key=lambda x: x.score, reverse=True)
    
    def _deduplicate_and_truncate(
        self,
        results: List[RetrievalResult],
        top_k: int
    ) -> List[RetrievalResult]:
        """去重和截断"""
        seen = set()
        unique_results = []
        
        for result in results:
            # 基于内容哈希去重
            content_hash = hash(result.content[:100])
            if content_hash not in seen:
                seen.add(content_hash)
                unique_results.append(result)
                
            if len(unique_results) >= top_k:
                break
                
        return unique_results
```

### 4.3 上下文组装策略

```python
# context_assembler.py
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class AssembledContext:
    """组装后的上下文"""
    system_prompt: str
    knowledge_chunks: List[Dict]
    relationship_graph: Dict
    constraints: List[str]
    examples: List[str]
    token_count: int

class ContextAssembler:
    """上下文组装器"""
    
    def __init__(self, max_tokens: int = 8000):
        self.max_tokens = max_tokens
        self.token_counter = TokenCounter()
    
    async def assemble(
        self,
        query: str,
        retrieval_results: List[RetrievalResult],
        project_context: Dict[str, Any],
        mcp_skills: List[Dict]
    ) -> AssembledContext:
        """
        组装完整上下文
        """
        # 1. 构建系统提示
        system_prompt = self._build_system_prompt(project_context, mcp_skills)
        
        # 2. 组装知识块
        knowledge_chunks = self._assemble_knowledge_chunks(retrieval_results)
        
        # 3. 构建关系图
        relationship_graph = self._build_relationship_graph(retrieval_results)
        
        # 4. 提取约束条件
        constraints = self._extract_constraints(retrieval_results)
        
        # 5. 组装示例
        examples = self._assemble_examples(retrieval_results)
        
        # 6. 计算token并优化
        context = AssembledContext(
            system_prompt=system_prompt,
            knowledge_chunks=knowledge_chunks,
            relationship_graph=relationship_graph,
            constraints=constraints,
            examples=examples,
            token_count=0
        )
        
        context = self._optimize_token_usage(context)
        
        return context
    
    def _build_system_prompt(
        self,
        project_context: Dict,
        mcp_skills: List[Dict]
    ) -> str:
        """构建系统提示"""
        prompt_parts = []
        
        # 项目背景
        prompt_parts.append(f"""# 项目背景
项目名称: {project_context.get('project_name', 'Unknown')}
描述: {project_context.get('description', '')}
""")
        
        # 技术栈
        tech_stack = project_context.get('tech_stack', {})
        if tech_stack:
            prompt_parts.append(f"""# 技术栈
- 语言: {', '.join(tech_stack.get('languages', []))}
- 框架: {', '.join(tech_stack.get('frameworks', []))}
- 数据库: {', '.join(tech_stack.get('databases', []))}
""")
        
        # 架构模式
        architecture = project_context.get('architecture', {})
        if architecture:
            prompt_parts.append(f"""# 架构模式
模式: {architecture.get('pattern', 'Unknown')}
""")
        
        # 编码规范
        standards = project_context.get('coding_standards', [])
        if standards:
            prompt_parts.append("# 编码规范\n")
            for std in standards:
                prompt_parts.append(f"- {std}")
            prompt_parts.append("\n")
        
        # 可用MCP Skills
        if mcp_skills:
            prompt_parts.append("# 可用工具\n")
            for skill in mcp_skills:
                prompt_parts.append(f"- {skill['name']}: {skill['description']}")
            prompt_parts.append("\n")
        
        return '\n'.join(prompt_parts)
    
    def _assemble_knowledge_chunks(
        self,
        results: List[RetrievalResult]
    ) -> List[Dict]:
        """组装知识块"""
        chunks = []
        
        for result in results:
            chunk = {
                'id': result.chunk_id,
                'type': result.metadata.get('chunk_type', 'unknown'),
                'content': result.content,
                'relevance_score': result.score,
                'source': result.metadata.get('source_file', 'unknown'),
                'line_range': f"{result.metadata.get('line_start', 0)}-{result.metadata.get('line_end', 0)}",
                'tags': result.metadata.get('tags', []),
                'summary': result.metadata.get('summary', ''),
                'key_concepts': result.metadata.get('key_concepts', [])
            }
            chunks.append(chunk)
            
        return chunks
    
    def _build_relationship_graph(
        self,
        results: List[RetrievalResult]
    ) -> Dict:
        """构建关系图"""
        nodes = []
        edges = []
        node_ids = set()
        
        for result in results:
            chunk_id = result.chunk_id
            if chunk_id not in node_ids:
                nodes.append({
                    'id': chunk_id,
                    'label': result.metadata.get('summary', '')[:50],
                    'type': result.metadata.get('chunk_type', 'unknown')
                })
                node_ids.add(chunk_id)
            
            # 添加关系边
            related_ids = result.metadata.get('related_ids', [])
            for related_id in related_ids:
                if related_id in node_ids:
                    edges.append({
                        'source': chunk_id,
                        'target': related_id,
                        'relation': 'related'
                    })
        
        return {'nodes': nodes, 'edges': edges}
    
    def _extract_constraints(
        self,
        results: List[RetrievalResult]
    ) -> List[str]:
        """提取约束条件"""
        constraints = []
        
        for result in results:
            probes = result.metadata.get('probes', [])
            for probe in probes:
                props = probe.get('properties', {})
                
                # 提取关键路径约束
                if props.get('critical-path') == 'true':
                    constraints.append(f"关键路径: {result.metadata.get('summary', '')}")
                
                # 提取错误处理约束
                if 'error-handling' in props:
                    errors = props['error-handling']
                    constraints.append(f"错误处理: 必须处理 {', '.join(errors)}")
                
                # 提取缓存策略约束
                if 'cache-strategy' in props:
                    constraints.append(f"缓存策略: {props['cache-strategy']}")
        
        return list(set(constraints))  # 去重
    
    def _assemble_examples(
        self,
        results: List[RetrievalResult]
    ) -> List[str]:
        """组装示例代码"""
        examples = []
        
        for result in results:
            usage_patterns = result.metadata.get('usage_patterns', [])
            examples.extend(usage_patterns)
        
        return examples[:5]  # 限制示例数量
    
    def _optimize_token_usage(
        self,
        context: AssembledContext
    ) -> AssembledContext:
        """优化token使用"""
        total_tokens = (
            self.token_counter.count(context.system_prompt) +
            sum(self.token_counter.count(str(c)) for c in context.knowledge_chunks) +
            sum(self.token_counter.count(c) for c in context.constraints) +
            sum(self.token_counter.count(e) for e in context.examples)
        )
        
        # 如果超出限制，优先保留高相关性知识块
        while total_tokens > self.max_tokens and len(context.knowledge_chunks) > 3:
            context.knowledge_chunks.pop()
            total_tokens = (
                self.token_counter.count(context.system_prompt) +
                sum(self.token_counter.count(str(c)) for c in context.knowledge_chunks)
            )
        
        context.token_count = total_tokens
        return context


class TokenCounter:
    """简单的token计数器（基于字符估算）"""
    
    def count(self, text: str) -> int:
        # 粗略估算：1 token ≈ 4字符
        return len(text) // 4
```

---

## 五、MCP Skills组织和管理

### 5.1 MCP Skills架构

```mermaid
flowchart TB
    subgraph Registry["📋 Skill Registry"]
        R1[技能目录]
        R2[版本管理]
        R3[依赖图谱]
    end
    
    subgraph Skills["🛠️ Skills分类"]
        S1[代码生成类]
        S2[代码审查类]
        S3[测试类]
        S4[文档类]
        S5[重构类]
        S6[调试类]
    end
    
    subgraph Runtime["⚡ Runtime"]
        T1[动态加载]
        T2[上下文注入]
        T3[执行监控]
    end
    
    subgraph Feedback["📊 Feedback"]
        F1[使用统计]
        F2[效果评估]
        F3[自动优化]
    end
    
    R1 --> S1 & S2 & S3 & S4 & S5 & S6
    S1 & S2 & S3 & S4 & S5 & S6 --> T1
    T1 --> T2 --> T3
    T3 --> F1 --> F2 --> F3
    F3 -.-> R1
```

### 5.2 Skill定义示例

```python
# skills/code_generation.py
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class SkillTool:
    """Skill工具定义"""
    name: str
    description: str
    input_schema: Dict
    output_schema: Dict
    examples: List[Dict]

class GenerateFunctionSkill:
    """生成函数代码Skill"""
    
    name = "generate_function"
    description = "根据需求描述生成函数实现"
    category = "code_generation"
    version = "1.0.0"
    
    tools = [
        SkillTool(
            name="generate_function",
            description="生成符合项目规范的函数代码",
            input_schema={
                "type": "object",
                "properties": {
                    "function_name": {"type": "string"},
                    "description": {"type": "string"},
                    "parameters": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                                "description": {"type": "string"}
                            }
                        }
                    },
                    "return_type": {"type": "string"},
                    "language": {"type": "string"},
                    "domain": {"type": "string"}
                },
                "required": ["function_name", "description", "language"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "explanation": {"type": "string"},
                    "tests": {"type": "string"}
                }
            },
            examples=[
                {
                    "input": {
                        "function_name": "validateEmail",
                        "description": "验证邮箱格式",
                        "parameters": [
                            {"name": "email", "type": "string", "description": "邮箱地址"}
                        ],
                        "return_type": "boolean",
                        "language": "typescript"
                    },
                    "output": {
                        "code": "function validateEmail(email: string): boolean { ... }",
                        "explanation": "使用正则表达式验证邮箱格式",
                        "tests": "describe('validateEmail', () => { ... })"
                    }
                }
            ]
        )
    ]
    
    # 知识依赖
    knowledge_dependencies = [
        "chunk_coding_standards_ts",
        "chunk_error_handling_patterns",
        "chunk_validation_utils"
    ]
    
    # 上下文模板
    context_templates = [
        """# 函数生成任务
请根据以下信息生成函数代码：

函数名: {function_name}
描述: {description}
参数: {parameters}
返回类型: {return_type}
语言: {language}

请遵循项目编码规范，并包含适当的错误处理。
"""
    ]
    
    async def execute(self, input_data: Dict, context: Dict) -> Dict:
        """执行Skill"""
        # 1. 检索相关知识
        knowledge = await self._retrieve_knowledge(input_data)
        
        # 2. 组装上下文
        prompt = self._assemble_prompt(input_data, knowledge, context)
        
        # 3. 调用LLM生成代码
        result = await self._call_llm(prompt)
        
        # 4. 后处理
        code = self._post_process(result, input_data)
        
        return {
            "code": code,
            "explanation": result.get("explanation", ""),
            "tests": result.get("tests", "")
        }
    
    async def _retrieve_knowledge(self, input_data: Dict) -> List[Dict]:
        """检索相关知识"""
        # 使用知识商店检索
        pass
    
    def _assemble_prompt(
        self,
        input_data: Dict,
        knowledge: List[Dict],
        context: Dict
    ) -> str:
        """组装提示"""
        template = self.context_templates[0]
        return template.format(**input_data)
    
    async def _call_llm(self, prompt: str) -> Dict:
        """调用LLM"""
        pass
    
    def _post_process(self, result: Dict, input_data: Dict) -> str:
        """后处理生成的代码"""
        code = result.get("code", "")
        # 格式化、添加注释等
        return code
```

### 5.3 Skill注册和管理

```python
# skill_registry.py
from typing import Dict, List, Type, Optional
from dataclasses import dataclass
import importlib
import pkgutil

@dataclass
class SkillInfo:
    """Skill信息"""
    id: str
    name: str
    description: str
    category: str
    version: str
    tools: List[Dict]
    knowledge_dependencies: List[str]
    usage_stats: Dict

class SkillRegistry:
    """Skill注册中心"""
    
    def __init__(self):
        self._skills: Dict[str, Type] = {}
        self._skill_info: Dict[str, SkillInfo] = {}
        self._dependency_graph: Dict[str, List[str]] = {}
    
    def register(self, skill_class: Type) -> None:
        """注册Skill"""
        skill_id = f"skill_{skill_class.name}_{skill_class.version}"
        
        self._skills[skill_id] = skill_class
        self._skill_info[skill_id] = SkillInfo(
            id=skill_id,
            name=skill_class.name,
            description=skill_class.description,
            category=skill_class.category,
            version=skill_class.version,
            tools=[self._tool_to_dict(t) for t in skill_class.tools],
            knowledge_dependencies=skill_class.knowledge_dependencies,
            usage_stats={"call_count": 0, "success_rate": 1.0}
        )
        
        # 更新依赖图
        self._dependency_graph[skill_id] = skill_class.knowledge_dependencies
    
    def discover_skills(self, package_path: str) -> List[str]:
        """自动发现包中的Skills"""
        discovered = []
        
        for importer, modname, ispkg in pkgutil.iter_modules([package_path]):
            if modname.endswith('_skill'):
                module = importlib.import_module(f"{package_path}.{modname}")
                for name in dir(module):
                    obj = getattr(module, name)
                    if (isinstance(obj, type) and 
                        hasattr(obj, 'name') and 
                        hasattr(obj, 'tools')):
                        self.register(obj)
                        discovered.append(name)
        
        return discovered
    
    def get_skill(self, skill_id: str) -> Optional[Type]:
        """获取Skill类"""
        return self._skills.get(skill_id)
    
    def list_skills(
        self,
        category: Optional[str] = None
    ) -> List[SkillInfo]:
        """列出Skills"""
        skills = list(self._skill_info.values())
        
        if category:
            skills = [s for s in skills if s.category == category]
        
        return skills
    
    def get_related_skills(
        self,
        knowledge_chunk_id: str
    ) -> List[SkillInfo]:
        """获取与知识片段相关的Skills"""
        related = []
        
        for skill_id, info in self._skill_info.items():
            if knowledge_chunk_id in info.knowledge_dependencies:
                related.append(info)
        
        return related
    
    def update_usage_stats(
        self,
        skill_id: str,
        success: bool,
        response_time: float
    ) -> None:
        """更新使用统计"""
        info = self._skill_info.get(skill_id)
        if info:
            stats = info.usage_stats
            stats['call_count'] += 1
            
            # 更新成功率
            total = stats['call_count']
            current_rate = stats['success_rate']
            new_rate = (current_rate * (total - 1) + (1 if success else 0)) / total
            stats['success_rate'] = new_rate
            
            # 更新平均响应时间
            avg_time = stats.get('avg_response_time', 0)
            stats['avg_response_time'] = (avg_time * (total - 1) + response_time) / total
    
    def _tool_to_dict(self, tool) -> Dict:
        """转换工具为字典"""
        return {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.input_schema,
            "output_schema": tool.output_schema,
            "examples": tool.examples
        }
```

---

## 六、技术实现方案

### 6.1 推荐技术栈

| 层级 | 组件 | 推荐方案 | 备选方案 |
|------|------|----------|----------|
| 向量数据库 | Chroma | ⭐首选 | Milvus, Qdrant, Weaviate |
| 图数据库 | Neo4j | ⭐首选 | NebulaGraph, Dgraph |
| 关系数据库 | PostgreSQL + pgvector | ⭐首选 | SQLite, MySQL |
| 对象存储 | MinIO | ⭐首选 | AWS S3, 本地存储 |
| 嵌入模型 | text-embedding-3-small | ⭐首选 | bge-m3, m3e |
| 重排序 | bge-reranker-v2 | ⭐首选 | Cohere Rerank |
| API框架 | FastAPI | ⭐首选 | Flask, Django |
| MCP Server | 官方SDK | ⭐首选 | 自定义实现 |
| 任务队列 | Celery + Redis | ⭐首选 | RQ, APScheduler |
| 监控 | Prometheus + Grafana | ⭐首选 | 自定义 |

### 6.2 项目结构

```
knowledge-store/
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI入口
│   ├── config.py               # 配置管理
│   ├── models/                 # 数据模型
│   │   ├── __init__.py
│   │   ├── chunk.py            # KnowledgeChunk模型
│   │   ├── skill.py            # MCP Skill模型
│   │   └── context.py          # ProjectContext模型
│   ├── core/                   # 核心逻辑
│   │   ├── __init__.py
│   │   ├── probe_parser.py     # 探针解析器
│   │   ├── chunker.py          # 文档分块器
│   │   ├── embedder.py         # 嵌入生成器
│   │   └── indexer.py          # 索引管理器
│   ├── retrieval/              # 检索模块
│   │   ├── __init__.py
│   │   ├── hybrid_engine.py    # 混合检索引擎
│   │   ├── context_assembler.py # 上下文组装器
│   │   └── reranker.py         # 重排序器
│   ├── storage/                # 存储模块
│   │   ├── __init__.py
│   │   ├── vector_store.py     # 向量存储
│   │   ├── graph_store.py      # 图存储
│   │   └── metadata_store.py   # 元数据存储
│   ├── skills/                 # MCP Skills
│   │   ├── __init__.py
│   │   ├── registry.py         # Skill注册中心
│   │   ├── code_generation.py  # 代码生成Skill
│   │   ├── code_review.py      # 代码审查Skill
│   │   └── ...
│   ├── mcp/                    # MCP Server实现
│   │   ├── __init__.py
│   │   ├── server.py           # MCP Server
│   │   └── tools.py            # 工具定义
│   └── api/                    # API路由
│       ├── __init__.py
│       ├── chunks.py           # 知识片段API
│       ├── search.py           # 检索API
│       └── skills.py           # Skill API
├── tests/                      # 测试
├── scripts/                    # 脚本
├── docs/                       # 文档
├── docker-compose.yml          # Docker编排
├── requirements.txt            # Python依赖
└── README.md
```

### 6.3 核心配置

```python
# config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """应用配置"""
    
    # 应用
    APP_NAME: str = "Knowledge Store"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # 数据库
    VECTOR_DB_PATH: str = "./data/vector_db"
    GRAPH_DB_URI: str = "bolt://localhost:7687"
    GRAPH_DB_USER: str = "neo4j"
    GRAPH_DB_PASSWORD: str = "password"
    POSTGRES_URI: str = "postgresql://user:pass@localhost/knowledge"
    
    # 嵌入模型
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    
    # 检索配置
    RETRIEVAL_TOP_K: int = 10
    RERANK_TOP_K: int = 5
    MAX_CONTEXT_TOKENS: int = 8000
    
    # 混合检索权重
    SEMANTIC_WEIGHT: float = 0.4
    KEYWORD_WEIGHT: float = 0.25
    GRAPH_WEIGHT: float = 0.2
    PROBE_WEIGHT: float = 0.15
    
    # MCP
    MCP_SERVER_NAME: str = "knowledge-store"
    MCP_SERVER_VERSION: str = "1.0.0"
    
    # 缓存
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 6.4 Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  knowledge-store:
    build: .
    ports:
      - "8000:8000"
    environment:
      - VECTOR_DB_PATH=/data/vector_db
      - GRAPH_DB_URI=bolt://neo4j:7687
      - POSTGRES_URI=postgresql://postgres:password@postgres:5432/knowledge
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/data
    depends_on:
      - neo4j
      - postgres
      - redis

  neo4j:
    image: neo4j:5.15
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_PLUGINS=["apoc", "gds"]
    volumes:
      - neo4j_data:/data

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=knowledge
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  neo4j_data:
  postgres_data:
  redis_data:
  chroma_data:
```

---

## 七、数据流全景图

```mermaid
sequenceDiagram
    participant User as 用户/AI Agent
    participant API as Knowledge Store API
    participant Parser as 探针解析器
    participant Embedder as 嵌入生成器
    participant VStore as 向量存储
    participant GStore as 图存储
    participant MStore as 元数据存储
    participant Retriever as 检索引擎
    participant Assembler as 上下文组装器

    %% 知识录入流程
    rect rgb(230, 245, 255)
        Note over User,MStore: 知识录入流程
        User->>API: 上传文档/代码
        API->>Parser: 解析数据探针
        Parser-->>API: 探针元数据
        API->>Embedder: 生成向量嵌入
        Embedder-->>API: 嵌入向量
        API->>VStore: 存储向量
        API->>GStore: 存储关系
        API->>MStore: 存储元数据
    end

    %% 检索流程
    rect rgb(255, 245, 230)
        Note over User,Assembler: 检索流程
        User->>API: 查询 + 上下文
        API->>Retriever: 执行混合检索
        Retriever->>VStore: 语义检索
        VStore-->>Retriever: 向量结果
        Retriever->>GStore: 图检索
        GStore-->>Retriever: 关系结果
        Retriever->>MStore: 探针检索
        MStore-->>Retriever: 元数据结果
        Retriever->>Retriever: 融合重排序
        Retriever-->>API: 检索结果
        API->>Assembler: 组装上下文
        Assembler-->>API: 完整上下文
        API-->>User: 返回上下文
    end
```

---

## 八、总结

本技术方案设计了一个完整的项目级碎片化知识商店系统，核心特点包括：

### 8.1 核心创新点

1. **数据探针机制**：在文档和代码中埋入结构化元数据，实现AI友好的知识定位
2. **混合检索策略**：融合语义检索、关键词检索、图检索和探针检索，提升召回质量
3. **细粒度知识管理**：支持函数级别的知识片段存储和检索
4. **MCP Skill集成**：将知识管理与AI能力无缝结合

### 8.2 技术亮点

- 多模态存储架构（向量+图+关系）
- 智能上下文组装和token优化
- 可扩展的Skill注册和管理机制
- 完整的MCP Server实现

### 8.3 实施建议

1. **阶段1**：实现基础存储和探针解析
2. **阶段2**：完成混合检索引擎
3. **阶段3**：开发MCP Skills和Server
4. **阶段4**：集成到IDE和开发工作流

---

*文档版本: 1.0*
*最后更新: 2024*
