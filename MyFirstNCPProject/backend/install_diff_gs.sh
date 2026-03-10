#!/bin/bash

echo "==================================="
echo "安装 3D Gaussian Splatting 依赖"
echo "==================================="
echo ""

# 检查 CUDA 是否可用
python -c "import torch; print(f'PyTorch CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}')"
if [ $? -ne 0 ]; then
    echo "[错误] 无法检测到 PyTorch，请先安装 PyTorch"
    exit 1
fi

echo ""
echo "[1/3] 安装 simple-knn..."
pip install git+https://gitlab.inria.fr/bkerbl/simple-knn.git
if [ $? -ne 0 ]; then
    echo "[警告] simple-knn 安装失败，继续尝试安装 diff-gaussian-rasterization"
fi

echo ""
echo "[2/3] 安装 diff-gaussian-rasterization..."
pip install git+https://github.com/graphdeco-inria/diff-gaussian-rasterization.git
if [ $? -ne 0 ]; then
    echo "[错误] diff-gaussian-rasterization 安装失败"
    echo ""
    echo "可能的原因："
    echo "1. 未安装 Git"
    echo "2. CUDA 环境配置不正确"
    echo "3. 缺少 C++ 编译工具"
    exit 1
fi

echo ""
echo "[3/3] 验证安装..."
python -c "from diff_gaussian_rasterization import GaussianRasterizationSettings; print('✓ diff-gaussian-rasterization 安装成功')"
if [ $? -ne 0 ]; then
    echo "[错误] 验证失败"
    exit 1
fi

echo ""
echo "==================================="
echo "安装完成！"
echo "==================================="
