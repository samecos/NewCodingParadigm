#!/usr/bin/env python3
import os
import re
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# 初始化面向 "demo-ncp-project" 的专属 MCP Server
mcp = FastMCP("NCP-Knowledge-Store", dependencies=["httpx"])

# 探针存储（PoC 阶段使用内存字典模拟底层的 SQLite/ChromaDB）
# 在真实的实现中，这里是在应用启动时扫描 docs/knowledge_store 获取的
knowledge_store = {
    "Auth-Req-001": {
        "type": "Requirement",
        "target": "login_flow",
        "content": "登录函数必须接收 username 和 password。如果失败返回 False，成功返回 JWT 格式的字符串。"
    },
    "Math-Req-001": {
        "type": "Requirement",
        "target": "example_pure_function",
        "content": "实现加法运算。当其中一个输入参数为负数时，强制返回 0（模拟一种特殊的业务边界）。"
    }
}

@mcp.tool()
def get_probe_by_id(probe_id: str) -> dict[str, Any]:
    """
    当大模型或小模型在代码中碰到 `@probe_id: xxx` 时，
    通过此工具查询该探针的具体业务约束。
    
    Args:
        probe_id: 要查询的探针 ID (如 "Math-Req-001")
    """
    if probe_id in knowledge_store:
        return {
            "status": "success",
            "probe_id": probe_id,
            "data": knowledge_store[probe_id]
        }
    else:
        return {
            "status": "not_found",
            "message": f"未在知识商店中找到 ID 为 {probe_id} 的数据探针。请检查 Requirement 是否已定义。"
        }


@mcp.tool()
def extract_probes_from_file(file_path: str) -> dict[str, Any]:
    """
    (模拟 Indexer) 扫描传入文件中的 Markdown 或 Python 内容，
    提取其中定义的所有探针或对探针的引用。
    """
    if not os.path.exists(file_path):
        return {"error": "File not found"}
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 极简正则：查找类似 `@probe_id: XXX` 的标注
    found_refs = re.findall(r"@probe_id:\s*([A-Za-z0-9_-]+)", content)
    
    # 极简正则：查找类似 `#@Probe: XXX` 的定义
    found_defs = re.findall(r"#@Probe:\s*([A-Za-z0-9_-]+)", content)
    
    return {
        "file": file_path,
        "found_probe_references": found_refs,
        "found_probe_definitions": found_defs
    }

if __name__ == "__main__":
    print("🚀 启动 NCP-Knowledge-Store MCP 服务端 (基于 stdio 协议)...")
    mcp.run()
