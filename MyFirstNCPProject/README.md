# GSplat Tool - 3D Gaussian Splatting 三维数字化工具

基于多帧影像，利用 3D Gaussian Splatting (3DGS) 技术实现高质量三维场景重建与数字化。

## 🎯 功能特性

- 📸 **多视角照片输入** - 支持上传 50-500 张 JPG/PNG/TIFF 格式照片
- 🧠 **AI 驱动重建** - 基于 COLMAP 位姿估计 + 3DGS 训练优化
- 📊 **实时进度监控** - WebSocket 实时推送处理进度
- 💾 **多格式导出** - 支持 PLY（标准点云）和 SPLAT（Web 优化）格式
- 🖥️ **Web 界面** - 基于 React + FastAPI 的现代化界面

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Web Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                    Backend API (FastAPI)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌───────────────────────────┐ │
│  │ 图像验证     │ │ COLMAP SfM  │ │ 3DGS 训练 & 导出          │ │
│  └─────────────┘ └─────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 |
| GPU | NVIDIA RTX 3060 或更高 |
| 显存 | ≥ 12GB |
| 内存 | ≥ 16GB |
| CUDA | ≥ 11.8 |
| Python | 3.10+ |
| Node.js | 18+ |

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd MyFirstNCPProject
```

### 2. 安装后端依赖

#### 2.1 基础依赖

```bash
cd backend
pip install -r requirements-core.txt
```

#### 2.2 安装 CUDA 版 PyTorch

```bash
# CUDA 11.8
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 --extra-index-url https://download.pytorch.org/whl/cu118
```

#### 2.3 安装 3D Gaussian Splatting 渲染器（必须）

**Windows:**
```powershell
.\install_diff_gs.bat
```

**Linux:**
```bash
./install_diff_gs.sh
```

> ⚠️ **注意**: 如果此步骤失败，系统会使用模拟渲染器，训练不会真正优化模型。
> 详见 [3DGS 环境配置指南](docs/SETUP_3DGS.md)

### 3. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 4. 启动服务

**启动后端（PowerShell）：**
```powershell
cd backend
python run.py
```

**启动前端（新终端）：**
```powershell
cd frontend
npm run dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:3000

## 📁 项目结构

```
MyFirstNCPProject/
├── backend/                    # FastAPI 后端
│   ├── app/                   # 应用代码
│   │   ├── api/v1/           # API 路由
│   │   ├── core/             # 核心配置
│   │   ├── models/           # 数据模型
│   │   └── services/         # 业务服务
│   ├── gaussian/             # 3DGS 核心实现
│   │   ├── model.py          # GaussianModel
│   │   ├── renderer.py       # 可微渲染器
│   │   └── camera.py         # 相机参数处理
│   └── requirements.txt      # Python 依赖
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/       # 组件
│   │   ├── pages/            # 页面
│   │   └── App.tsx           # 主应用
│   └── package.json          # Node 依赖
│
├── docs/                       # 文档
│   └── knowledge_store/      # 数据探针文档
│       ├── PRD-001-Overview.md   # 产品需求
│       └── SDD-001-Architecture.md # 架构设计
│
├── data/                       # 数据存储
│   ├── uploads/              # 上传的图片
│   ├── outputs/              # 输出结果
│   └── cache/                # 缓存文件
│
└── tests/                      # 测试用例
    ├── unit/                 # 单元测试
    ├── integration/          # 集成测试
    └── e2e/                  # 端到端测试
```

## 📚 API 文档

启动后端后访问：http://localhost:8000/docs

### 核心接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tasks` | 创建重建任务 |
| GET | `/api/v1/tasks` | 获取任务列表 |
| GET | `/api/v1/tasks/{id}` | 获取任务详情 |
| WS | `/api/v1/tasks/{id}/progress` | WebSocket 实时进度 |
| GET | `/api/v1/tasks/{id}/download/{format}` | 下载结果文件 |

## 🔬 数据探针

本项目遵循 AI 编程新范式，所有需求和设计约束都通过**数据探针**定义：

- **PRD-001-Overview.md** - 产品需求文档，定义功能探针
- **SDD-001-Architecture.md** - 系统设计文档，定义架构探针

探针格式示例：
```yaml
#@Probe: GS-Req-004
type: Requirement
category: Algorithm
target: gaussian_training_module
content: >
  训练迭代次数：默认 30000 轮
  PSNR 目标：≥ 30 dB
  SSIM 目标：≥ 0.85
```

## 🧪 运行测试

```bash
# 后端测试
cd backend
pytest ../tests/

# 前端测试
cd frontend
npm test
```

## 📜 许可证

MIT License

## 🙏 致谢

- [3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) - 原始论文和实现
- [COLMAP](https://colmap.github.io/) - SfM 和 MVS 库
