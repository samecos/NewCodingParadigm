import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import axios from 'axios'

function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [trainingIterations, setTrainingIterations] = useState(30000)
  const [outputFormats, setOutputFormats] = useState({ ply: true, splat: true })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/')
    )
    setFiles(prev => [...prev, ...imageFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('training_iterations', trainingIterations.toString())
    
    const formats = []
    if (outputFormats.ply) formats.push('ply')
    if (outputFormats.splat) formats.push('splat')
    formData.append('output_formats', formats.join(','))

    try {
      const response = await axios.post('/api/v1/tasks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const taskId = response.data.task.id
      navigate(`/result/${taskId}`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">上传照片</h1>
        <p className="text-gray-600 mb-8">
          上传 50-500 张不同视角的照片，系统将自动进行三维重建
        </p>

        {/* 拖放区域 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-gray-700 mb-2">
            拖拽照片到此处，或
            <label className="text-primary-600 hover:text-primary-700 cursor-pointer mx-1">
              点击选择
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            支持 JPG, PNG, TIFF 格式，单张最大 50MB
          </p>
        </div>

        {/* 配置选项 */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              训练迭代次数
            </label>
            <input
              type="number"
              min={1000}
              max={100000}
              value={trainingIterations}
              onChange={(e) => setTrainingIterations(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              默认值 30000，更多迭代可能提升质量但耗时更长
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输出格式
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={outputFormats.ply}
                  onChange={(e) => setOutputFormats(prev => ({ ...prev, ply: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">PLY 格式（标准点云）</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={outputFormats.splat}
                  onChange={(e) => setOutputFormats(prev => ({ ...prev, splat: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">SPLAT 格式（压缩，适合 Web）</span>
              </label>
            </div>
          </div>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                已选择 {files.length} 张照片
              </h3>
              <button
                onClick={() => setFiles([])}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                清空全部
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
              files.length === 0 || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>上传中...</span>
              </span>
            ) : (
              `开始重建 (${files.length} 张照片)`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
