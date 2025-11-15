import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Tabs } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await api.auth.login(values.username, values.password)
      const { token, user } = response.data
      setAuth(user, token)
      message.success('登录成功')
      navigate('/admin/projects')
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      await api.auth.register(values.username, values.password)
      message.success('注册成功，请登录')
      // 切换到登录标签
    } catch (error: any) {
      message.error(error.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 450,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          borderRadius: 16,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>
            🏷️ 标注平台
          </h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            专业的验证码标注解决方案
          </p>
        </div>

        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={handleLogin} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      登录
                    </Button>
                  </Form.Item>
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    默认管理员: admin / admin123
                  </div>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={handleRegister} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少6位' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item
                    name="confirm"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: '请确认密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('两次密码不一致'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
