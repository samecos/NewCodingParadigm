"""
GaussianModel 核心模型测试

@probe_ref: GS-Arch-004
@probe_ref: GS-Req-004
遵循 "测试即法律" 原则
"""

import pytest
import numpy as np
import torch

try:
    from backend.gaussian.model import GaussianModel
except ImportError:
    GaussianModel = None


@pytest.mark.skipif(GaussianModel is None, reason="GaussianModel not yet implemented")
class TestGaussianModelInitialization:
    """测试高斯模型初始化"""
    
    def test_initialization_from_colmap_points(self):
        """
        @probe_id: GS-Req-004
        测试从 COLMAP 点云初始化高斯模型
        """
        # 模拟 COLMAP 点云数据
        num_points = 1000
        points = np.random.randn(num_points, 3).astype(np.float32) * 2
        colors = np.random.randint(0, 255, (num_points, 3), dtype=np.uint8)
        
        model = GaussianModel(sh_degree=3)
        model.from_colmap_points(points, colors)
        
        # 验证高斯点数量
        assert model.get_xyz.shape[0] == num_points
        assert model.get_xyz.shape[1] == 3
        
        # 验证其他参数维度
        assert model._features_dc.shape[0] == num_points
        assert model._opacity.shape[0] == num_points
        assert model._scaling.shape[0] == num_points
        assert model._rotation.shape[0] == num_points
    
    def test_initial_covariance_positive_definite(self):
        """
        @probe_id: GS-Arch-004
        验证初始协方差矩阵是正定的
        """
        num_points = 100
        points = np.random.randn(num_points, 3).astype(np.float32)
        colors = np.random.randint(0, 255, (num_points, 3), dtype=np.uint8)
        
        model = GaussianModel(sh_degree=0)
        model.from_colmap_points(points, colors)
        
        # 获取协方差矩阵
        covariances = model.get_covariance()
        
        # 验证每个高斯的协方差是正定的
        for i in range(min(10, num_points)):  # 抽样检查
            cov = covariances[i].detach().cpu().numpy()
            eigenvalues = np.linalg.eigvalsh(cov)
            assert np.all(eigenvalues > 0), f"Covariance not positive definite at index {i}"


@pytest.mark.skipif(GaussianModel is None, reason="GaussianModel not yet implemented")
class TestGaussianModelParameters:
    """测试高斯模型参数"""
    
    def test_opacity_range(self):
        """
        @probe_id: GS-Arch-004
        验证不透明度在有效范围内 (0, 1)
        """
        model = GaussianModel(sh_degree=0)
        model.from_colmap_points(
            np.random.randn(100, 3).astype(np.float32),
            np.random.randint(0, 255, (100, 3), dtype=np.uint8)
        )
        
        opacity = model.get_opacity.detach().cpu().numpy()
        # 经过 sigmoid 激活后，不透明度应在 (0, 1) 之间
        assert np.all(opacity > 0)
        assert np.all(opacity < 1)
    
    def test_rotation_quaternion_normalization(self):
        """
        @probe_id: GS-Arch-004
        验证旋转四元数是单位四元数
        """
        model = GaussianModel(sh_degree=0)
        model.from_colmap_points(
            np.random.randn(100, 3).astype(np.float32),
            np.random.randint(0, 255, (100, 3), dtype=np.uint8)
        )
        
        rotation = model.get_rotation.detach().cpu().numpy()
        # 验证四元数模长为 1
        norms = np.linalg.norm(rotation, axis=1)
        assert np.allclose(norms, 1.0, atol=1e-5)
    
    def test_spherical_harmonics_dimensions(self):
        """
        @probe_id: GS-Arch-004
        验证球谐系数维度正确
        """
        sh_degree = 3
        num_points = 100
        
        model = GaussianModel(sh_degree=sh_degree)
        model.from_colmap_points(
            np.random.randn(num_points, 3).astype(np.float32),
            np.random.randint(0, 255, (num_points, 3), dtype=np.uint8)
        )
        
        # 球谐系数数量: (sh_degree + 1)^2 - 1 (减去直流分量)
        expected_sh_coeffs = (sh_degree + 1) ** 2 - 1
        
        assert model._features_rest.shape == (num_points, expected_sh_coeffs, 3)


@pytest.mark.skipif(GaussianModel is None, reason="GaussianModel not yet implemented")
class TestGaussianModelExport:
    """测试高斯模型导出"""
    
    def test_export_ply_format(self, tmp_path):
        """
        @probe_id: GS-Req-005
        测试导出 PLY 格式文件
        """
        model = GaussianModel(sh_degree=0)
        model.from_colmap_points(
            np.random.randn(100, 3).astype(np.float32),
            np.random.randint(0, 255, (100, 3), dtype=np.uint8)
        )
        
        output_path = tmp_path / "model.ply"
        model.save_ply(str(output_path))
        
        # 验证文件存在且非空
        assert output_path.exists()
        assert output_path.stat().st_size > 0
    
    def test_export_splat_format(self, tmp_path):
        """
        @probe_id: GS-Req-005
        测试导出 SPLAT 格式文件
        验证文件大小不超过 PLY 的 50%
        """
        model = GaussianModel(sh_degree=0)
        model.from_colmap_points(
            np.random.randn(1000, 3).astype(np.float32),
            np.random.randint(0, 255, (1000, 3), dtype=np.uint8)
        )
        
        ply_path = tmp_path / "model.ply"
        splat_path = tmp_path / "model.splat"
        
        model.save_ply(str(ply_path))
        model.save_splat(str(splat_path))
        
        # 验证两个文件都存在
        assert ply_path.exists()
        assert splat_path.exists()
        
        # 验证 SPLAT 文件大小不超过 PLY 的 50%
        ply_size = ply_path.stat().st_size
        splat_size = splat_path.stat().st_size
        assert splat_size <= ply_size * 0.5, "SPLAT file size exceeds 50% of PLY"
    
    def test_ply_contains_required_attributes(self, tmp_path):
        """
        @probe_id: GS-Req-005
        验证 PLY 文件包含必需属性：位置、协方差、颜色、球谐系数
        """
        # 此测试需要读取 PLY 文件并验证其结构
        # 暂时用占位实现，待实际实现后完善
        pytest.skip("待 PLY 读取功能实现后完善")
