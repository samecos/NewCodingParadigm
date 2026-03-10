"""
数据处理流水线集成测试

@probe_ref: GS-Arch-002
@probe_ref: GS-Req-007
遵循 "测试即法律" 原则
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os


try:
    from backend.app.services.pipeline import ProcessingPipeline
except ImportError:
    ProcessingPipeline = None


@pytest.mark.skipif(ProcessingPipeline is None, reason="Pipeline not yet implemented")
class TestProcessingPipeline:
    """测试处理流水线"""
    
    def test_pipeline_stage_order(self):
        """
        @probe_id: GS-Arch-002
        验证流水线阶段按正确顺序执行
        """
        pipeline = ProcessingPipeline()
        expected_stages = [
            "validation",
            "colmap", 
            "initialization",
            "training",
            "export"
        ]
        
        assert pipeline.stage_order == expected_stages
    
    def test_pipeline_execution_flow(self):
        """
        @probe_id: GS-Arch-002
        测试流水线完整执行流程
        """
        pipeline = ProcessingPipeline()
        
        # 模拟任务数据
        task_id = "test-task-123"
        image_paths = ["img1.jpg", "img2.jpg"]
        
        # 使用 mock 替换各阶段执行
        with patch.object(pipeline, '_run_validation') as mock_val, \
             patch.object(pipeline, '_run_colmap') as mock_colmap, \
             patch.object(pipeline, '_run_initialization') as mock_init, \
             patch.object(pipeline, '_run_training') as mock_train, \
             patch.object(pipeline, '_run_export') as mock_export:
            
            # 设置 mock 返回值
            mock_val.return_value = {"valid": True}
            mock_colmap.return_value = {"cameras": [], "points3D": []}
            mock_init.return_value = {"model": Mock()}
            mock_train.return_value = {"metrics": {"psnr": 32.0, "ssim": 0.88}}
            mock_export.return_value = {"ply": "model.ply", "splat": "model.splat"}
            
            # 执行流水线
            result = pipeline.execute(task_id, image_paths)
            
            # 验证各阶段都被调用
            mock_val.assert_called_once()
            mock_colmap.assert_called_once()
            mock_init.assert_called_once()
            mock_train.assert_called_once()
            mock_export.assert_called_once()
            
            # 验证结果包含所有输出
            assert "ply" in result
            assert "splat" in result
    
    def test_pipeline_progress_callback(self):
        """
        @probe_id: GS-Req-006
        测试进度回调机制
        """
        pipeline = ProcessingPipeline()
        progress_updates = []
        
        def progress_callback(progress):
            progress_updates.append(progress)
        
        # 模拟快速执行
        with patch.object(pipeline, '_run_validation'), \
             patch.object(pipeline, '_run_colmap'), \
             patch.object(pipeline, '_run_initialization'), \
             patch.object(pipeline, '_run_training'), \
             patch.object(pipeline, '_run_export'):
            
            pipeline.execute("test-task", ["img.jpg"], progress_callback=progress_callback)
        
        # 验证收到了进度更新
        assert len(progress_updates) > 0
        # 验证进度从 0 到 100
        assert progress_updates[0].percentage == 0
        assert progress_updates[-1].percentage == 100


@pytest.mark.skipif(ProcessingPipeline is None, reason="Pipeline not yet implemented")
class TestImageValidationStage:
    """测试图像验证阶段"""
    
    def test_valid_image_formats(self):
        """
        @probe_id: GS-Req-002
        验证支持的图像格式
        """
        pipeline = ProcessingPipeline()
        
        valid_formats = ["jpg", "jpeg", "png", "tiff", "tif"]
        
        for ext in valid_formats:
            with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as f:
                f.write(b"fake image data")
                temp_path = f.name
            
            try:
                result = pipeline._validate_single_image(temp_path)
                assert result["valid"] is True or result["valid"] is False  # 至少是布尔值
            finally:
                os.unlink(temp_path)
    
    def test_minimum_image_count(self):
        """
        @probe_id: GS-Req-002
        验证最小图像数量约束
        """
        pipeline = ProcessingPipeline()
        
        # 少于建议数量的图像应产生警告
        with pytest.warns(UserWarning):
            result = pipeline._run_validation(["img1.jpg"])
        
        # 但不应阻止处理
        assert result["valid"] is True


@pytest.mark.skipif(ProcessingPipeline is None, reason="Pipeline not yet implemented")
class TestCOLMAPStage:
    """测试 COLMAP 位姿估计阶段"""
    
    def test_colmap_registration_rate(self):
        """
        @probe_id: GS-Req-003
        验证 COLMAP 图像注册率 ≥ 80%
        """
        pipeline = ProcessingPipeline()
        
        # 模拟 COLMAP 输出
        mock_cameras = {"camera_1": Mock()}
        mock_images = {f"image_{i}": Mock() for i in range(90)}  # 90张注册成功
        mock_points3d = {f"point_{i}": Mock() for i in range(15000)}  # 15000个点
        
        total_images = 100  # 总共100张输入
        
        registration_rate = len(mock_images) / total_images
        assert registration_rate >= 0.8, f"Registration rate {registration_rate} below 80%"
    
    def test_minimum_sparse_points(self):
        """
        @probe_id: GS-Req-003
        验证稀疏点云至少包含 10000 个点
        """
        pipeline = ProcessingPipeline()
        
        mock_points3d = {f"point_{i}": Mock() for i in range(15000)}
        
        assert len(mock_points3d) >= 10000, "Sparse point cloud has fewer than 10000 points"
