import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Button, Tag, Space, Statistic, message, Modal,
  Descriptions, Skeleton, Empty, Badge, Tooltip, Divider,
} from 'antd'
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type { Project } from '../types'
import { useNavigate } from 'react-router-dom'
import './TaskMarket.css'

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
      message.success({
        content: '领取成功！立即开始标注吧 🎉',
        duration: 2,
      })
      loadMarket()
    } catch (error: any) {
      message.error({
        content: error.response?.data?.error || '领取失败',
        duration: 3,
      })
    }
  }

  const annotationTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
    text: { label: '文本标注', color: '#1890ff', icon: '📝' },
    bbox: { label: '边界框', color: '#52c41a', icon: '🔲' },
    polygon: { label: '多边形', color: '#722ed1', icon: '🔷' },
    trajectory: { label: '轨迹', color: '#eb2f96', icon: '📍' },
    rotation: { label: '旋转', color: '#fa8c16', icon: '🔄' },
    grid: { label: '宫格', color: '#13c2c2', icon: '📊' },
  }

  const getTypeConfig = (type: string) => {
    return annotationTypeConfig[type] || { label: type, color: '#999', icon: '❓' }
  }

  return (
    <div className="task-market-container">
      {/* 头部横幅 */}
      <div className="market-header">
        <div className="header-content">
          <div className="header-title">
            <ShoppingOutlined className="header-icon" />
            <div>
              <h1>任务广场</h1>
              <p>发现感兴趣的标注项目，开始您的标注之旅</p>
            </div>
          </div>
          <div className="header-stats">
            <Statistic
              title="可用项目"
              value={projects.length}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <Statistic
              title="可领取分片"
              value={projects.reduce((sum, p) => sum + (p.available_chunks?.length || 0), 0)}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="market-content">
        {loading ? (
          <Row gutter={[24, 24]}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Col key={i} xs={24} sm={24} md={12} lg={8}>
                <Card>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : projects.length === 0 ? (
          <Card className="empty-state">
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              imageStyle={{ height: 160 }}
              description={
                <div>
                  <h3>暂无可用任务</h3>
                  <p style={{ color: '#999' }}>目前没有已发布的标注项目，请稍后再来查看</p>
                </div>
              }
            >
              <Button type="primary" onClick={loadMarket}>
                刷新列表
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {projects.map((project) => {
              const typeConfig = getTypeConfig(project.annotation_type)
              const availableChunks = project.available_chunks || []
              const claimedChunks = availableChunks.filter(c => c.user_claimed)
              const canClaimChunks = availableChunks.filter(c => c.can_claim)

              return (
                <Col key={project.id} xs={24} sm={24} md={12} lg={8}>
                  <Card
                    className="project-card"
                    hoverable
                    actions={[
                      <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedProject(project)}
                      >
                        查看详情
                      </Button>,
                      canClaimChunks.length > 0 ? (
                        <Button
                          type="link"
                          icon={<ThunderboltOutlined />}
                          style={{ color: '#52c41a' }}
                          onClick={() => {
                            if (canClaimChunks[0]) {
                              handleClaim(canClaimChunks[0].id)
                            }
                          }}
                        >
                          快速领取
                        </Button>
                      ) : (
                        <Button type="link" disabled>
                          暂无可领取
                        </Button>
                      ),
                    ]}
                  >
                    {/* 项目头部 */}
                    <div className="project-header">
                      <div className="project-type-badge" style={{ background: typeConfig.color }}>
                        <span className="type-icon">{typeConfig.icon}</span>
                        <span className="type-label">{typeConfig.label}</span>
                      </div>
                      {claimedChunks.length > 0 && (
                        <Badge count="已领取" style={{ backgroundColor: '#52c41a' }} />
                      )}
                    </div>

                    {/* 项目标题 */}
                    <h3 className="project-title">
                      {project.name}
                    </h3>

                    {/* 项目描述 */}
                    <p className="project-description">
                      {project.description || '暂无描述'}
                    </p>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* 统计信息 */}
                    <Row gutter={16} className="project-stats">
                      <Col span={8}>
                        <Tooltip title="总任务数">
                          <div className="stat-item">
                            <FileTextOutlined className="stat-icon" />
                            <div className="stat-value">{project.stats?.total_tasks || 0}</div>
                            <div className="stat-label">任务</div>
                          </div>
                        </Tooltip>
                      </Col>
                      <Col span={8}>
                        <Tooltip title="完成进度">
                          <div className="stat-item">
                            <CheckCircleOutlined className="stat-icon" style={{ color: '#52c41a' }} />
                            <div className="stat-value">{Math.round(project.stats?.progress || 0)}%</div>
                            <div className="stat-label">进度</div>
                          </div>
                        </Tooltip>
                      </Col>
                      <Col span={8}>
                        <Tooltip title="可用分片">
                          <div className="stat-item">
                            <TeamOutlined className="stat-icon" style={{ color: '#1890ff' }} />
                            <div className="stat-value">{availableChunks.length}</div>
                            <div className="stat-label">分片</div>
                          </div>
                        </Tooltip>
                      </Col>
                    </Row>

                    {/* 分片预览 */}
                    {availableChunks.length > 0 && (
                      <div className="chunks-preview">
                        <div className="chunks-header">
                          <span>可领取分片</span>
                          <Tag color="blue">{canClaimChunks.length} 个可领取</Tag>
                        </div>
                        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                          {availableChunks.slice(0, 2).map((chunk) => (
                            <div
                              key={chunk.id}
                              className={`chunk-item ${chunk.user_claimed ? 'claimed' : ''}`}
                            >
                              <div className="chunk-info">
                                <Tag color="blue" style={{ marginRight: 8 }}>
                                  {chunk.name}
                                </Tag>
                                <span className="chunk-count">{chunk.task_count} 任务</span>
                                {chunk.user_claimed && (
                                  <Tag color="success" style={{ marginLeft: 8 }}>已领取</Tag>
                                )}
                              </div>
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
                                  继续
                                </Button>
                              ) : (
                                <Tag>不可领取</Tag>
                              )}
                            </div>
                          ))}
                        </Space>
                        {availableChunks.length > 2 && (
                          <div className="view-all-link" onClick={() => setSelectedProject(project)}>
                            查看全部 {availableChunks.length} 个分片 →
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </Col>
              )
            })}
          </Row>
        )}
      </div>

      {/* 项目详情弹窗 */}
      <Modal
        title={null}
        open={!!selectedProject}
        onCancel={() => setSelectedProject(null)}
        footer={null}
        width={900}
        className="project-detail-modal"
      >
        {selectedProject && (
          <div className="modal-content">
            {/* 模态框头部 */}
            <div className="modal-header">
              <div className="modal-title-section">
                <div
                  className="modal-type-badge"
                  style={{ background: getTypeConfig(selectedProject.annotation_type).color }}
                >
                  <span style={{ fontSize: 24 }}>
                    {getTypeConfig(selectedProject.annotation_type).icon}
                  </span>
                </div>
                <div>
                  <h2>{selectedProject.name}</h2>
                  <Space>
                    <Tag color="blue">
                      {getTypeConfig(selectedProject.annotation_type).label}
                    </Tag>
                    <Tag color="green">{selectedProject.status}</Tag>
                    <span style={{ color: '#999' }}>
                      创建者: {selectedProject.creator.username}
                    </span>
                  </Space>
                </div>
              </div>
            </div>

            {/* 项目描述 */}
            {selectedProject.description && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <h4>项目描述</h4>
                <p style={{ color: '#666', marginBottom: 0 }}>
                  {selectedProject.description}
                </p>
              </Card>
            )}

            {/* 标注说明 */}
            {selectedProject.task_instruction && (
              <Card size="small" style={{ marginBottom: 16 }} className="instruction-card">
                <h4>📋 标注说明</h4>
                <div style={{ whiteSpace: 'pre-wrap', color: '#666', lineHeight: '1.8' }}>
                  {selectedProject.task_instruction}
                </div>
              </Card>
            )}

            {/* 标签列表 */}
            {selectedProject.labels && selectedProject.labels.length > 0 && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <h4>🏷️ 标签列表</h4>
                <Space wrap>
                  {selectedProject.labels.map((label, idx) => (
                    <Tag key={idx} color="blue" style={{ margin: '4px' }}>
                      {label}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            {/* 所有分片 */}
            {selectedProject.available_chunks && selectedProject.available_chunks.length > 0 && (
              <Card size="small" title={`📦 所有可用分片 (${selectedProject.available_chunks.length})`}>
                <Row gutter={[16, 16]}>
                  {selectedProject.available_chunks.map((chunk) => (
                    <Col key={chunk.id} span={12}>
                      <div className="modal-chunk-item">
                        <div className="chunk-header">
                          <Tag color="blue">{chunk.name}</Tag>
                          {chunk.user_claimed && <Badge status="success" text="已领取" />}
                        </div>
                        <div className="chunk-details">
                          <span>📊 {chunk.task_count} 任务</span>
                          <span>📈 进度 {chunk.progress.toFixed(1)}%</span>
                        </div>
                        <div className="chunk-action">
                          {chunk.can_claim ? (
                            <Button
                              size="small"
                              type="primary"
                              block
                              onClick={() => {
                                handleClaim(chunk.id)
                                setSelectedProject(null)
                              }}
                            >
                              立即领取
                            </Button>
                          ) : chunk.user_claimed ? (
                            <Button
                              size="small"
                              block
                              onClick={() => {
                                setSelectedProject(null)
                                navigate('/my-claims')
                              }}
                            >
                              继续标注
                            </Button>
                          ) : (
                            <Button size="small" block disabled>
                              不可领取
                            </Button>
                          )}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
