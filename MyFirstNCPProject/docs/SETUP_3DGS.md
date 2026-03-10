# 3D Gaussian Splatting 环境配置指南

本文档说明如何配置完整的 3DGS 训练环境。

## 前提条件

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 或 Linux |
| GPU | NVIDIA RTX 3060 或更高 |
| 显存 | ≥ 12GB |
| CUDA | ≥ 11.8 |
| Python | 3.10+ |

## 安装步骤

### 1. 安装基础依赖

```bash
cd backend
pip install -r requirements-core.txt  # 先安装基础依赖
```

### 2. 安装 CUDA 版 PyTorch

**Windows:**
```bash
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 --extra-index-url https://download.pytorch.org/whl/cu118
```

**Linux:**
```bash
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 --extra-index-url https://download.pytorch.org/whl/cu118
```

### 3. 安装 diff-gaussian-rasterization

**Windows (使用提供的脚本):**
```powershell
.\install_diff_gs.bat
```

**Linux/Mac:**
```bash
chmod +x install_diff_gs.sh
./install_diff_gs.sh
```

**手动安装:**
```bash
# 安装 simple-knn
pip install git+https://gitlab.inria.fr/bkerbl/simple-knn.git

# 安装 diff-gaussian-rasterization
pip install git+https://github.com/graphdeco-inria/diff-gaussian-rasterization.git
```

### 4. 验证安装

```python
python -c "
import torch
from diff_gaussian_rasterization import GaussianRasterizationSettings
print('✓ PyTorch CUDA:', torch.cuda.is_available())
print('✓ diff-gaussian-rasterization 安装成功')
"
```

## 常见问题

### 1. "No module named 'diff_gaussian_rasterization'"

**原因**: 没有安装 diff-gaussian-rasterization

**解决**: 运行安装脚本或手动安装

### 2. "CUDA_HOME not found"

**原因**: 没有安装 CUDA Toolkit 或环境变量未配置

**解决**: 
- 安装 CUDA Toolkit 11.8: https://developer.nvidia.com/cuda-11-8-0-download-archive
- 确保 `CUDA_HOME` 或 `CUDA_PATH` 环境变量已设置

### 3. "Microsoft Visual C++ 14.0 is required"

**原因**: Windows 缺少 C++ 编译工具

**解决**:
- 安装 Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- 选择 "Desktop development with C++" 工作负载

### 4. 编译错误

如果遇到编译错误，可以尝试使用预编译版本或 Docker:

```bash
# 使用 Docker
docker run --gpus all -it -v $(pwd):/workspace graphdeco/gaussian-splatting:latest
```

## 降级方案

如果无法安装 diff-gaussian-rasterization，系统会自动使用 **模拟渲染器**:

- 训练流程可以正常运行
- 但训练是模拟的，不会真正优化模型
- 导出的模型质量会很差

这只是为了让你测试流程，**不能用于生产环境**。

## 安装 pycolmap (可选但推荐)

```bash
pip install pycolmap
```

pycolmap 用于真实的相机位姿估计。如果不安装，会使用模拟相机。

## 下一步

完成安装后，启动服务测试:

```bash
# 启动后端
cd backend
python run.py

# 启动前端 (新终端)
cd frontend
npm run dev
```

访问 http://localhost:3000 上传照片开始重建！
