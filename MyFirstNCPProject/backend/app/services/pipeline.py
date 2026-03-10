"""
数据处理流水线服务

@probe_ref: GS-Arch-002
@probe_ref: GS-Req-007
"""

import os
import shutil
import warnings
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from enum import Enum
import logging
import time
import random

import numpy as np
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

from app.models.schemas import TaskStatus, PipelineStage, Progress
from gaussian.model import GaussianModel
from gaussian.renderer import get_renderer, Camera
from gaussian.camera import (
    load_cameras_from_colmap, 
    create_mock_cameras, 
    camera_to_torch,
    load_image_tensor,
    resize_image_tensor
)


logger = logging.getLogger(__name__)


class ProcessingPipeline:
    """
    3D 重建处理流水线
    
    阶段顺序:
    1. validation - 图像验证
    2. colmap - COLMAP 位姿估计
    3. initialization - 高斯初始化
    4. training - 3DGS 训练
    5. export - 结果导出
    """
    
    stage_order = [
        "validation",
        "colmap",
        "initialization", 
        "training",
        "export"
    ]
    
    def __init__(self, work_dir: str = "./data"):
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
    def execute(self, task_id: str, image_paths: List[str], 
                config: Optional[Dict] = None,
                progress_callback: Optional[Callable[[Progress], None]] = None) -> Dict[str, Any]:
        """
        执行完整流水线
        
        Args:
            task_id: 任务唯一标识
            image_paths: 输入图像路径列表
            config: 任务配置
            progress_callback: 进度回调函数
            
        Returns:
            处理结果字典
        """
        config = config or {}
        results = {}
        
        total_stages = len(self.stage_order)
        
        try:
            # Stage 1: 图像验证
            self._report_progress(task_id, "validation", 0, "开始图像验证", progress_callback)
            validation_result = self._run_validation(image_paths)
            results["validation"] = validation_result
            self._report_progress(task_id, "validation", 100, "图像验证完成", progress_callback)
            
            if not validation_result.get("valid", False):
                raise ValueError(f"图像验证失败: {validation_result.get('error', '未知错误')}")
            
            # Stage 2: COLMAP 位姿估计
            self._report_progress(task_id, "colmap", 20, "开始 COLMAP 位姿估计", progress_callback)
            colmap_result = self._run_colmap(task_id, image_paths, progress_callback)
            results["colmap"] = colmap_result
            self._report_progress(task_id, "colmap", 40, "位姿估计完成", progress_callback)
            
            # Stage 3: 高斯初始化
            self._report_progress(task_id, "initialization", 40, "开始高斯初始化", progress_callback)
            init_result = self._run_initialization(colmap_result)
            results["initialization"] = init_result
            self._report_progress(task_id, "initialization", 50, "高斯初始化完成", progress_callback)
            
            # Stage 4: 3DGS 训练
            self._report_progress(task_id, "training", 50, "开始 3DGS 训练", progress_callback)
            training_result = self._run_training(
                task_id, 
                init_result["model"],
                colmap_result,
                config.get("training_iterations", 30000),
                progress_callback
            )
            results["training"] = training_result
            self._report_progress(task_id, "training", 90, "训练完成", progress_callback)
            
            # Stage 5: 结果导出
            self._report_progress(task_id, "export", 90, "开始导出结果", progress_callback)
            export_result = self._run_export(task_id, training_result["model"], config)
            results["export"] = export_result
            self._report_progress(task_id, "export", 100, "导出完成", progress_callback)
            
            return {
                "success": True,
                "task_id": task_id,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "task_id": task_id,
                "error": str(e),
                "results": results
            }
    
    def _report_progress(self, task_id: str, stage: str, percentage: float, 
                        message: str, callback: Optional[Callable[[Progress], None]]):
        """报告进度"""
        progress = Progress(
            task_id=task_id,
            stage=stage,
            percentage=percentage,
            message=message
        )
        if callback:
            callback(progress)
        logger.info(f"[{task_id}] {stage}: {percentage}% - {message}")
    
    def _run_validation(self, image_paths: List[str]) -> Dict[str, Any]:
        """
        图像验证阶段
        
        @probe_ref: GS-Req-002
        """
        valid_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.tif'}
        valid_images = []
        errors = []
        
        # 检查图像数量
        if len(image_paths) < 10:
            warnings.warn(f"图像数量较少 ({len(image_paths)} 张)，建议至少 50 张")
        
        if len(image_paths) > 1000:
            warnings.warn(f"图像数量较多 ({len(image_paths)} 张)，处理时间可能较长")
        
        for path in image_paths:
            ext = Path(path).suffix.lower()
            if ext not in valid_extensions:
                errors.append(f"不支持的格式: {path}")
                continue
            
            if not os.path.exists(path):
                errors.append(f"文件不存在: {path}")
                continue
            
            # 尝试读取图像尺寸
            try:
                # 简化的尺寸检查，实际应使用 PIL 或 OpenCV
                size = os.path.getsize(path)
                if size < 1024:  # 小于 1KB 的文件可能是无效的
                    errors.append(f"文件过小: {path}")
                    continue
                valid_images.append(path)
            except Exception as e:
                errors.append(f"无法读取文件 {path}: {e}")
        
        return {
            "valid": len(valid_images) > 0,
            "valid_images": valid_images,
            "errors": errors,
            "total_count": len(image_paths),
            "valid_count": len(valid_images)
        }
    
    def _run_colmap(self, task_id: str, image_paths: List[str],
                   progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        COLMAP 位姿估计阶段
        
        @probe_ref: GS-Req-003
        """
        # 创建任务工作目录
        task_dir = self.work_dir / "outputs" / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        
        sparse_dir = task_dir / "sparse"
        database_path = task_dir / "database.db"
        
        try:
            import pycolmap
            
            # 复制图像到工作目录
            images_dir = task_dir / "images"
            images_dir.mkdir(exist_ok=True)
            for img_path in image_paths:
                shutil.copy(img_path, images_dir / Path(img_path).name)
            
            # 特征提取
            if progress_callback:
                self._report_progress(task_id, "colmap", 20, "特征提取中...", progress_callback)
            
            pycolmap.extract_features(database_path, images_dir)
            
            # 特征匹配
            if progress_callback:
                self._report_progress(task_id, "colmap", 25, "特征匹配中...", progress_callback)
            
            pycolmap.match_exhaustive(database_path)
            
            # 稀疏重建
            if progress_callback:
                self._report_progress(task_id, "colmap", 30, "稀疏重建中...", progress_callback)
            
            sparse_dir.mkdir(exist_ok=True)
            maps = pycolmap.incremental_mapping(database_path, images_dir, sparse_dir)
            
            # 获取重建结果
            if len(maps) == 0:
                raise RuntimeError("COLMAP 重建失败，无法生成地图")
            
            reconstruction = maps[0]
            
            # 验证注册率
            num_images = len(image_paths)
            num_registered = reconstruction.num_reg_images()
            registration_rate = num_registered / num_images if num_images > 0 else 0
            
            if registration_rate < 0.8:
                warnings.warn(f"图像注册率 {registration_rate:.1%} 低于 80%")
            
            # 验证点云数量
            num_points = reconstruction.num_points3D()
            if num_points < 10000:
                warnings.warn(f"稀疏点云数量 {num_points} 少于 10000")
            
            # 保存重建结果
            reconstruction.write(sparse_dir)
            
            return {
                "success": True,
                "reconstruction": reconstruction,
                "sparse_dir": str(sparse_dir),
                "images_dir": str(images_dir),
                "num_registered": num_registered,
                "num_points": num_points,
                "registration_rate": registration_rate
            }
            
        except ImportError:
            logger.warning("pycolmap 未安装，使用模拟数据")
            # 返回模拟数据用于测试
            return {
                "success": True,
                "sparse_dir": str(sparse_dir),
                "images_dir": str(Path(image_paths[0]).parent),
                "num_registered": len(image_paths),
                "num_points": 15000,
                "registration_rate": 1.0,
                "mock": True
            }
        except Exception as e:
            raise RuntimeError(f"COLMAP 处理失败: {e}")
    
    def _run_initialization(self, colmap_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        高斯初始化阶段
        
        @probe_ref: GS-Req-004
        """
        try:
            # 从 COLMAP 结果加载点云
            if colmap_result.get("mock"):
                # 模拟点云数据
                import numpy as np
                num_points = 1000
                points = np.random.randn(num_points, 3).astype(np.float32) * 0.5
                colors = np.random.randint(0, 255, (num_points, 3), dtype=np.uint8)
            else:
                # 从 reconstruction 读取点云
                reconstruction = colmap_result["reconstruction"]
                points = []
                colors = []
                for point3D_id in reconstruction.points3D:
                    point = reconstruction.points3D[point3D_id]
                    points.append(point.xyz)
                    colors.append(point.color)
                import numpy as np
                points = np.array(points, dtype=np.float32)
                colors = np.array(colors, dtype=np.uint8)
            
            # 创建高斯模型
            model = GaussianModel(sh_degree=3)
            model.from_colmap_points(points, colors)
            
            return {
                "success": True,
                "model": model,
                "num_gaussians": points.shape[0]
            }
            
        except Exception as e:
            raise RuntimeError(f"高斯初始化失败: {e}")
    
    def _run_training(self, task_id: str, model: GaussianModel,
                     colmap_result: Dict[str, Any],
                     iterations: int,
                     progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        3DGS 训练阶段 - 使用 diff-gaussian-rasterization 进行真实训练
        
        @probe_ref: GS-Req-004
        """
        import numpy as np
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")
        
        model = model.to(device)
        model.train()
        
        # 设置优化器
        optimizer = torch.optim.Adam([
            {'params': [model._xyz], 'lr': 0.00016, 'name': 'xyz'},
            {'params': [model._features_dc], 'lr': 0.0025, 'name': 'f_dc'},
            {'params': [model._features_rest], 'lr': 0.0025 / 20.0, 'name': 'f_rest'},
            {'params': [model._opacity], 'lr': 0.05, 'name': 'opacity'},
            {'params': [model._scaling], 'lr': 0.005, 'name': 'scaling'},
            {'params': [model._rotation], 'lr': 0.001, 'name': 'rotation'}
        ])
        
        # 学习率调度器 - 手动调整 xyz 学习率
        initial_xyz_lr = 0.00016
        def update_xyz_lr(iteration):
            """计算 xyz 学习率衰减"""
            if iteration < 1000:
                return initial_xyz_lr
            else:
                return initial_xyz_lr * (0.01 ** ((iteration - 1000) / (iterations - 1000)))
        
        # 加载相机参数
        if colmap_result.get("mock"):
            # 使用模拟相机
            images_dir = colmap_result["images_dir"]
            image_files = [f for f in Path(images_dir).glob("*") 
                          if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']]
            if not image_files:
                # 如果没有找到图像，使用输入路径
                image_files = colmap_result.get("input_images", [])
            cameras = create_mock_cameras([str(f) for f in image_files[:20]])  # 限制相机数量
        else:
            # 从 COLMAP 加载相机
            reconstruction = colmap_result["reconstruction"]
            images_dir = colmap_result["images_dir"]
            cameras = load_cameras_from_colmap(reconstruction, images_dir)
        
        if len(cameras) == 0:
            raise RuntimeError("没有可用的相机参数")
        
        logger.info(f"Training with {len(cameras)} cameras, {model.get_xyz.shape[0]} gaussians")
        
        # 加载图像数据
        camera_data = []
        for cam_info in cameras:
            try:
                cam_torch = camera_to_torch(cam_info, device)
                # 加载并调整图像大小
                img_tensor = load_image_tensor(cam_info.image_path, device)
                img_resized, scale = resize_image_tensor(img_tensor, max_size=1200)
                
                # 根据缩放调整相机内参
                if scale < 1.0:
                    cam_torch["focal_x"] *= scale
                    cam_torch["focal_y"] *= scale
                    cam_torch["principal_x"] *= scale
                    cam_torch["principal_y"] *= scale
                    cam_torch["width"] = int(cam_torch["width"] * scale)
                    cam_torch["height"] = int(cam_torch["height"] * scale)
                
                cam_torch["image"] = img_resized
                camera_data.append(cam_torch)
            except Exception as e:
                logger.warning(f"Failed to load image {cam_info.image_path}: {e}")
        
        if len(camera_data) == 0:
            raise RuntimeError("没有成功加载任何图像")
        
        logger.info(f"Successfully loaded {len(camera_data)} images for training")
        
        # 初始化渲染器
        renderer = get_renderer()
        
        # 背景颜色（白色或黑色）
        bg_color = torch.tensor([0.0, 0.0, 0.0], device=device)
        
        # 训练循环
        start_time = time.time()
        psnr_list = []
        
        for iteration in range(iterations):
            # 随机选择一个相机
            viewpoint_cam = random.choice(camera_data)
            
            # 渲染
            render_pkg = self._render_view(
                renderer, model, viewpoint_cam, bg_color
            )
            
            rendered_image = render_pkg["render"]
            gt_image = viewpoint_cam["image"]
            
            # 确保尺寸匹配
            if rendered_image.shape != gt_image.shape:
                rendered_image = F.interpolate(
                    rendered_image.unsqueeze(0),
                    size=(gt_image.shape[1], gt_image.shape[2]),
                    mode='bilinear',
                    align_corners=False
                ).squeeze(0)
            
            # 计算 L1 损失
            Ll1 = F.l1_loss(rendered_image, gt_image)
            
            # 计算 SSIM 损失（简化版）
            ssim_loss = 1.0 - self._calculate_ssim(rendered_image, gt_image)
            
            # 总损失
            loss = (1.0 - 0.2) * Ll1 + 0.2 * ssim_loss
            
            loss.backward()
            
            with torch.no_grad():
                # 计算 PSNR
                psnr = self._calculate_psnr(rendered_image, gt_image)
                psnr_list.append(psnr.item())
                
                # 自适应密度控制
                if iteration > 500 and iteration % 100 == 0:
                    self._densify_and_prune(model, optimizer, iteration)
                
                # 提升 SH 阶数
                if iteration % 1000 == 0:
                    model.oneupSHdegree()
                
                optimizer.step()
                
                # 手动更新 xyz 学习率
                new_lr = update_xyz_lr(iteration)
                for param_group in optimizer.param_groups:
                    if param_group['name'] == 'xyz':
                        param_group['lr'] = new_lr
                
                optimizer.zero_grad(set_to_none=True)
            
            # 定期报告进度
            if iteration % 100 == 0:
                progress = 50 + (iteration / iterations) * 40
                avg_psnr = np.mean(psnr_list[-100:]) if len(psnr_list) > 0 else 0
                if progress_callback:
                    self._report_progress(
                        task_id, "training", progress,
                        f"Iteration {iteration}/{iterations}, Loss: {loss.item():.4f}, PSNR: {avg_psnr:.2f}",
                        progress_callback
                    )
                logger.info(f"Iteration {iteration}/{iterations}, Loss: {loss.item():.4f}, PSNR: {avg_psnr:.2f}")
        
        training_time = time.time() - start_time
        final_psnr = np.mean(psnr_list[-100:]) if len(psnr_list) > 0 else 0
        
        # 计算 SSIM
        ssim_values = []
        model.eval()
        with torch.no_grad():
            for viewpoint_cam in camera_data[:min(10, len(camera_data))]:
                render_pkg = self._render_view(renderer, model, viewpoint_cam, bg_color)
                rendered_image = render_pkg["render"]
                gt_image = viewpoint_cam["image"]
                if rendered_image.shape != gt_image.shape:
                    rendered_image = F.interpolate(
                        rendered_image.unsqueeze(0),
                        size=(gt_image.shape[1], gt_image.shape[2]),
                        mode='bilinear',
                        align_corners=False
                    ).squeeze(0)
                ssim = self._calculate_ssim(rendered_image, gt_image)
                ssim_values.append(ssim.item())
        
        final_ssim = np.mean(ssim_values) if ssim_values else 0
        
        metrics = {
            "psnr": float(final_psnr),
            "ssim": float(final_ssim),
            "num_gaussians": model.get_xyz.shape[0],
            "training_time": float(training_time)
        }
        
        logger.info(f"Training completed: PSNR={final_psnr:.2f}, SSIM={final_ssim:.4f}, "
                   f"Gaussians={model.get_xyz.shape[0]}, Time={training_time:.1f}s")
        
        return {
            "success": True,
            "model": model.cpu(),
            "metrics": metrics
        }
    
    def _render_view(self, renderer, model: GaussianModel, 
                    viewpoint_cam: Dict, bg_color: torch.Tensor) -> Dict:
        """渲染单个视图"""
        # 创建相机对象
        tanfovx = viewpoint_cam["width"] / (2.0 * viewpoint_cam["focal_x"])
        tanfovy = viewpoint_cam["height"] / (2.0 * viewpoint_cam["focal_y"])
        fovx = 2.0 * np.arctan(tanfovx)
        fovy = 2.0 * np.arctan(tanfovy)
        
        camera = Camera(
            width=viewpoint_cam["width"],
            height=viewpoint_cam["height"],
            focal_x=viewpoint_cam["focal_x"],
            focal_y=viewpoint_cam["focal_y"],
            principal_x=viewpoint_cam["principal_x"],
            principal_y=viewpoint_cam["principal_y"],
            R=viewpoint_cam["R"],
            T=viewpoint_cam["T"],
            device=viewpoint_cam["R"].device
        )
        camera.fovx = fovx
        camera.fovy = fovy
        
        # 获取高斯参数
        means3D = model.get_xyz
        opacity = model.get_opacity
        scales = model.get_scaling
        rotations = model.get_rotation
        features = model.get_features
        
        # 渲染
        render_pkg = renderer.render(
            viewpoint_camera=camera,
            means3D=means3D,
            opacity=opacity,
            scales=scales,
            rotations=rotations,
            features=features,
            bg_color=bg_color
        )
        
        return render_pkg
    
    def _densify_and_prune(self, model: GaussianModel, optimizer, iteration: int):
        """自适应密度控制和修剪"""
        # 简化实现：只进行修剪
        if iteration > 1000 and iteration % 1000 == 0:
            model.prune_low_opacity(min_opacity=0.005)
    
    def _calculate_psnr(self, img1: torch.Tensor, img2: torch.Tensor) -> torch.Tensor:
        """计算 PSNR"""
        mse = F.mse_loss(img1, img2)
        if mse == 0:
            return torch.tensor(100.0, device=img1.device)
        return 20 * torch.log10(1.0 / torch.sqrt(mse))
    
    def _calculate_ssim(self, img1: torch.Tensor, img2: torch.Tensor, window_size: int = 11) -> torch.Tensor:
        """计算 SSIM（简化实现）"""
        # 简化的 SSIM 计算
        mu1 = F.avg_pool2d(img1.unsqueeze(0), window_size, stride=1, padding=window_size//2)
        mu2 = F.avg_pool2d(img2.unsqueeze(0), window_size, stride=1, padding=window_size//2)
        
        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2
        
        sigma1_sq = F.avg_pool2d(img1.unsqueeze(0) ** 2, window_size, stride=1, padding=window_size//2) - mu1_sq
        sigma2_sq = F.avg_pool2d(img2.unsqueeze(0) ** 2, window_size, stride=1, padding=window_size//2) - mu2_sq
        sigma12 = F.avg_pool2d(img1.unsqueeze(0) * img2.unsqueeze(0), window_size, stride=1, padding=window_size//2) - mu1_mu2
        
        C1 = 0.01 ** 2
        C2 = 0.03 ** 2
        
        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
        return ssim_map.mean()
    
    def _run_export(self, task_id: str, model: GaussianModel,
                   config: Dict[str, Any]) -> Dict[str, Any]:
        """
        结果导出阶段
        
        @probe_ref: GS-Req-005
        """
        output_dir = self.work_dir / "outputs" / task_id / "result"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_formats = config.get("output_formats", ["ply", "splat"])
        result_files = {}
        
        try:
            if "ply" in output_formats:
                ply_path = output_dir / "model.ply"
                model.save_ply(str(ply_path))
                result_files["ply"] = str(ply_path)
            
            if "splat" in output_formats:
                splat_path = output_dir / "model.splat"
                model.save_splat(str(splat_path))
                result_files["splat"] = str(splat_path)
                
                # 验证 SPLAT 文件大小
                if "ply" in result_files:
                    ply_size = (output_dir / "model.ply").stat().st_size
                    splat_size = (output_dir / "model.splat").stat().st_size
                    if splat_size > ply_size * 0.5:
                        warnings.warn(f"SPLAT file size ({splat_size}) exceeds 50% of PLY ({ply_size})")
            
            return {
                "success": True,
                "output_dir": str(output_dir),
                "files": result_files
            }
            
        except Exception as e:
            raise RuntimeError(f"导出失败: {e}")
