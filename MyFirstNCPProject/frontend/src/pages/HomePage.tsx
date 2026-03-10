import { Link } from 'react-router-dom'
import { Upload, Box, Zap, Download } from 'lucide-react'

function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero 区域 */}
      <section className="text-center py-16">
        <div className="inline-flex items-center justify-center p-4 bg-primary-100 rounded-full mb-6">
          <Box className="h-12 w-12 text-primary-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          3D Gaussian Splatting
          <span className="block text-primary-600 mt-2">三维数字化工具</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          上传多视角照片，利用先进的 3D Gaussian Splatting 技术，
          快速生成高质量的三维场景模型。支持导出 PLY 和 SPLAT 格式。
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/upload"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            <Upload className="h-5 w-5" />
            <span>开始重建</span>
          </Link>
          <Link
            to="/tasks"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            <span>查看任务</span>
          </Link>
        </div>
      </section>

      {/* 功能特性 */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-lg mb-4">
            <Upload className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">简单上传</h3>
          <p className="text-gray-600">
            支持拖拽上传 JPG、PNG、TIFF 格式的照片合集。
            建议上传 50-500 张不同视角的照片以获得最佳效果。
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-lg mb-4">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">AI 驱动</h3>
          <p className="text-gray-600">
            基于 COLMAP 进行精确的相机位姿估计，
            使用 3D Gaussian Splatting 算法生成逼真的三维场景。
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-lg mb-4">
            <Download className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">多格式导出</h3>
          <p className="text-gray-600">
            支持导出标准的 PLY 点云格式和优化的 SPLAT 格式，
            方便在各种 3D 应用和 Web 平台中使用。
          </p>
        </div>
      </section>

      {/* 工作流程 */}
      <section className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">工作流程</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { step: 1, title: '上传照片', desc: '拖拽上传多视角照片' },
            { step: 2, title: '位姿估计', desc: 'COLMAP 计算相机位置' },
            { step: 3, title: '初始化', desc: '生成初始高斯点云' },
            { step: 4, title: '训练优化', desc: '3DGS 迭代训练' },
            { step: 5, title: '导出结果', desc: '下载 PLY/SPLAT 文件' },
          ].map((item, index) => (
            <div key={item.step} className="relative">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-full text-lg font-bold mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              {index < 4 && (
                <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 技术要求 */}
      <section className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">系统要求</h2>
        <div className="inline-block bg-white rounded-lg shadow p-6 text-left">
          <ul className="space-y-2 text-gray-600">
            <li>• 操作系统：Windows 10/11</li>
            <li>• GPU：NVIDIA RTX 3060 或更高（推荐）</li>
            <li>• 显存：≥ 12GB</li>
            <li>• 内存：≥ 16GB</li>
            <li>• CUDA：≥ 11.8</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

export default HomePage
