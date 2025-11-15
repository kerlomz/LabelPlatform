import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AnnotationPage } from './pages/AnnotationPage'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AnnotationPage />
    </ConfigProvider>
  )
}

export default App
