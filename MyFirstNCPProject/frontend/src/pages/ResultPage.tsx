import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import axios from 'axios'

interface Task {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  stage: string | null
  created_at: string
  updated_at: string
  error_message?: string
}

interface Progress {
  stage: string
  percentage: number
  message: string
  timestamp: string
}

interface Result {
  task_id: string
  ply_url: string | null
  splat_url: string | null
  preview_url: string | null
  metrics: {
    psnr?: number
    ssim?: number
    num_gaussians?: number
    training_time?: number
  }
}

function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!taskId) return

    fetchTask()
    
    // 建立 WebSocket 连接
    const ws = new WebSocket(`ws://${window.location.host}/api/v1/tasks/${taskId}/progress`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.error) {
        console.error('WebSocket error:', data.error)
        return
      }
      if (data.status) {
        fetchTask()
      } else {
        setProgress(data)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [taskId])

  const fetchTask = async () => {
    if (!taskId) return
    
    try {
      const response = await axios.get(`/api/v1/tasks/${taskId}`)
      setTask(response.data.task)
      if (response.data.result) {
        setResult(response.data.result)
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-600" />
      case 'processing':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-8 w-8 text-gray-400" />
    }
  }

  const getStageText = (stage: string | null) => {
    const stageMap: Record<string, string> = {
      validation: '图像验证',
      colmap: '位姿估计',
      initialization: '高斯初始化',
      training: '训练优化',
      export: '结果导出'
    }
    return stage ? stageMap[stage] || stage : ''
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}时 ${minutes}分 ${secs}秒`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">任务不存在</h2>
        <Link to="/tasks" className="text-primary-600 hover:underline">
          返回任务列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/tasks"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回任务列表
      </Link>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 状态标题 */}
        <div className="flex items-center space-x-4 mb-8">
          {getStatusIcon(task.status)}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {task.status === 'completed' ? '重建完成' :
               task.status === 'failed' ? '重建失败' :
               task.status === 'processing' ? '正在处理...' : '等待中'}
            </h1>
            <p className="text-gray-500">任务 ID: {task.id}</p>
          </div>
        </div>

        {/* 进度显示 */}
        {task.status === 'processing' && progress && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{getStageText(progress.stage)}</span>
              <span>{progress.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress.message}</p>
          </div>
        )}

        {/* 错误信息 */}
        {task.status === 'failed' && task.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">错误信息</h3>
            <p className="text-red-700">{task.error_message}</p>
          </div>
        )}

        {/* 结果展示 */}
        {task.status === 'completed' && result && (
          <div className="space-y-6">
            {/* 训练指标 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">训练指标</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {result.metrics.psnr && (
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">
                      {result.metrics.psnr.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">PSNR (dB)</p>
                  </div>
                )}
                {result.metrics.ssim && (
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">
                      {result.metrics.ssim.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-500">SSIM</p>
                  </div>
                )}
                {result.metrics.num_gaussians && (
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">
                      {(result.metrics.num_gaussians / 1000000).toFixed(2)}M
                    </p>
                    <p className="text-sm text-gray-500">高斯点数</p>
                  </div>
                )}
                {result.metrics.training_time && (
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">
                      {formatDuration(result.metrics.training_time)}
                    </p>
                    <p className="text-sm text-gray-500">训练耗时</p>
                  </div>
                )}
              </div>
            </div>

            {/* 下载区域 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">下载结果</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {result.ply_url && (
                  <a
                    href={`${result.ply_url}?download=1`}
                    download
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">PLY 格式</p>
                      <p className="text-sm text-gray-500">标准点云格式，兼容大多数 3D 软件</p>
                    </div>
                    <Download className="h-5 w-5 text-gray-400" />
                  </a>
                )}
                {result.splat_url && (
                  <a
                    href={`${result.splat_url}?download=1`}
                    download
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">SPLAT 格式</p>
                      <p className="text-sm text-gray-500">压缩格式，适合 Web 实时渲染</p>
                    </div>
                    <Download className="h-5 w-5 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 时间信息 */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>创建时间: {new Date(task.created_at).toLocaleString('zh-CN')}</p>
          <p>更新时间: {new Date(task.updated_at).toLocaleString('zh-CN')}</p>
        </div>
      </div>
    </div>
  )
}

export default ResultPage
