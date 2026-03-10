import { Link } from 'react-router-dom'
import { Upload, List, Home, Box } from 'lucide-react'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Box className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-800">GSplat Tool</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
              >
                <Home className="h-5 w-5" />
                <span>首页</span>
              </Link>
              <Link
                to="/upload"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>上传</span>
              </Link>
              <Link
                to="/tasks"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
              >
                <List className="h-5 w-5" />
                <span>任务</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            GSplat Tool - 基于 3D Gaussian Splatting 的三维数字化工具
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
