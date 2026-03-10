"""
应用配置

@probe_ref: GS-Arch-001
"""

import os
from pathlib import Path
from typing import List


class Settings:
    """应用设置"""
    
    # 项目路径
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    DATA_DIR = BASE_DIR / ".." / "data"
    
    # 上传配置
    UPLOAD_DIR = DATA_DIR / "uploads"
    OUTPUT_DIR = DATA_DIR / "outputs"
    CACHE_DIR = DATA_DIR / "cache"
    
    # 允许的图片格式
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".tiff", ".tif"]
    MAX_IMAGE_SIZE = 50 * 1024 * 1024  # 50MB
    
    # 3DGS 训练配置
    DEFAULT_TRAINING_ITERATIONS = 30000
    DEFAULT_SH_DEGREE = 3
    
    # COLMAP 配置
    COLMAP_EXE_PATH = os.getenv("COLMAP_EXE_PATH", "colmap")
    
    # GPU 配置
    CUDA_VISIBLE_DEVICES = os.getenv("CUDA_VISIBLE_DEVICES", "0")
    
    class Config:
        case_sensitive = True


settings = Settings()

# 确保目录存在
for dir_path in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.CACHE_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)
