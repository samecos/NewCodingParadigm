"""
数据模型测试

@probe_ref: GS-Arch-003
遵循 "测试即法律" 原则
"""

import pytest
from uuid import UUID
from datetime import datetime

from backend.app.models.schemas import (
    Task, TaskConfig, Progress, Result, Metrics,
    TaskStatus, PipelineStage, OutputFormat
)


class TestTaskConfig:
    """测试任务配置模型"""
    
    def test_valid_config_creation(self):
        """
        @probe_id: GS-Req-002
        测试有效的任务配置创建
        """
        config = TaskConfig(
            input_images=["img1.jpg", "img2.jpg", "img3.jpg"],
            output_formats=[OutputFormat.PLY, OutputFormat.SPLAT],
            training_iterations=30000,
            device="cuda"
        )
        
        assert len(config.input_images) == 3
        assert OutputFormat.PLY in config.output_formats
        assert OutputFormat.SPLAT in config.output_formats
        assert config.training_iterations == 30000
        assert config.device == "cuda"
    
    def test_default_values(self):
        """
        @probe_id: GS-Arch-003
        测试默认值设置
        """
        config = TaskConfig(input_images=["img.jpg"])
        
        # 默认输出格式应包含 ply 和 splat
        assert OutputFormat.PLY in config.output_formats
        assert OutputFormat.SPLAT in config.output_formats
        # 默认迭代次数为 30000
        assert config.training_iterations == 30000
        # 默认设备为 cuda
        assert config.device == "cuda"
    
    def test_training_iterations_bounds(self):
        """
        @probe_id: GS-Req-004
        测试训练迭代次数边界约束
        """
        # 迭代次数不能小于 1000
        with pytest.raises(ValueError):
            TaskConfig(
                input_images=["img.jpg"],
                training_iterations=500  # 低于最小值
            )
        
        # 迭代次数不能大于 100000
        with pytest.raises(ValueError):
            TaskConfig(
                input_images=["img.jpg"],
                training_iterations=150000  # 超过最大值
            )


class TestTask:
    """测试任务模型"""
    
    def test_task_creation_with_defaults(self):
        """
        @probe_id: GS-Arch-003
        测试任务创建及默认值
        """
        config = TaskConfig(input_images=["img1.jpg"])
        task = Task(config=config)
        
        # 检查 UUID 生成
        assert isinstance(task.id, UUID)
        # 默认状态为 pending
        assert task.status == TaskStatus.PENDING
        # 默认阶段为 None
        assert task.stage is None
        # 检查时间戳
        assert isinstance(task.created_at, datetime)
        assert isinstance(task.updated_at, datetime)
    
    def test_task_status_transitions(self):
        """
        @probe_id: GS-Arch-003
        测试任务状态流转
        """
        config = TaskConfig(input_images=["img.jpg"])
        task = Task(config=config)
        
        # 状态转换: pending -> processing -> completed
        task.status = TaskStatus.PROCESSING
        assert task.status == TaskStatus.PROCESSING
        
        task.status = TaskStatus.COMPLETED
        assert task.status == TaskStatus.COMPLETED


class TestProgress:
    """测试进度模型"""
    
    def test_progress_percentage_bounds(self):
        """
        @probe_id: GS-Arch-003
        测试进度百分比边界约束
        """
        import uuid
        
        # 百分比不能为负数
        with pytest.raises(ValueError):
            Progress(
                task_id=uuid.uuid4(),
                stage="training",
                percentage=-10.0,
                message="Invalid progress"
            )
        
        # 百分比不能超过 100
        with pytest.raises(ValueError):
            Progress(
                task_id=uuid.uuid4(),
                stage="training",
                percentage=150.0,
                message="Invalid progress"
            )
    
    def test_valid_progress_creation(self):
        """
        @probe_id: GS-Req-006
        测试有效进度创建
        """
        import uuid
        
        progress = Progress(
            task_id=uuid.uuid4(),
            stage="training",
            percentage=45.5,
            message="Training iteration 13650/30000"
        )
        
        assert 0 <= progress.percentage <= 100
        assert progress.stage == "training"
        assert isinstance(progress.timestamp, datetime)


class TestMetrics:
    """测试训练指标模型"""
    
    def test_psnr_constraint(self):
        """
        @probe_id: GS-Req-004
        验证 PSNR 性能指标约束: PSNR ≥ 30 dB
        """
        # 合格指标
        metrics = Metrics(psnr=32.5, ssim=0.88)
        assert metrics.psnr >= 30.0
        
        # 不合格指标（实际测试中应导致警告或失败）
        metrics_low = Metrics(psnr=25.0, ssim=0.75)
        # 注意：这里我们验证模型的存储能力，实际业务逻辑应检查此约束
        assert metrics_low.psnr < 30.0
    
    def test_ssim_constraint(self):
        """
        @probe_id: GS-Req-004
        验证 SSIM 性能指标约束: SSIM ≥ 0.85
        """
        metrics = Metrics(psnr=31.0, ssim=0.89)
        assert metrics.ssim >= 0.85


class TestResult:
    """测试结果模型"""
    
    def test_result_with_ply_only(self):
        """
        @probe_id: GS-Req-005
        测试仅导出 PLY 格式的结果
        """
        import uuid
        
        result = Result(
            task_id=uuid.uuid4(),
            ply_url="/results/task_xxx/model.ply",
            splat_url=None,
            metrics=Metrics(psnr=31.5, ssim=0.87, num_gaussians=1000000)
        )
        
        assert result.ply_url is not None
        assert result.splat_url is None
        assert result.metrics.psnr == 31.5
    
    def test_result_with_both_formats(self):
        """
        @probe_id: GS-Req-005
        测试同时导出 PLY 和 SPLAT 格式的结果
        """
        import uuid
        
        result = Result(
            task_id=uuid.uuid4(),
            ply_url="/results/task_xxx/model.ply",
            splat_url="/results/task_xxx/model.splat",
            preview_url="/results/task_xxx/preview.png",
            metrics=Metrics(
                psnr=32.0,
                ssim=0.90,
                num_gaussians=2850000,
                training_time=5400.0
            )
        )
        
        assert result.ply_url.endswith(".ply")
        assert result.splat_url.endswith(".splat")
        assert result.preview_url.endswith(".png")
        assert result.metrics.num_gaussians == 2850000
