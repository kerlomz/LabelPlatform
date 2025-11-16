import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Tag, Space, Statistic, message, Modal, Descriptions } from 'antd'
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type { Project } from '../types'
import { useNavigate } from 'react-router-dom'

export const TaskMarket: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const navigate = useNavigate()

  const loadMarket = async () => {
    setLoading(true)
    try {
      const res = await api.tasks.getMarket()
      setProjects(res.data)
    } catch (error: any) {
      message.error('加载任务广场失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMarket()
  }, [])

  const handleClaim = async (chunkId: number) => {
    try {
      await api.tasks.claimChunk(chunkId)
      message.success('领取成功！')
      loadMarket() // 刷新列表
    } catch (error: any) {
      message.error(error.response?.data?.error || '领取失败')
    }
  }

  const annotationTypeNames: Record<string, string> = {
    text: '文本标注',
    bbox: '边界框',
    polygon: '多边形',
    trajectory: '轨迹',
    rotation: '旋转',
    grid: '宫格',
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
          <ShoppingOutlined /> 任务广场
        </h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          浏览可领取的标注任务，选择感兴趣的项目开始标注
        </p>
      </div>

      <Row gutter={[16, 16]}>
        {projects.map((project) => (
          <Col key={project.id} xs={24} sm={24} md={12} lg={8}>
            <Card
              hoverable
              title={
                <Space>
                  <Tag color="blue">{annotationTypeNames[project.annotation_type]}</Tag>
                  {project.name}
                </Space>
              }
              extra={
                <Tag color={project.status === 'published' ? 'green' : 'default'}>
                  {project.status}
                </Tag>
              }
              actions={[
                <Button
                  type="link"
                  icon={<FileTextOutlined />}
                  onClick={() => setSelectedProject(project)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <p style={{ color: '#666', minHeight: 60 }}>
                {project.description || '暂无描述'}
              </p>

              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="总任务"
                    value={project.stats?.total_tasks || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="进度"
                    value={project.stats?.progress || 0}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="分片数"
                    value={project.stats?.total_chunks || 0}
                    prefix={<TeamOutlined />}
                  />
                </Col>
              </Row>

              {project.available_chunks && project.available_chunks.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>可领取分片 ({project.available_chunks.length})</h4>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {project.available_chunks.slice(0, 3).map((chunk) => (
                      <Card
                        key={chunk.id}
                        size="small"
                        style={{
                          background: chunk.user_claimed ? '#f0f5ff' : '#fff',
                          border: chunk.user_claimed ? '1px solid #1890ff' : undefined,
                        }}
                      >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space>
                            <Tag color="blue">{chunk.name}</Tag>
                            <span style={{ fontSize: 12 }}>
                              {chunk.task_count} 任务
                            </span>
                            {chunk.user_claimed && (
                              <Tag color="success">已领取</Tag>
                            )}
                          </Space>

                          {chunk.can_claim ? (
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => handleClaim(chunk.id)}
                            >
                              领取
                            </Button>
                          ) : chunk.user_claimed ? (
                            <Button
                              size="small"
                              onClick={() => navigate('/my-claims')}
                            >
                              继续标注
                            </Button>
                          ) : (
                            <Tag color="default">不可领取</Tag>
                          )}
                        </Space>

                        {chunk.progress > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                            进度: {chunk.progress.toFixed(1)}%
                          </div>
                        )}
                      </Card>
                    ))}
                  </Space>

                  {project.available_chunks.length > 3 && (
                    <Button
                      type="link"
                      onClick={() => setSelectedProject(project)}
                      style={{ marginTop: 8 }}
                    >
                      查看全部 {project.available_chunks.length} 个分片
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {projects.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <ClockCircleOutlined style={{ fontSize: 48, color: '#ccc' }} />
            <p style={{ marginTop: 16, color: '#666' }}>
              暂无可领取的任务，请稍后再来查看
            </p>
          </div>
        </Card>
      )}

      {/* 项目详情弹窗 */}
      <Modal
        title={selectedProject?.name}
        open={!!selectedProject}
        onCancel={() => setSelectedProject(null)}
        footer={null}
        width={800}
      >
        {selectedProject && (
          <>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="标注类型">
                <Tag color="blue">
                  {annotationTypeNames[selectedProject.annotation_type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color="green">{selectedProject.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                {selectedProject.creator.username}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedProject.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="总任务数" span={2}>
                {selectedProject.stats?.total_tasks || 0}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedProject.description || '暂无描述'}
              </Descriptions.Item>
              {selectedProject.task_instruction && (
                <Descriptions.Item label="标注说明" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedProject.task_instruction}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedProject.labels && selectedProject.labels.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>标签列表</h4>
                <Space wrap>
                  {selectedProject.labels.map((label, idx) => (
                    <Tag key={idx} color="blue">
                      {label}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {selectedProject.available_chunks && selectedProject.available_chunks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>所有可用分片</h4>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedProject.available_chunks.map((chunk) => (
                    <Card
                      key={chunk.id}
                      size="small"
                      style={{
                        background: chunk.user_claimed ? '#f0f5ff' : '#fff',
                        border: chunk.user_claimed ? '1px solid #1890ff' : undefined,
                      }}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <Tag color="blue">{chunk.name}</Tag>
                          <span>{chunk.task_count} 任务</span>
                          {chunk.user_claimed && <Tag color="success">已领取</Tag>}
                          <span style={{ fontSize: 12, color: '#666' }}>
                            进度: {chunk.progress.toFixed(1)}%
                          </span>
                        </Space>

                        {chunk.can_claim ? (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              handleClaim(chunk.id)
                              setSelectedProject(null)
                            }}
                          >
                            领取
                          </Button>
                        ) : chunk.user_claimed ? (
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedProject(null)
                              navigate('/my-claims')
                            }}
                          >
                            继续标注
                          </Button>
                        ) : (
                          <Tag color="default">不可领取</Tag>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
