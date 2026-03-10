"""
3D Gaussian Splatting 可微渲染器

使用 diff-gaussian-rasterization 实现高效渲染
@probe_ref: GS-Req-004
"""

import torch
import torch.nn as nn
import math
from typing import Tuple, Optional
from dataclasses import dataclass


try:
    from diff_gaussian_rasterization import (
        GaussianRasterizationSettings,
        GaussianRasterizer,
    )
    DIFF_GS_AVAILABLE = True
except ImportError:
    DIFF_GS_AVAILABLE = False
    print("Warning: diff_gaussian_rasterization not installed. Using mock renderer.")


@dataclass
class Camera:
    """相机参数"""
    width: int
    height: int
    focal_x: float
    focal_y: float
    principal_x: float = 0.0
    principal_y: float = 0.0
    R: torch.Tensor = None  # 旋转矩阵 (3, 3)
    T: torch.Tensor = None  # 平移向量 (3,)
    device: str = "cuda"
    fovx: float = None
    fovy: float = None
    
    def __post_init__(self):
        if self.R is None:
            self.R = torch.eye(3, device=self.device)
        if self.T is None:
            self.T = torch.zeros(3, device=self.device)
        if self.fovx is None:
            import math
            self.fovx = 2 * math.atan(self.width / (2 * self.focal_x)) if self.focal_x > 0 else math.pi / 2
            self.fovy = 2 * math.atan(self.height / (2 * self.focal_y)) if self.focal_y > 0 else math.pi / 2
    
    @property
    def world_view_transform(self) -> torch.Tensor:
        """获取世界到视图的变换矩阵 (4, 4)"""
        # W2C = [R^T, -R^T @ T]
        #       [ 0 ,    1   ]
        Rt = torch.zeros((4, 4), device=self.device)
        Rt[:3, :3] = self.R.transpose(0, 1)
        Rt[:3, 3] = -self.R.transpose(0, 1) @ self.T
        Rt[3, 3] = 1.0
        return Rt
    
    @property
    def projection_matrix(self) -> torch.Tensor:
        """获取投影矩阵 (4, 4) - 简化的针孔相机模型"""
        znear = 0.01
        zfar = 100.0
        
        P = torch.zeros((4, 4), device=self.device)
        P[0, 0] = 2.0 * self.focal_x / self.width
        P[1, 1] = 2.0 * self.focal_y / self.height
        P[0, 2] = 2.0 * (self.principal_x / self.width) - 1.0
        P[1, 2] = 2.0 * (self.principal_y / self.height) - 1.0
        P[2, 2] = (zfar + znear) / (zfar - znear)
        P[2, 3] = -(2 * zfar * znear) / (zfar - znear)
        P[3, 2] = 1.0
        
        return P
    
    @property
    def full_proj_transform(self) -> torch.Tensor:
        """获取完整的投影变换矩阵"""
        return self.projection_matrix @ self.world_view_transform
    
    @property
    def camera_center(self) -> torch.Tensor:
        """获取相机中心在世界坐标系中的位置"""
        return self.T


def build_rotation(r):
    """从四元数构建旋转矩阵 (N, 3, 3)"""
    norm = torch.sqrt(r[:, 0] * r[:, 0] + r[:, 1] * r[:, 1] + r[:, 2] * r[:, 2] + r[:, 3] * r[:, 3])
    q = r / norm[:, None]
    
    R = torch.zeros((q.size(0), 3, 3), device=r.device)
    
    r = q[:, 0]
    x = q[:, 1]
    y = q[:, 2]
    z = q[:, 3]
    
    R[:, 0, 0] = 1 - 2 * (y * y + z * z)
    R[:, 0, 1] = 2 * (x * y - r * z)
    R[:, 0, 2] = 2 * (x * z + r * y)
    R[:, 1, 0] = 2 * (x * y + r * z)
    R[:, 1, 1] = 1 - 2 * (x * x + z * z)
    R[:, 1, 2] = 2 * (y * z - r * x)
    R[:, 2, 0] = 2 * (x * z - r * y)
    R[:, 2, 1] = 2 * (y * z + r * x)
    R[:, 2, 2] = 1 - 2 * (x * x + y * y)
    return R


def build_scaling_rotation(s, r):
    """构建缩放旋转矩阵"""
    L = torch.zeros((s.shape[0], 3, 3), dtype=torch.float, device=s.device)
    R = build_rotation(r)
    
    L[:, 0, 0] = s[:, 0]
    L[:, 1, 1] = s[:, 1]
    L[:, 2, 2] = s[:, 2]

    L = R @ L
    return L


