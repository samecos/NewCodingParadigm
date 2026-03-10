"""
数据模型定义

@probe_ref: GS-Arch-003
@probe_ref: GS-Req-006
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineStage(str, Enum):
    """流水线阶段枚举"""
    VALIDATION = "validation"
    COLMAP = "colmap"
    INITIALIZATION = "initialization"
    TRAINING = "training"
    EXPORT = "export"


class OutputFormat(str, Enum):
    """输出格式枚举"""
    PLY = "ply"
    SPLAT = "splat"


class TaskConfig(BaseModel):
    """
    任务配置模型
    
    @probe_id: GS-Req-002
    @probe_id: GS-Req-005
    """
    input_images: List[str] = Field(..., description="输入图片路径列表")
    output_formats: List[OutputFormat] = Field(
        default=[OutputFormat.PLY, OutputFormat.SPLAT],
        description="输出格式列表"
    )
    training_iterations: int = Field(
        default=30000,
        ge=1000,
        le=100000,
        description="训练迭代次数"
    )
    device: str = Field(default="cuda", description="计算设备")
    
    class Config:
        json_schema_extra = {
            "example": {
                "input_images": ["img1.jpg", "img2.jpg"],
                "output_formats": ["ply", "splat"],
                "training_iterations": 30000,
                "device": "cuda"
            }
        }


class Task(BaseModel):
    """
    任务模型
    
    @probe_id: GS-Arch-003
    """
    id: UUID = Field(default_factory=uuid4, description="任务唯一标识")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="任务状态")
    stage: Optional[PipelineStage] = Field(default=None, description="当前阶段")
    config: TaskConfig = Field(..., description="任务配置")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = Field(default=None, description="错误信息")
    
    class Config:
        from_attributes = True


class Progress(BaseModel):
    """
    进度模型
    
    @probe_id: GS-Arch-003
    """
    task_id: UUID = Field(..., description="关联任务ID")
    stage: str = Field(..., description="当前阶段")
    percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="进度百分比 (0-100)"
    )
    message: str = Field(..., description="进度消息")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "123e4567-e89b-12d3-a456-426614174000",
                "stage": "training",
                "percentage": 45.5,
                "message": "Training iteration 13650/30000"
            }
        }


class Metrics(BaseModel):
    """训练指标模型"""
    psnr: Optional[float] = Field(default=None, description="峰值信噪比")
    ssim: Optional[float] = Field(default=None, description="结构相似性")
    num_gaussians: Optional[int] = Field(default=None, description="高斯点数量")
    training_time: Optional[float] = Field(default=None, description="训练耗时(秒)")


class Result(BaseModel):
    """
    结果模型
    
    @probe_id: GS-Arch-003
    @probe_id: GS-Req-005
    """
    task_id: UUID = Field(..., description="关联任务ID")
    ply_url: Optional[str] = Field(default=None, description="PLY文件URL")
    splat_url: Optional[str] = Field(default=None, description="SPLAT文件URL")
    preview_url: Optional[str] = Field(default=None, description="预览图URL")
    metrics: Metrics = Field(default_factory=Metrics, description="训练指标")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "123e4567-e89b-12d3-a456-426614174000",
                "ply_url": "/results/task_xxx/model.ply",
                "splat_url": "/results/task_xxx/model.splat",
                "preview_url": "/results/task_xxx/preview.png",
                "metrics": {
                    "psnr": 32.5,
                    "ssim": 0.89,
                    "num_gaussians": 2850000,
                    "training_time": 5400.0
                }
            }
        }


class TaskCreateRequest(BaseModel):
    """创建任务请求"""
    config: TaskConfig


class TaskResponse(BaseModel):
    """任务响应"""
    task: Task
    progress: Optional[Progress] = None
    result: Optional[Result] = None
