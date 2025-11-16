import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Menu } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {
  ShoppingOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons'
import { Login } from './pages/Login'
import { ProjectManagement } from './pages/ProjectManagement'
import { AnnotationWorkspace } from './pages/AnnotationWorkspace'
import { TaskMarket } from './pages/TaskMarket'
import { MyClaims } from './pages/MyClaims'
import { useAuthStore } from './stores/authStore'
import './App.css'

const { Header, Content } = Layout

// 路由守卫
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const { loadAuth, user, clearAuth } = useAuthStore()
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname)

  useEffect(() => {
    loadAuth()
  }, [])

  const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = (path: string) => {
      setCurrentPath(path)
      window.location.href = path
    }

    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: '#001529',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          <div style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
            🏷️ 验证码标注平台
          </div>

          {user && (
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={[currentPath]}
              style={{ flex: 1, marginLeft: 40 }}
              items={[
                user.role === 'admin'
                  ? {
                      key: '/admin/projects',
                      label: '项目管理',
                      icon: <ProjectOutlined />,
                      onClick: () => navigate('/admin/projects'),
                    }
                  : null,
                {
                  key: '/task-market',
                  label: '任务广场',
                  icon: <ShoppingOutlined />,
                  onClick: () => navigate('/task-market'),
                },
                {
                  key: '/my-claims',
                  label: '我的任务',
                  icon: <CheckSquareOutlined />,
                  onClick: () => navigate('/my-claims'),
                },
              ].filter(Boolean)}
            />
          )}

          {user && (
            <div style={{ color: 'white' }}>
              {user.username}
              <a
                onClick={() => {
                  clearAuth()
                  window.location.href = '/login'
                }}
                style={{ marginLeft: 16, color: '#1890ff' }}
              >
                退出
              </a>
            </div>
          )}
        </Header>
        <Content>{children}</Content>
      </Layout>
    )
  }

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/*"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Routes>
                    <Route path="projects" element={<ProjectManagement />} />
                    <Route path="*" element={<Navigate to="/admin/projects" replace />} />
                  </Routes>
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/task-market"
            element={
              <PrivateRoute>
                <MainLayout>
                  <TaskMarket />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/my-claims"
            element={
              <PrivateRoute>
                <MainLayout>
                  <MyClaims />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/annotate"
            element={
              <PrivateRoute>
                <AnnotationWorkspace />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/task-market" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
