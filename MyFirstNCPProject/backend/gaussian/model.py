"""
3D Gaussian Splatting 核心模型

@probe_ref: GS-Arch-004
@probe_ref: GS-Req-004
"""

import numpy as np
import torch
import torch.nn as nn
from typing import Tuple, Optional
import os

try:
    from diff_gaussian_rasterization import build_scaling_rotation, strip_symmetric
except ImportError:
    # 如果库未安装，定义占位函数
    def build_scaling_rotation(s, r):
        return torch.eye(3, device=s.device).unsqueeze(0).expand(s.shape[0], -1, -1)
    
    def strip_symmetric(cov):
        return cov


class GaussianModel(nn.Module):
    """
    3D Gaussian Splatting 模型
    
    参数说明:
    - xyz: 高斯中心位置 (N, 3)
    - features_dc: 直流颜色分量 (N, 1, 3) - 直接颜色
    - features_rest: 球谐系数 (N, K, 3) - K = (sh_degree+1)^2 - 1
    - opacity: 不透明度 (N, 1) - 经 sigmoid 激活
    - scaling: 缩放因子 (N, 3) - 经 exp 激活
    - rotation: 旋转四元数 (N, 4) - 归一化
    """
    
    def setup_functions(self):
        """初始化辅助函数"""
        pass
    
    def __init__(self, sh_degree: int = 3):
        super().__init__()
        self.sh_degree = sh_degree
        self.max_sh_degree = sh_degree
        
        # 可学习参数
        self._xyz = torch.empty(0)
        self._features_dc = torch.empty(0)
        self._features_rest = torch.empty(0)
        self._opacity = torch.empty(0)
        self._scaling = torch.empty(0)
        self._rotation = torch.empty(0)
        
        self.active_sh_degree = 0  # 渐进式学习的当前 SH 阶数
        
    @property
    def get_xyz(self) -> torch.Tensor:
        """获取高斯中心位置"""
        return self._xyz
    
    @property
    def get_features(self) -> torch.Tensor:
        """获取所有颜色特征 (dc + rest)"""
        features_dc = self._features_dc
        features_rest = self._features_rest
        return torch.cat((features_dc, features_rest), dim=1)
    
    @property
    def get_opacity(self) -> torch.Tensor:
        """获取不透明度 (sigmoid 激活后)"""
        return torch.sigmoid(self._opacity)
    
    @property
    def get_scaling(self) -> torch.Tensor:
        """获取缩放因子 (exp 激活后)"""
        return torch.exp(self._scaling)
    
    @property
    def get_rotation(self) -> torch.Tensor:
        """获取旋转四元数 (归一化后)"""
        return torch.nn.functional.normalize(self._rotation, dim=-1)
    
    def oneupSHdegree(self):
        """提升 SH 阶数（渐进式训练）"""
        if self.active_sh_degree < self.max_sh_degree:
            self.active_sh_degree += 1
    
    def get_covariance(self, scaling_modifier: float = 1.0) -> torch.Tensor:
        """
        计算 3D 协方差矩阵
        
        Args:
            scaling_modifier: 缩放修饰符
            
        Returns:
            协方差矩阵 (N, 3, 3)
        """
        return self.build_covariance_from_scaling_rotation(
            self.get_scaling, scaling_modifier, self._rotation
        )
    
    @staticmethod
    def build_covariance_from_scaling_rotation(scaling, scaling_modifier, rotation):
        """从缩放和旋转构建协方差矩阵"""
        L = build_scaling_rotation(scaling_modifier * scaling, rotation)
        actual_covariance = L @ L.transpose(1, 2)
        symm = strip_symmetric(actual_covariance)
        return symm
    
    def densification_postfix(self, new_xyz, new_features_dc, new_features_rest, 
                             new_opacities, new_scaling, new_rotation):
        """密度控制后更新参数"""
        self._xyz = nn.Parameter(torch.cat([self._xyz, new_xyz], dim=0).requires_grad_(True))
        self._features_dc = nn.Parameter(torch.cat([self._features_dc, new_features_dc], dim=0).requires_grad_(True))
        self._features_rest = nn.Parameter(torch.cat([self._features_rest, new_features_rest], dim=0).requires_grad_(True))
        self._opacity = nn.Parameter(torch.cat([self._opacity, new_opacities], dim=0).requires_grad_(True))
        self._scaling = nn.Parameter(torch.cat([self._scaling, new_scaling], dim=0).requires_grad_(True))
        self._rotation = nn.Parameter(torch.cat([self._rotation, new_rotation], dim=0).requires_grad_(True))
    
    def cat_tensors_to_optimizer(self, tensors_dict, optimizer):
        """将新张量添加到优化器"""
        optimizable_tensors = {}
        for group in optimizer.param_groups:
            assert len(group["params"]) == 1
            extension_tensor = tensors_dict[group["name"]]
            stored_state = optimizer.state.get(group['params'][0], None)
            if stored_state is not None:
                stored_state["exp_avg"] = torch.cat(
                    (stored_state["exp_avg"], torch.zeros_like(extension_tensor)), dim=0
                )
                stored_state["exp_avg_sq"] = torch.cat(
                    (stored_state["exp_avg_sq"], torch.zeros_like(extension_tensor)), dim=0
                )
                del optimizer.state[group['params'][0]]
                group["params"][0] = nn.Parameter(
                    torch.cat((group["params"][0], extension_tensor), dim=0).requires_grad_(True)
                )
                optimizer.state[group['params'][0]] = stored_state
                optimizable_tensors[group["name"]] = group["params"][0]
            else:
                group["params"][0] = nn.Parameter(
                    torch.cat((group["params"][0], extension_tensor), dim=0).requires_grad_(True)
                )
                optimizable_tensors[group["name"]] = group["params"][0]
        return optimizable_tensors
    
    def prune_optimizer(self, mask, optimizer):
        """从优化器中修剪参数"""
        optimizable_tensors = {}
        for group in optimizer.param_groups:
            stored_state = optimizer.state.get(group['params'][0], None)
            if stored_state is not None:
                stored_state["exp_avg"] = stored_state["exp_avg"][mask]
                stored_state["exp_avg_sq"] = stored_state["exp_avg_sq"][mask]
                del optimizer.state[group['params'][0]]
                group["params"][0] = nn.Parameter(group["params"][0][mask].requires_grad_(True))
                optimizer.state[group['params'][0]] = stored_state
                optimizable_tensors[group["name"]] = group["params"][0]
            else:
                group["params"][0] = nn.Parameter(group["params"][0][mask].requires_grad_(True))
                optimizable_tensors[group["name"]] = group["params"][0]
        return optimizable_tensors
    
    def get_covariance(self, scaling_modifier: float = 1.0) -> torch.Tensor:
        """
        计算 3D 协方差矩阵
        
        Args:
            scaling_modifier: 缩放修饰符
            
        Returns:
            协方差矩阵 (N, 3, 3)
        """
        # 从四元数构建旋转矩阵
        r = self.get_rotation
        scaling = self.get_scaling * scaling_modifier
        
        # 构建协方差矩阵: R @ S @ S @ R^T
        # 简化计算
        r_matrix = self._quaternion_to_rotation_matrix(r)
        
        # 构建缩放矩阵
        S = torch.diag_embed(scaling)
        
        # 计算协方差
        covariance = r_matrix @ S @ S.transpose(-2, -1) @ r_matrix.transpose(-2, -1)
        return covariance
    
    def _quaternion_to_rotation_matrix(self, q: torch.Tensor) -> torch.Tensor:
        """将四元数转换为旋转矩阵"""
        # q: (N, 4) -> (w, x, y, z)
        w, x, y, z = q[:, 0], q[:, 1], q[:, 2], q[:, 3]
        
        N = q.shape[0]
        R = torch.zeros((N, 3, 3), device=q.device, dtype=q.dtype)
        
        # 归一化
        norm = torch.sqrt(w*w + x*x + y*y + z*z)
        w, x, y, z = w/norm, x/norm, y/norm, z/norm
        
        R[:, 0, 0] = 1 - 2*(y*y + z*z)
        R[:, 0, 1] = 2*(x*y - w*z)
        R[:, 0, 2] = 2*(x*z + w*y)
        
        R[:, 1, 0] = 2*(x*y + w*z)
        R[:, 1, 1] = 1 - 2*(x*x + z*z)
        R[:, 1, 2] = 2*(y*z - w*x)
        
        R[:, 2, 0] = 2*(x*z - w*y)
        R[:, 2, 1] = 2*(y*z + w*x)
        R[:, 2, 2] = 1 - 2*(x*x + y*y)
        
        return R
    
    def from_colmap_points(self, points: np.ndarray, colors: np.ndarray) -> None:
        """
        从 COLMAP 点云初始化高斯模型
        
        Args:
            points: 点云位置 (N, 3)
            colors: 点云颜色 (N, 3) [0-255]
        """
        num_points = points.shape[0]
        
        # 转换为 torch tensor
        fused_point_cloud = torch.tensor(points, dtype=torch.float32)
        fused_color = torch.tensor(colors, dtype=torch.float32) / 255.0
        
        # 初始化颜色特征
        features = torch.zeros((num_points, 3, (self.sh_degree + 1) ** 2))
        features[:, :3, 0] = fused_color  # DC 分量
        features[:, 3:, 1:] = 0.0  # 高阶 SH 系数初始化为 0
        
        self._features_dc = nn.Parameter(features[:, :, 0:1].transpose(1, 2).contiguous().requires_grad_(True))
        self._features_rest = nn.Parameter(features[:, :, 1:].transpose(1, 2).contiguous().requires_grad_(True))
        
        # 初始化位置
        self._xyz = nn.Parameter(fused_point_cloud.requires_grad_(True))
        
        # 初始化不透明度 - 设置为较小的初始值
        dist2 = torch.clamp_min(
            self._dist2_to_k_nearest_neighbors(fused_point_cloud, k=4), 
            0.0000001
        )
        scales = torch.log(torch.sqrt(dist2))[..., None].repeat(1, 3)
        self._scaling = nn.Parameter(scales.requires_grad_(True))
        
        # 初始化旋转 (单位四元数)
        rots = torch.zeros((num_points, 4), device="cpu")
        rots[:, 0] = 1  # w = 1
        self._rotation = nn.Parameter(rots.requires_grad_(True))
        
        # 初始化不透明度
        self._opacity = nn.Parameter(torch.zeros((num_points, 1), dtype=torch.float32).requires_grad_(True))
        
    def _dist2_to_k_nearest_neighbors(self, points: torch.Tensor, k: int = 4) -> torch.Tensor:
        """计算每个点到其第 k 近邻的距离"""
        # 简化的距离计算
        if points.shape[0] <= k:
            return torch.ones(points.shape[0], device=points.device) * 0.01
        dists = torch.cdist(points, points)
        # 排除自身 (距离为 0)
        dists = torch.where(dists > 0, dists, torch.inf)
        # 取第 k 小的距离
        sorted_dists, _ = torch.sort(dists, dim=1)
        return sorted_dists[:, min(k-1, dists.shape[1]-1)]
    
    def densify_and_split(self, grads: torch.Tensor, grad_threshold: float = 0.0002, 
                         scene_extent: float = 1.0, N: int = 2) -> None:
        """
        自适应密度控制 - 分裂大高斯
        
        将具有较大视图空间位置梯度的高斯分裂为两个较小的高斯。
        """
        # 简化的实现
        n_init_points = self.get_xyz.shape[0]
        device = self.get_xyz.device
        
        # 筛选出需要分裂的高斯
        padded_grad = torch.zeros(n_init_points, device=device)
        padded_grad[:grads.shape[0]] = grads.squeeze()
        selected_pts_mask = torch.where(padded_grad >= grad_threshold, True, False)
        selected_pts_mask = torch.logical_and(
            selected_pts_mask,
            torch.max(self.get_scaling, dim=1).values > scene_extent * 0.01
        )
        
        # 分裂逻辑简化版
        if selected_pts_mask.sum() > 0:
            # 获取被选中的点
            selected_xyz = self._xyz[selected_pts_mask]
            selected_features_dc = self._features_dc[selected_pts_mask]
            selected_features_rest = self._features_rest[selected_pts_mask]
            selected_opacity = self._opacity[selected_pts_mask]
            selected_scaling = self._scaling[selected_pts_mask]
            selected_rotation = self._rotation[selected_pts_mask]
            
            # 创建两个副本（简化实现）
            stds = self.get_scaling[selected_pts_mask]
            means = torch.zeros((stds.size(0), 3), device=device)
            samples = torch.normal(mean=means, std=stds)
            
            new_xyz = selected_xyz + samples
            new_features_dc = selected_features_dc
            new_features_rest = selected_features_rest
            new_opacities = selected_opacity
            new_scaling = self._scaling[selected_pts_mask] - torch.log(torch.tensor([2.0], device=device))
            new_rotation = selected_rotation
            
            # 更新参数
            self._xyz = nn.Parameter(torch.cat([self._xyz, new_xyz], dim=0).requires_grad_(True))
            self._features_dc = nn.Parameter(torch.cat([self._features_dc, new_features_dc], dim=0).requires_grad_(True))
            self._features_rest = nn.Parameter(torch.cat([self._features_rest, new_features_rest], dim=0).requires_grad_(True))
            self._opacity = nn.Parameter(torch.cat([self._opacity, new_opacities], dim=0).requires_grad_(True))
            self._scaling = nn.Parameter(torch.cat([self._scaling, new_scaling], dim=0).requires_grad_(True))
            self._rotation = nn.Parameter(torch.cat([self._rotation, new_rotation], dim=0).requires_grad_(True))
    
    def densify_and_clone(self, grads: torch.Tensor, grad_threshold: float = 0.0002,
                         scene_extent: float = 1.0) -> None:
        """
        自适应密度控制 - 克隆小高斯
        
        克隆具有较小尺度和较大梯度的高斯。
        """
        selected_pts_mask = torch.where(
            torch.norm(grads, dim=-1) >= grad_threshold, True, False
        )
        selected_pts_mask = torch.logical_and(
            selected_pts_mask,
            torch.max(self.get_scaling, dim=1).values <= scene_extent * 0.01
        )
        
        if selected_pts_mask.sum() > 0:
            new_xyz = self._xyz[selected_pts_mask]
            new_features_dc = self._features_dc[selected_pts_mask]
            new_features_rest = self._features_rest[selected_pts_mask]
            new_opacities = self._opacity[selected_pts_mask]
            new_scaling = self._scaling[selected_pts_mask]
            new_rotation = self._rotation[selected_pts_mask]
            
            self._xyz = nn.Parameter(torch.cat([self._xyz, new_xyz], dim=0).requires_grad_(True))
            self._features_dc = nn.Parameter(torch.cat([self._features_dc, new_features_dc], dim=0).requires_grad_(True))
            self._features_rest = nn.Parameter(torch.cat([self._features_rest, new_features_rest], dim=0).requires_grad_(True))
            self._opacity = nn.Parameter(torch.cat([self._opacity, new_opacities], dim=0).requires_grad_(True))
            self._scaling = nn.Parameter(torch.cat([self._scaling, new_scaling], dim=0).requires_grad_(True))
            self._rotation = nn.Parameter(torch.cat([self._rotation, new_rotation], dim=0).requires_grad_(True))
    
    def prune_low_opacity(self, min_opacity: float = 0.005) -> None:
        """
        修剪低不透明度高斯
        
        Args:
            min_opacity: 最小不透明度阈值
        """
        prune_mask = (self.get_opacity < min_opacity).squeeze()
        valid_mask = ~prune_mask
        
        self._xyz = nn.Parameter(self._xyz[valid_mask].requires_grad_(True))
        self._features_dc = nn.Parameter(self._features_dc[valid_mask].requires_grad_(True))
        self._features_rest = nn.Parameter(self._features_rest[valid_mask].requires_grad_(True))
        self._opacity = nn.Parameter(self._opacity[valid_mask].requires_grad_(True))
        self._scaling = nn.Parameter(self._scaling[valid_mask].requires_grad_(True))
        self._rotation = nn.Parameter(self._rotation[valid_mask].requires_grad_(True))
    
    def save_ply(self, path: str) -> None:
        """
        导出为 PLY 格式
        
        @probe_ref: GS-Req-005
        """
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
        
        xyz = self._xyz.detach().cpu().numpy()
        normals = np.zeros_like(xyz)
        
        # DC 特征是 (N, 1, 3)，展平为 (N, 3)
        f_dc = self._features_dc.detach().transpose(1, 2).flatten(start_dim=1).contiguous().cpu().numpy()
        
        # 剩余 SH 系数展平
        f_rest = self._features_rest.detach().transpose(1, 2).flatten(start_dim=1).contiguous().cpu().numpy()
        
        opacities = self._opacity.detach().cpu().numpy()
        scale = self._scaling.detach().cpu().numpy()
        rotation = self._rotation.detach().cpu().numpy()
        
        # 计算每个属性的列数
        num_dc = f_dc.shape[1]  # 应该是 3
        num_rest = f_rest.shape[1]  # 应该是 45 (对于 sh_degree=3)
        
        # 构建 dtype（与 attributes 列数严格对应）
        # xyz(3) + normals(3) + f_dc(3) + f_rest(45) + opacity(1) + scale(3) + rotation(4) = 62
        dtype_full = [
            ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
            ('nx', 'f4'), ('ny', 'f4'), ('nz', 'f4'),
        ] + [(f'f_dc_{i}', 'f4') for i in range(num_dc)] + \
                 [(f'f_rest_{i}', 'f4') for i in range(num_rest)] + \
                 [('opacity', 'f4')] + \
                 [(f'scale_{i}', 'f4') for i in range(scale.shape[1])] + \
                 [(f'rot_{i}', 'f4') for i in range(rotation.shape[1])]
        
        elements = np.empty(xyz.shape[0], dtype=dtype_full)
        attributes = np.concatenate((xyz, normals, f_dc, f_rest, opacities, scale, rotation), axis=1)
        elements[:] = list(map(tuple, attributes))
        
        from plyfile import PlyElement, PlyData
        el = PlyElement.describe(elements, 'vertex')
        PlyData([el]).write(path)
    
    def save_splat(self, path: str) -> None:
        """
        导出为 SPLAT 格式（压缩格式）
        
        @probe_ref: GS-Req-005
        SPLAT 格式：位置(3) + 缩放(3) + 颜色(4) + 旋转(4) = 14 floats
        """
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
        
        xyz = self._xyz.detach().cpu().numpy()
        scales = self.get_scaling.detach().cpu().numpy()
        colors = self.get_features[:, 0, :].detach().cpu().numpy()  # DC 分量
        # 转换为 [0, 255] 范围并添加 alpha
        colors_uint8 = np.clip(colors * 255, 0, 255).astype(np.uint8)
        opacity_uint8 = np.clip(self.get_opacity.detach().cpu().numpy() * 255, 0, 255).astype(np.uint8)
        colors_rgba = np.concatenate([colors_uint8, opacity_uint8], axis=1)
        
        # 旋转四元数 (uint8 编码)
        rot = self.get_rotation.detach().cpu().numpy()
        rot_uint8 = np.clip((rot + 1.0) / 2.0 * 255, 0, 255).astype(np.uint8)
        
        # SPLAT 格式: float32[3] 位置 + uint8[3] 缩放 + uint8[4] 颜色 + uint8[4] 旋转
        # 简化为全部 float32 便于处理
        splat_data = np.concatenate([xyz, scales, colors_rgba.astype(np.float32) / 255.0, rot], axis=1)
        
        splat_data.astype(np.float32).tofile(path)
    

