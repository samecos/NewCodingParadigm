@echo off
chcp 65001 >nul
echo ===================================
echo 安装 3D Gaussian Splatting 依赖
echo ===================================
echo.

REM 检查 CUDA 是否可用
python -c "import torch; print(f'PyTorch CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}')" 2>nul
if errorlevel 1 (
    echo [错误] 无法检测到 PyTorch，请先安装 PyTorch
    exit /b 1
)

echo.
echo [1/3] 安装 simple-knn...
pip install git+https://gitlab.inria.fr/bkerbl/simple-knn.git
if errorlevel 1 (
    echo [警告] simple-knn 安装失败，继续尝试安装 diff-gaussian-rasterization
)

echo.
echo [2/3] 安装 diff-gaussian-rasterization...
pip install git+https://github.com/graphdeco-inria/diff-gaussian-rasterization.git
if errorlevel 1 (
    echo [错误] diff-gaussian-rasterization 安装失败
    echo.
    echo 可能的原因：
    echo 1. 未安装 Git
    echo 2. CUDA 环境配置不正确
    echo 3. 缺少 Visual Studio C++ 编译工具
    echo.
    echo 请确保：
    echo - 已安装 Git: https://git-scm.com/download/win
    echo - 已安装 CUDA Toolkit 11.8 或更高版本
    echo - 已安装 Visual Studio Build Tools
    exit /b 1
)

echo.
echo [3/3] 验证安装...
python -c "from diff_gaussian_rasterization import GaussianRasterizationSettings; print('✓ diff-gaussian-rasterization 安装成功')"
if errorlevel 1 (
    echo [错误] 验证失败
    exit /b 1
)

echo.
echo ===================================
echo 安装完成！
echo ===================================
pause
