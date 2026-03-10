# 产品需求文档 (PRD) - 3D Gaussian Splatting 三维数字化工具

## 项目概述

基于多帧影像，利用 3D Gaussian Splatting (3DGS) 技术实现高质量三维场景重建与数字化。

---

## 需求探针定义

### @Probe: GS-Req-001 - 平台约束
```yaml
type: Requirement
category: Platform
target: system_requirements
content: >
  目标平台为 Windows 操作系统。
  开发语言：Python 3.10+
  深度学习框架：PyTorch 2.0+ (CUDA 支持)
```

### @Probe: GS-Req-002 - 输入规范
```yaml
type: Requirement
category: Input
target: image_input_module
content: >
  系统接收照片合集作为输入。
  支持格式：JPG, PNG, TIFF
  单张图片尺寸建议：不低于 1920x1080
  照片数量建议：50-500 张
  必须包含 EXIF 元数据（焦距信息优先）
constraints:
  - 所有照片必须是同一场景的不同视角
  - 场景需要有足够的纹理特征用于匹配
  - 避免过度曝光或完全黑暗的照片
```

### @Probe: GS-Req-003 - 位姿估计
```yaml
type: Requirement
category: Algorithm
target: pose_estimation_module
content: >
  使用 Structure-from-Motion (SfM) 技术估计每张照片的相机位姿。
  采用 COLMAP 作为底层实现。
  输出：相机内参 (K)、外参 (R, t)、畸变参数
constraints:
  - 必须成功注册至少 80% 的输入图像
  - 稀疏点云应包含至少 10000 个有效点
  - 位姿估计完成后需进行 Bundle Adjustment 优化
```

### @Probe: GS-Req-004 - 3DGS 训练
```yaml
type: Requirement
category: Algorithm
target: gaussian_training_module
content: >
  基于估计的相机位姿，使用 3D Gaussian Splatting 进行场景表示学习。
  从稀疏点云初始化高斯参数 (位置、协方差、颜色、不透明度、球谐系数)。
  通过可微渲染优化高斯参数。
constraints:
  - 训练迭代次数：默认 30000 轮
  - PSNR 目标：≥ 30 dB
  - SSIM 目标：≥ 0.85
  - 支持自适应密度控制（分裂与克隆）
```

### @Probe: GS-Req-005 - 输出格式
```yaml
type: Requirement
category: Output
target: export_module
content: >
  支持导出以下格式：
  1. .ply 格式 - 标准点云格式，包含所有高斯参数
  2. .splat 格式 - 压缩格式，适用于 Web 渲染
constraints:
  - .ply 文件必须包含：位置(x,y,z)、协方差、颜色(r,g,b,a)、球谐系数
  - .splat 文件大小应控制在原始 .ply 的 50% 以内
  - 导出过程必须显示进度条
```

### @Probe: GS-Req-006 - Web 界面
```yaml
type: Requirement
category: UI
target: web_interface
content: >
  提供基于 Web 的用户界面。
  前端框架：React + TypeScript
  3D 渲染：Three.js 或 React-Three-Fiber
  功能包括：
  - 拖拽上传照片
  - 训练进度实时监控
  - 3D 预览与交互
  - 结果下载
constraints:
  - 界面语言：中文
  - 支持实时日志输出
  - 训练过程中可以预览中间结果
```

### @Probe: GS-Req-007 - 处理模式
```yaml
type: Requirement
category: Processing
target: processing_mode
content: >
  采用离线批处理模式。
  用户上传照片后，系统在后台依次执行：
  1. 图像预处理与验证
  2. COLMAP 位姿估计
  3. 3DGS 训练优化
  4. 结果导出
constraints:
  - 单个任务独占 GPU 资源
  - 任务队列按 FIFO 顺序处理
  - 支持任务取消与状态持久化
```

### @Probe: GS-Req-008 - 性能指标
```yaml
type: Requirement
category: Performance
target: performance_targets
content: >
  系统性能目标：
  - 位姿估计阶段：100张照片 < 10分钟 (RTX 3060级别)
  - 3DGS训练阶段：30000轮 < 2小时 (RTX 3060级别)
  - 内存占用：峰值 < 12GB GPU显存
  - 导出速度：100万高斯点 < 30秒
```
