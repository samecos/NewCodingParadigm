# GSplat Tool 使用指南

本文档说明如何使用 GSplat Tool 进行 3D 场景重建。

## 启动服务

### 1. 启动后端 API

```bash
cd backend
python run.py
```

后端服务将启动在：http://localhost:8000

API 文档地址：http://localhost:8000/docs

### 2. 启动前端界面

在另一个终端中：

```bash
cd frontend
npm run dev
```

前端界面将启动在：http://localhost:3000

## 使用流程

### 1. 上传照片

1. 打开浏览器访问 http://localhost:3000
2. 将照片拖拽到上传区域，或点击选择文件
3. 建议上传 50-200 张同一场景不同角度的照片

**照片要求：**
- 格式：JPG、PNG、TIFF
- 分辨率：建议不低于 1920x1080
- 数量：50-500 张
- 场景：需要有足够的纹理特征用于匹配
- 避免：过度曝光、完全黑暗、运动模糊的照片

### 2. 配置参数

- **训练迭代次数**：默认 30000 轮
  - 快速测试：5000 轮（约 10-20 分钟）
  - 标准质量：30000 轮（约 1-2 小时）
  - 高质量：50000 轮（约 2-4 小时）

- **输出格式**：PLY（标准点云）和/或 SPLAT（Web 优化）

### 3. 开始重建

点击"开始重建"按钮，系统将依次执行：

1. **图像验证** - 检查图像格式和有效性
2. **COLMAP 位姿估计** - 估计每张照片的相机位置和方向
3. **高斯初始化** - 从稀疏点云初始化 3D 高斯
4. **3DGS 训练** - 优化高斯参数以重建场景
5. **结果导出** - 导出 PLY 或 SPLAT 格式文件

### 4. 监控进度

- 实时查看当前处理阶段和进度百分比
- 通过 WebSocket 接收实时更新
- 查看训练指标（PSNR、SSIM）

### 5. 下载结果

训练完成后：
- 在任务详情页点击下载按钮
- 或通过 API 下载：`GET /api/v1/tasks/{id}/download/{format}`

## 结果文件说明

### PLY 格式 (.ply)

- 标准点云格式
- 包含所有高斯参数：位置、协方差、颜色、球谐系数
- 可用于导入到 MeshLab、CloudCompare 等软件查看

### SPLAT 格式 (.splat)

- 压缩格式，适用于 Web 渲染
- 包含：位置、缩放、颜色（含透明度）、旋转
- 文件大小约为 PLY 的 30-50%

## API 使用示例

### 创建任务

```bash
curl -X POST "http://localhost:8000/api/v1/tasks" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "training_iterations=30000" \
  -F "output_formats=ply,splat"
```

### 获取任务状态

```bash
curl "http://localhost:8000/api/v1/tasks/{task_id}"
```

### WebSocket 实时进度

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/tasks/{task_id}/progress');
ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`${progress.stage}: ${progress.percentage}% - ${progress.message}`);
};
```

### 下载结果

```bash
curl -O "http://localhost:8000/api/v1/tasks/{task_id}/download/ply"
```

## 故障排除

### 训练失败

**症状**: 任务状态显示 "failed"

**检查项**:
1. 查看后端日志获取详细错误信息
2. 检查 GPU 显存是否充足
3. 检查照片是否符合要求（数量、清晰度）

### CUDA out of memory

**症状**: 训练过程中出现显存不足错误

**解决方案**:
1. 减少照片数量
2. 降低训练图像分辨率（修改代码中的 `max_size` 参数）
3. 使用更高显存的 GPU

### 重建质量差

**症状**: 导出的模型细节丢失或模糊

**改进建议**:
1. 增加照片数量（建议 100-300 张）
2. 确保照片覆盖场景的所有角度
3. 增加训练迭代次数
4. 使用更高分辨率的照片

### 模拟渲染器警告

**症状**: 日志中出现 "Using mock renderer"

**原因**: diff-gaussian-rasterization 未正确安装

**解决方案**: 按照 [SETUP_3DGS.md](SETUP_3DGS.md) 重新安装

## 性能优化

### 快速测试

用于快速验证照片质量：
- 迭代次数：1000
- 预计时间：2-5 分钟

### 标准质量

平衡质量和速度：
- 迭代次数：30000
- 预计时间：1-2 小时（RTX 3060）

### 高质量

最佳重建效果：
- 迭代次数：50000
- 预计时间：2-4 小时（RTX 3060）

## 查看结果

### PLY 文件查看器

- **MeshLab** (免费): https://www.meshlab.net/
- **CloudCompare** (免费): https://www.cloudcompare.org/
- **SuperSplat** (Web): https://supersplat.github.io/

### SPLAT 文件查看器

- **SuperSplat**: https://supersplat.github.io/
- **PlayCanvas Viewer**: https://playcanvas.com/supersplat/editor/

## 进阶使用

### 批量处理

使用 API 批量创建任务：

```python
import requests
import glob

image_files = glob.glob("photos/*.jpg")
files = [("files", open(f, "rb")) for f in image_files]

response = requests.post(
    "http://localhost:8000/api/v1/tasks",
    files=files,
    data={"training_iterations": 30000}
)

task_id = response.json()["task"]["id"]
print(f"Task created: {task_id}")
```

### 自定义训练参数

编辑 `backend/app/services/pipeline.py` 中的训练参数：

```python
# 学习率
optimizer = torch.optim.Adam([
    {'params': [model._xyz], 'lr': 0.00016, 'name': 'xyz'},
    # ...
])

# 密度控制频率
if iteration > 500 and iteration % 100 == 0:
    self._densify_and_prune(model, optimizer, iteration)
```
