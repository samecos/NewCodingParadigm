"""
FastAPI 应用主入口

@probe_ref: GS-Arch-001
@probe_ref: GS-Req-006
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import tasks
from app.core.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info("Starting GSplat Tool Backend...")
    yield
    # 关闭时执行
    logger.info("Shutting down GSplat Tool Backend...")


app = FastAPI(
    title="GSplat Tool API",
    description="基于 3D Gaussian Splatting 的三维数字化工具",
    version="0.1.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(tasks.router, prefix="/api/v1", tags=["tasks"])

# 静态文件服务（用于访问结果文件）
import os
results_dir = os.path.join(os.path.dirname(__file__), "../../data/outputs")
os.makedirs(results_dir, exist_ok=True)
app.mount("/results", StaticFiles(directory=results_dir), name="results")


@app.get("/")
async def root():
    """根路径 - API 信息"""
    return {
        "name": "GSplat Tool API",
        "version": "0.1.0",
        "description": "基于 3D Gaussian Splatting 的三维数字化工具",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}
