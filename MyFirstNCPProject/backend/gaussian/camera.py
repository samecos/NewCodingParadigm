"""
相机参数处理工具

处理 COLMAP 输出的相机参数，转换为渲染器可用的格式
@probe_ref: GS-Req-003
"""

import numpy as np
import torch
from typing import Dict, List, Tuple, Optional
from PIL import Image
from pathlib import Path





class CameraInfo:
    """相机信息类"""
    
    def __init__(self, uid: int, R: np.ndarray, T: np.ndarray, 
                 focal_x: float, focal_y: float, 
                 principal_x: float, principal_y: float,
                 image_name: str, image_path: str, 
                 width: int, height: int):
        self.uid = uid
        self.R = R  # 旋转矩阵 (3, 3)
        self.T = T  # 平移向量 (3,)
        self.focal_x = focal_x
        self.focal_y = focal_y
        self.principal_x = principal_x
        self.principal_y = principal_y
        self.image_name = image_name
        self.image_path = image_path
        self.width = width
        self.height = height


def load_cameras_from_colmap(reconstruction, image_dir: str) -> List[CameraInfo]:
    """
    从 COLMAP 重建结果加载相机参数
    
    Args:
        reconstruction: COLMAP reconstruction 对象
        image_dir: 图像目录路径
        
    Returns:
        CameraInfo 列表
    """
    cameras = []
    
    for idx, image_id in enumerate(reconstruction.images):
        image = reconstruction.images[image_id]
        camera = reconstruction.cameras[image.camera_id]
        
        # 获取图像尺寸
        width = camera.width
        height = camera.height
        
        # 获取相机内参
        if camera.model == "PINHOLE":
            focal_x = camera.params[0]
            focal_y = camera.params[1]
            principal_x = camera.params[2]
            principal_y = camera.params[3]
        elif camera.model == "SIMPLE_PINHOLE":
            focal_x = focal_y = camera.params[0]
            principal_x = camera.params[1]
            principal_y = camera.params[2]
        else:
            # 默认使用 PINHOLE 模型
            focal_x = focal_y = max(width, height) * 1.2
            principal_x = width / 2
            principal_y = height / 2
        
        # 获取相机外参 (pycolmap 新版本 API)
        # cam_from_world() 返回 Rigid3d 对象
        cam_from_world = image.cam_from_world
        if callable(cam_from_world):
            cam_from_world = cam_from_world()
        
        # 获取旋转矩阵和平移向量
        R = cam_from_world.rotation.matrix()
        T = np.array(cam_from_world.translation)
        
        # 构建图像路径
        image_path = Path(image_dir) / image.name
        
        cam_info = CameraInfo(
            uid=idx,
            R=R,
            T=T,
            focal_x=focal_x,
            focal_y=focal_y,
            principal_x=principal_x,
            principal_y=principal_y,
            image_name=image.name,
            image_path=str(image_path),
            width=width,
            height=height
        )
        cameras.append(cam_info)
    
    return cameras


def create_mock_cameras(image_paths: List[str]) -> List[CameraInfo]:
    """
    为测试创建模拟相机参数
    
    Args:
        image_paths: 图像路径列表
        
    Returns:
        CameraInfo 列表
    """
    cameras = []
    
    for idx, image_path in enumerate(image_paths):
        # 读取图像尺寸
        try:
            with Image.open(image_path) as img:
                width, height = img.size
        except:
            width, height = 1920, 1080
        
        # 创建围绕中心的相机位置
        angle = 2 * np.pi * idx / len(image_paths)
        radius = 3.0
        
        # 相机位置
        cam_pos = np.array([
            radius * np.cos(angle),
            0.0,
            radius * np.sin(angle)
        ])
        
        # 看向原点
        forward = -cam_pos / np.linalg.norm(cam_pos)
        up = np.array([0, 1, 0])
        right = np.cross(up, forward)
        right = right / np.linalg.norm(right)
        up = np.cross(forward, right)
        
        R = np.stack([right, up, forward], axis=0)
        T = -R @ cam_pos
        
        # 估计焦距
        focal = max(width, height) * 1.2
        
        cam_info = CameraInfo(
            uid=idx,
            R=R,
            T=T,
            focal_x=focal,
            focal_y=focal,
            principal_x=width / 2,
            principal_y=height / 2,
            image_name=Path(image_path).name,
            image_path=image_path,
            width=width,
            height=height
        )
        cameras.append(cam_info)
    
    return cameras


def camera_to_torch(cam_info: CameraInfo, device: str = "cuda") -> Dict:
    """
    将 CameraInfo 转换为 PyTorch 张量
    
    Args:
        cam_info: 相机信息
        device: 计算设备
        
    Returns:
        包含相机参数的字典
    """
    return {
        "uid": cam_info.uid,
        "R": torch.from_numpy(cam_info.R).float().to(device),
        "T": torch.from_numpy(cam_info.T).float().to(device),
        "focal_x": cam_info.focal_x,
        "focal_y": cam_info.focal_y,
        "principal_x": cam_info.principal_x,
        "principal_y": cam_info.principal_y,
        "width": cam_info.width,
        "height": cam_info.height,
        "image_path": cam_info.image_path,
        "image_name": cam_info.image_name
    }


def load_image_tensor(image_path: str, device: str = "cuda") -> torch.Tensor:
    """
    加载图像为 PyTorch 张量
    
    Args:
        image_path: 图像路径
        device: 计算设备
        
    Returns:
        图像张量 (3, H, W)，值域 [0, 1]
    """
    from torchvision import transforms
    
    img = Image.open(image_path).convert('RGB')
    transform = transforms.ToTensor()
    return transform(img).to(device)


def resize_image_tensor(image: torch.Tensor, max_size: int = 1600) -> Tuple[torch.Tensor, float]:
    """
    调整图像大小（保持长宽比）
    
    Args:
        image: 图像张量 (3, H, W)
        max_size: 最大边长
        
    Returns:
        (调整后的图像, 缩放比例)
    """
    _, H, W = image.shape
    
    if max(H, W) <= max_size:
        return image, 1.0
    
    scale = max_size / max(H, W)
    new_H, new_W = int(H * scale), int(W * scale)
    
    # 使用插值调整大小
    import torch.nn.functional as F
    resized = F.interpolate(
        image.unsqueeze(0), 
        size=(new_H, new_W), 
        mode='bilinear', 
        align_corners=False
    ).squeeze(0)
    
    return resized, scale
