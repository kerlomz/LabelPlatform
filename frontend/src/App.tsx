import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Login } from './pages/Login'
import { ProjectManagement } from './pages/ProjectManagement'
import { AnnotationWorkspace } from './pages/AnnotationWorkspace'
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

  useEffect(() => {
    loadAuth()
  }, [])

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/*"
            element={
              <PrivateRoute>
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
                  <Content>
                    <Routes>
                      <Route path="projects" element={<ProjectManagement />} />
                      <Route path="*" element={<Navigate to="/admin/projects" replace />} />
                    </Routes>
                  </Content>
                </Layout>
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

          <Route path="/" element={<Navigate to="/admin/projects" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
