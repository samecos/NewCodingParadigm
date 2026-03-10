"""
任务管理 API

@probe_ref: GS-Arch-001
@probe_ref: GS-Req-006
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.models.schemas import (
    Task, TaskConfig, TaskCreateRequest, TaskResponse,
    Progress, Result, Metrics, TaskStatus, PipelineStage
)
from app.services.pipeline import ProcessingPipeline
from app.core.config import settings

router = APIRouter()
pipeline = ProcessingPipeline(work_dir=str(settings.DATA_DIR))

# 内存中的任务存储（生产环境应使用数据库）
tasks_db: dict = {}
progress_db: dict = {}
results_db: dict = {}


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="上传的图片文件"),
    training_iterations: int = Form(30000, description="训练迭代次数"),
    output_formats: str = Form("ply,splat", description="输出格式")
):
    """
    创建新的 3D 重建任务
    
    - **files**: 上传的图片文件（支持 jpg, png, tiff）
    - **training_iterations**: 训练迭代次数（默认 30000）
    - **output_formats**: 输出格式，逗号分隔（默认 ply,splat）
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received request: files={files is not None and len(files)}, training_iterations={training_iterations}, output_formats={output_formats}")
    
    # 验证文件
    if not files or len(files) == 0:
        logger.error("No files provided")
        raise HTTPException(status_code=400, detail="未提供图片文件")
    
    if len(files) > 500:
        raise HTTPException(status_code=400, detail="图片数量超过限制（最大 500 张）")
    
    # 创建任务目录
    task_id = str(uuid.uuid4())
    task_dir = settings.UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存上传的文件
    image_paths = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
            continue
        
        file_path = task_dir / file.filename
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        image_paths.append(str(file_path))
    
    if len(image_paths) < 3:
        # 清理目录
        shutil.rmtree(task_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="有效的图片数量不足（至少需要 3 张）")
    
    # 解析输出格式
    formats = [f.strip() for f in output_formats.split(",")]
    from app.models.schemas import OutputFormat
    output_format_enums = []
    for f in formats:
        try:
            output_format_enums.append(OutputFormat(f))
        except ValueError:
            pass
    
    if not output_format_enums:
        output_format_enums = [OutputFormat.PLY, OutputFormat.SPLAT]
    
    # 创建任务
    config = TaskConfig(
        input_images=image_paths,
        output_formats=output_format_enums,
        training_iterations=training_iterations
    )
    
    task = Task(
        id=uuid.UUID(task_id),
        status=TaskStatus.PENDING,
        config=config
    )
    
    tasks_db[task_id] = task
    
    # 启动后台任务
    background_tasks.add_task(process_task, task_id, image_paths, config)
    
    return TaskResponse(task=task)


async def process_task(task_id: str, image_paths: List[str], config: TaskConfig):
    """后台处理任务"""
    task = tasks_db.get(task_id)
    if not task:
        return
    
    # 更新任务状态
    task.status = TaskStatus.PROCESSING
    task.updated_at = __import__('datetime').datetime.utcnow()
    
    def progress_callback(progress: Progress):
        """进度回调"""
        progress_db[task_id] = progress
        task.stage = PipelineStage(progress.stage)
    
    # 执行流水线
    result = pipeline.execute(
        task_id=task_id,
        image_paths=image_paths,
        config={
            "training_iterations": config.training_iterations,
            "output_formats": [f.value for f in config.output_formats]
        },
        progress_callback=progress_callback
    )
    
    # 更新任务状态
    if result["success"]:
        task.status = TaskStatus.COMPLETED
        
        # 创建结果
        export_result = result["results"].get("export", {})
        files = export_result.get("files", {})
        training_result = result["results"].get("training", {})
        metrics_data = training_result.get("metrics", {})
        
        metrics = Metrics(
            psnr=metrics_data.get("psnr"),
            ssim=metrics_data.get("ssim"),
            num_gaussians=metrics_data.get("num_gaussians"),
            training_time=metrics_data.get("training_time")
        )
        
        result_obj = Result(
            task_id=task.id,
            ply_url=f"/results/{task_id}/result/model.ply" if "ply" in files else None,
            splat_url=f"/results/{task_id}/result/model.splat" if "splat" in files else None,
            preview_url=None,  # 待实现
            metrics=metrics
        )
        results_db[task_id] = result_obj
    else:
        task.status = TaskStatus.FAILED
        task.error_message = result.get("error", "未知错误")
    
    task.updated_at = __import__('datetime').datetime.utcnow()


@router.get("/tasks", response_model=List[Task])
async def list_tasks():
    """获取所有任务列表"""
    return list(tasks_db.values())


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """获取任务详情"""
    task = tasks_db.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return TaskResponse(
        task=task,
        progress=progress_db.get(task_id),
        result=results_db.get(task_id) if task.status == TaskStatus.COMPLETED else None
    )


@router.websocket("/tasks/{task_id}/progress")
async def websocket_progress(websocket: WebSocket, task_id: str):
    """WebSocket 实时进度推送"""
    await websocket.accept()
    
    if task_id not in tasks_db:
        await websocket.send_json({"error": "任务不存在"})
        await websocket.close()
        return
    
    try:
        import asyncio
        last_progress = None
        
        while True:
            progress = progress_db.get(task_id)
            if progress and progress != last_progress:
                await websocket.send_json({
                    "stage": progress.stage,
                    "percentage": progress.percentage,
                    "message": progress.message,
                    "timestamp": progress.timestamp.isoformat()
                })
                last_progress = progress
            
            # 检查任务是否完成或失败
            task = tasks_db.get(task_id)
            if task and task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                await websocket.send_json({
                    "status": task.status.value,
                    "message": "任务已结束" if task.status == TaskStatus.COMPLETED else f"任务失败: {task.error_message}"
                })
                break
            
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        pass
    finally:
        await websocket.close()


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 清理文件
    task_dir = settings.UPLOAD_DIR / task_id
    output_dir = settings.OUTPUT_DIR / task_id
    
    shutil.rmtree(task_dir, ignore_errors=True)
    shutil.rmtree(output_dir, ignore_errors=True)
    
    # 清理数据库
    del tasks_db[task_id]
    if task_id in progress_db:
        del progress_db[task_id]
    if task_id in results_db:
        del results_db[task_id]
    
    return {"message": "任务已删除"}


@router.get("/tasks/{task_id}/download/{format}")
async def download_result(task_id: str, format: str):
    """下载结果文件"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = tasks_db[task_id]
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="任务尚未完成")
    
    result_dir = settings.OUTPUT_DIR / task_id / "result"
    
    if format == "ply":
        file_path = result_dir / "model.ply"
    elif format == "splat":
        file_path = result_dir / "model.splat"
    else:
        raise HTTPException(status_code=400, detail="不支持的格式")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=file_path,
        filename=f"{task_id}.{format}",
        media_type="application/octet-stream"
    )