class GaussianRenderer:
    """
    3D Gaussian Splatting 渲染器
    
    封装 diff-gaussian-rasterization 的渲染功能
    """
    
    def __init__(self, debug: bool = False):
        self.debug = debug
        self.active_sh_degree = 3
        
    def render(self, viewpoint_camera: Camera, 
               means3D: torch.Tensor,
               opacity: torch.Tensor,
               scales: torch.Tensor,
               rotations: torch.Tensor,
               features: torch.Tensor,
               bg_color: torch.Tensor = None,
               scaling_modifier: float = 1.0,
               override_color: Optional[torch.Tensor] = None) -> dict:
        """
        渲染高斯到图像
        
        Args:
            viewpoint_camera: 相机参数
            means3D: 3D 高斯中心位置 (N, 3)
            opacity: 不透明度 (N, 1)，已经过 sigmoid
            scales: 缩放因子 (N, 3)，已经过 exp
            rotations: 旋转四元数 (N, 4)，已经过归一化
            features: SH 特征 (N, C, 3) 或 (N, K)
            bg_color: 背景颜色 (3,)
            scaling_modifier: 缩放修饰符
            override_color: 覆盖颜色 (N, 3)
            
        Returns:
            dict 包含渲染结果:
                - "render": 渲染图像 (3, H, W)
                - "viewspace_points": 投影后的 2D 位置
                - "visibility_filter": 可见性过滤
                - "radii": 投影半径
        """
        if bg_color is None:
            bg_color = torch.zeros(3, device=means3D.device)
        
        # 创建光栅化设置
        raster_settings = GaussianRasterizationSettings(
            image_height=int(viewpoint_camera.height),
            image_width=int(viewpoint_camera.width),
            tanfovx=math.tan(viewpoint_camera.fovx * 0.5),
            tanfovy=math.tan(viewpoint_camera.fovy * 0.5),
            bg=bg_color,
            scale_modifier=scaling_modifier,
            viewmatrix=viewpoint_camera.world_view_transform,
            projmatrix=viewpoint_camera.full_proj_transform,
            sh_degree=self.active_sh_degree,
            campos=viewpoint_camera.camera_center,
            prefiltered=False,
            debug=self.debug
        )
        
        # 创建光栅器
        rasterizer = GaussianRasterizer(raster_settings=raster_settings)
        
        # 计算 3D 协方差
        scales = scales
        rotations = rotations
        cov3D_precomp = None
        
        # 渲染 - means2D 需要 requires_grad=True 用于梯度传播
        means2D = torch.zeros_like(means3D[:, :2], requires_grad=True)
        
        rendered_image, radii, depth = rasterizer(
            means3D=means3D,
            means2D=means2D,
            shs=features,
            colors_precomp=override_color,
            opacities=opacity,
            scales=scales,
            rotations=rotations,
            cov3D_precomp=cov3D_precomp
        )
        
        return {
            "render": rendered_image,
            "viewspace_points": torch.zeros_like(means3D[:, :2]),  # 简化为2D投影位置
            "visibility_filter": radii > 0,
            "radii": radii,
            "depth": depth
        }


class MockGaussianRenderer:
    """
    模拟渲染器（当 diff-gaussian-rasterization 不可用时使用）
    """
    
    def __init__(self):
        pass
    
    def render(self, viewpoint_camera: Camera, 
               means3D: torch.Tensor,
               opacity: torch.Tensor,
               scales: torch.Tensor,
               rotations: torch.Tensor,
               features: torch.Tensor,
               bg_color: torch.Tensor = None,
               **kwargs) -> dict:
        """模拟渲染，返回随机图像"""
        H, W = viewpoint_camera.height, viewpoint_camera.width
        device = means3D.device
        
        if bg_color is None:
            bg_color = torch.zeros(3, device=device)
        
        # 创建简单的随机图像 - 需要梯度以支持反向传播
        # 使用高斯参数计算一个简单的加权颜色（保持梯度链）
        # 这是一个简化的模拟，实际应用中应该使用真实的渲染器
        
        # 基于位置计算一个简单的颜色（保持梯度链）
        mean_pos = means3D.mean(dim=0)  # (3,)
        base_color = torch.sigmoid(mean_pos)  # 保持梯度
        
        # 创建图像（需要梯度）
        rendered = base_color.view(3, 1, 1).expand(3, H, W).clone()
        rendered = rendered + torch.randn_like(rendered) * 0.1
        rendered = torch.clamp(rendered, 0, 1)
        
        return {
            "render": rendered,
            "viewspace_points": torch.zeros(means3D.shape[0], 2, device=device),
            "visibility_filter": torch.ones(means3D.shape[0], dtype=torch.bool, device=device),
            "radii": torch.ones(means3D.shape[0], device=device) * 10.0
        }


def get_renderer():
    """获取渲染器实例"""
    if DIFF_GS_AVAILABLE:
        return GaussianRenderer()
    else:
        return MockGaussianRenderer()
