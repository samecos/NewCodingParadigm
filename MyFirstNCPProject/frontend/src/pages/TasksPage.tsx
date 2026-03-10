import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Eye } from 'lucide-react'
import axios from 'axios'

interface Task {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  stage: string | null
  config: {
    input_images: string[]
    output_formats: string[]
    training_iterations: number
  }
  created_at: string
  updated_at: string
  error_message?: string
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/v1/tasks')
      setTasks(response.data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return
    
    try {
      await axios.delete(`/api/v1/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const getStageText = (stage: string | null) => {
    const stageMap: Record<string, string> = {
      validation: '图像验证',
      colmap: '位姿估计',
      initialization: '高斯初始化',
      training: '训练优化',
      export: '结果导出'
    }
    return stage ? stageMap[stage] || stage : '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">任务列表</h1>
        <Link
          to="/upload"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          新建任务
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
          <p className="text-gray-600 mb-4">开始上传照片创建你的第一个重建任务</p>
          <Link
            to="/upload"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            去上传
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前阶段
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图片数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-700">
                        {task.id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(task.status)}
                        <span className={`text-sm font-medium ${
                          task.status === 'completed' ? 'text-green-700' :
                          task.status === 'failed' ? 'text-red-700' :
                          task.status === 'processing' ? 'text-blue-700' :
                          'text-gray-700'
                        }`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getStageText(task.stage)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {task.config.input_images.length} 张
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(task.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/result/${task.id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-700"
                          title="删除任务"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksPage
