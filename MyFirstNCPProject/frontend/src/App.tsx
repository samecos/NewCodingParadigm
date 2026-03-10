import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import TasksPage from './pages/TasksPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
      </Routes>
    </Layout>
  )
}

export default App
