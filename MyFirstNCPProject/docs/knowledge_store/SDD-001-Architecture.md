# 系统设计文档 (SDD) - 3D Gaussian Splatting 三维数字化工具

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Web Frontend (React)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │  上传组件     │ │  任务队列面板 │ │  3D预览窗口   │ │  下载中心    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │ REST API / WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ 任务管理API   │ │ 文件处理服务  │ │ 进度推送服务  │ │ 结果服务    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Pipeline Core (Python)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ 图像预处理    │ │ COLMAP位姿   │ │ 3DGS训练     │ │ 导出渲染    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 模块设计探针

### @Probe: GS-Arch-001 - 后端API架构
```yaml
type: Architecture
category: Backend
target: backend_api
content: >
  使用 FastAPI 构建 RESTful API 服务。
  目录结构：
  - app/main.py: 应用入口
  - app/api/: API路由
  - app/core/: 核心业务逻辑
  - app/models/: Pydantic数据模型
  - app/services/: 服务层
  - app/tasks/: 异步任务
  - app/utils/: 工具函数
  
  关键端点：
  - POST /api/v1/tasks: 创建重建任务
  - GET /api/v1/tasks/{id}: 查询任务状态
  - GET /api/v1/tasks/{id}/progress: WebSocket实时进度
  - GET /api/v1/tasks/{id}/result: 下载结果
```

### @Probe: GS-Arch-002 - 数据处理流水线
```yaml
type: Architecture
category: Pipeline
target: processing_pipeline
content: >
  流水线阶段定义：
  
  Stage 1: Image Validation (图像验证)
  - 检查文件格式、大小、数量
  - 提取EXIF信息
  - 生成缩略图预览
  
  Stage 2: COLMAP Reconstruction (位姿估计)
  - 特征提取 (SIFT/SuperPoint)
  - 特征匹配
  - SfM稀疏重建
  - 输出 cameras.txt, images.txt, points3D.txt
  
  Stage 3: Gaussian Initialization (高斯初始化)
  - 从稀疏点云创建初始高斯
  - 设置初始参数 (协方差、颜色、SH系数)
  
  Stage 4: Training (训练优化)
  - 可微渲染
  - 损失计算 (L1 + SSIM)
  - 自适应密度控制
  - 定期保存检查点
  
  Stage 5: Export (导出)
  - 导出 .ply 格式
  - 导出 .splat 格式
  - 生成预览图
```

### @Probe: GS-Arch-003 - 数据模型设计
```yaml
type: Architecture
category: DataModel
target: data_models
content: >
  核心数据模型：
  
  Task (任务):
  - id: UUID
  - status: pending | processing | completed | failed
  - stage: current_pipeline_stage
  - created_at: datetime
  - updated_at: datetime
  - config: TaskConfig
  
  TaskConfig (任务配置):
  - input_images: List[str]
  - output_formats: ["ply", "splat"]
  - training_iterations: int (default: 30000)
  - device: cuda | cpu
  
  Progress (进度):
  - task_id: UUID
  - stage: str
  - percentage: float (0-100)
  - message: str
  - timestamp: datetime
  
  Result (结果):
  - task_id: UUID
  - ply_url: str | None
  - splat_url: str | None
  - preview_url: str | None
  - metrics: Dict[str, float] (PSNR, SSIM, etc.)
```

### @Probe: GS-Arch-004 - 3DGS核心实现
```yaml
type: Architecture
category: CoreAlgorithm
target: gaussian_splatting_core
content: >
  基于原版 3D Gaussian Splatting 论文实现。
  
  GaussianModel 类：
  - _xyz: 高斯中心位置 (N, 3)
  - _features_dc: 直接颜色 (N, 3)
  - _features_rest: 球谐系数 (N, 15, 3)
  - _opacity: 不透明度 (N, 1)
  - _scaling: 缩放因子 (N, 3)
  - _rotation: 旋转四元数 (N, 4)
  
  核心方法：
  - from_colmap_points(points3D): 从COLMAP点云初始化
  - densify_and_split(): 自适应密度控制-分裂
  - densify_and_clone(): 自适应密度控制-克隆
  - prune_low_opacity(): 修剪低不透明度高斯
  - save_ply(path): 导出PLY格式
  - save_splat(path): 导出SPLAT格式
```

### @Probe: GS-Arch-005 - Web前端设计
```yaml
type: Architecture
category: Frontend
target: web_frontend
content: >
  技术栈：React 18 + TypeScript + Tailwind CSS + Three.js
  
  页面结构：
  - 首页 (/): 项目介绍与开始按钮
  - 上传页 (/upload): 拖拽上传照片
  - 任务页 (/tasks): 任务列表与状态
  - 预览页 (/preview/{id}): 3D交互预览
  - 结果页 (/result/{id}): 下载与分享
  
  组件设计：
  - DropZone: 拖拽上传区域
  - TaskCard: 任务状态卡片
  - ProgressBar: 进度条（带阶段指示）
  - GaussianViewer: 3D高斯渲染器
  - LogViewer: 实时日志显示
```

### @Probe: GS-Arch-006 - 目录结构设计
```yaml
type: Architecture
category: Directory
target: project_structure
content: >
  项目根目录：
  
  /gsplat-tool/
  ├── backend/                   # FastAPI后端
  │   ├── app/
  │   │   ├── __init__.py
  │   │   ├── main.py           # 应用入口
  │   │   ├── api/
  │   │   │   ├── __init__.py
  │   │   │   └── v1/
  │   │   │       └── tasks.py
  │   │   ├── core/
  │   │   │   ├── config.py
  │   │   │   └── events.py
  │   │   ├── models/
  │   │   │   └── schemas.py
  │   │   ├── services/
  │   │   │   ├── pipeline.py
  │   │   │   └── storage.py
  │   │   └── utils/
  │   │       └── colmap_utils.py
  │   ├── gaussian/             # 3DGS核心代码
  │   │   ├── __init__.py
  │   │   ├── model.py          # GaussianModel
  │   │   ├── renderer.py       # 可微渲染器
  │   │   └── exporter.py       # 导出模块
  │   ├── requirements.txt
  │   └── run.py
  │
  ├── frontend/                  # React前端
  │   ├── src/
  │   │   ├── components/
  │   │   ├── pages/
  │   │   ├── hooks/
  │   │   └── utils/
  │   ├── package.json
  │   └── vite.config.ts
  │
  ├── data/                      # 数据存储
  │   ├── uploads/              # 上传的图片
  │   ├── outputs/              # 输出结果
  │   └── cache/                # 缓存文件
  │
  └── tests/                     # 测试用例
      ├── unit/
      ├── integration/
      └── e2e/
```
