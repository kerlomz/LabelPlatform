import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Button, Tag, Space, Progress, message,
  Statistic, Empty, Descriptions, Skeleton, Divider, Badge, Tooltip,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type { TaskChunkClaim } from '../types'
import { useNavigate } from 'react-router-dom'
import './MyClaims.css'

export const MyClaims: React.FC = () => {
  const [claims, setClaims] = useState<TaskChunkClaim[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const loadClaims = async () => {
    setLoading(true)
    try {
      const res = await api.tasks.getMyClaims()
      setClaims(res.data)
    } catch (error: any) {
      message.error('加载失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [])

  const handleStartAnnotation = (claimId: number) => {
    navigate(`/annotate?claim_id=${claimId}`)
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'claimed':
        return { color: '#1890ff', text: '已领取', icon: <ClockCircleOutlined /> }
      case 'in_progress':
        return { color: '#fa8c16', text: '进行中', icon: <FireOutlined /> }
      case 'completed':
        return { color: '#52c41a', text: '已完成', icon: <CheckCircleOutlined /> }
      default:
        return { color: '#999', text: status, icon: null }
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // 计算总体统计
  const totalStats = claims.reduce(
    (acc, claim) => ({
      totalTasks: acc.totalTasks + claim.chunk.task_count,
      completedTasks: acc.completedTasks + claim.completed_tasks,
      totalTime: acc.totalTime + claim.total_time_spent,
    }),
    { totalTasks: 0, completedTasks: 0, totalTime: 0 }
  )

  const completedClaims = claims.filter(c => c.status === 'completed').length
  const avgProgress = claims.length > 0
    ? claims.reduce((sum, c) => sum + c.progress, 0) / claims.length
    : 0

  return (
    <div className="my-claims-container">
      {/* 头部横幅 */}
      <div className="claims-header">
        <div className="header-content">
          <div className="header-title">
            <TrophyOutlined className="header-icon" />
            <div>
              <h1>我的任务</h1>
              <p>管理已领取的标注任务，追踪标注进度</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      {claims.length > 0 && (
        <div className="claims-stats-section">
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="已领取分片"
                  value={claims.length}
                  prefix={<RocketOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="个"
                />
                <div className="stat-detail">
                  已完成 {completedClaims} 个
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="总任务数"
                  value={totalStats.completedTasks}
                  suffix={`/ ${totalStats.totalTasks}`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div className="stat-detail">
                  完成率 {totalStats.totalTasks > 0 ? Math.round((totalStats.completedTasks / totalStats.totalTasks) * 100) : 0}%
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="累计时长"
                  value={formatTime(totalStats.totalTime)}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div className="stat-detail">
                  平均进度 {Math.round(avgProgress)}%
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="标注效率"
                  value={totalStats.completedTasks > 0 && totalStats.totalTime > 0
                    ? Math.round(totalStats.totalTime / totalStats.completedTasks)
                    : 0}
                  suffix="秒/任务"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
                <div className="stat-detail">
                  持续提升中
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* 任务列表 */}
      <div className="claims-content">
        {loading ? (
          <Row gutter={[24, 24]}>
            {[1, 2, 3].map((i) => (
              <Col key={i} xs={24} md={12} lg={8}>
                <Card>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : claims.length === 0 ? (
          <Card className="empty-state">
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              imageStyle={{ height: 160 }}
              description={
                <div>
                  <h3>还没有领取任何任务</h3>
                  <p style={{ color: '#999', marginBottom: 24 }}>
                    前往任务广场，选择感兴趣的项目开始标注吧
                  </p>
                </div>
              }
            >
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/task-market')}
              >
                前往任务广场
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {claims.map((claim) => {
              const statusConfig = getStatusConfig(claim.status)
              const isCompleted = claim.status === 'completed'
              const progressPercent = claim.progress

              return (
                <Col key={claim.id} xs={24} md={12} lg={8}>
                  <Card
                    className={`claim-card ${isCompleted ? 'completed' : ''}`}
                    hoverable={!isCompleted}
                    actions={[
                      isCompleted ? (
                        <Button
                          type="link"
                          disabled
                          icon={<CheckCircleOutlined />}
                        >
                          已完成
                        </Button>
                      ) : (
                        <Button
                          type="link"
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleStartAnnotation(claim.id)}
                        >
                          {claim.status === 'claimed' ? '开始标注' : '继续标注'}
                        </Button>
                      ),
                      <Tooltip title="查看详细信息">
                        <Button type="link">详情</Button>
                      </Tooltip>,
                    ]}
                  >
                    {/* 状态标签 */}
                    <div className="claim-header">
                      <Badge
                        status={isCompleted ? 'success' : 'processing'}
                        text={
                          <Tag
                            color={statusConfig.color}
                            icon={statusConfig.icon}
                            style={{ marginLeft: 8 }}
                          >
                            {statusConfig.text}
                          </Tag>
                        }
                      />
                      {!isCompleted && claim.progress > 0 && (
                        <Tag color="orange">
                          <FireOutlined /> 进行中
                        </Tag>
                      )}
                    </div>

                    {/* 分片名称 */}
                    <h3 className="claim-title">
                      {claim.chunk.name}
                    </h3>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* 进度展示 */}
                    <div className="claim-progress-section">
                      <div className="progress-header">
                        <span className="progress-label">完成进度</span>
                        <span className="progress-value">
                          {claim.completed_tasks} / {claim.chunk.task_count}
                        </span>
                      </div>
                      <Progress
                        percent={progressPercent}
                        strokeColor={{
                          '0%': '#1890ff',
                          '100%': '#52c41a',
                        }}
                        status={isCompleted ? 'success' : 'active'}
                        showInfo={false}
                      />
                      <div className="progress-footer">
                        <span>{progressPercent.toFixed(1)}% 已完成</span>
                        {!isCompleted && (
                          <span>还剩 {claim.chunk.task_count - claim.completed_tasks} 任务</span>
                        )}
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* 统计信息 */}
                    <Row gutter={16} className="claim-stats">
                      <Col span={12}>
                        <div className="stat-item">
                          <ClockCircleOutlined className="stat-icon" />
                          <div>
                            <div className="stat-value">
                              {formatTime(claim.total_time_spent)}
                            </div>
                            <div className="stat-label">累计时长</div>
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className="stat-item">
                          <ThunderboltOutlined className="stat-icon" />
                          <div>
                            <div className="stat-value">
                              {claim.completed_tasks > 0
                                ? Math.round(claim.total_time_spent / claim.completed_tasks)
                                : 0}s
                            </div>
                            <div className="stat-label">平均用时</div>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* 时间信息 */}
                    <div className="claim-timeline">
                      <div className="timeline-item">
                        <span className="timeline-label">领取时间</span>
                        <span className="timeline-value">
                          {new Date(claim.claimed_at).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {claim.completed_at && (
                        <div className="timeline-item">
                          <span className="timeline-label">完成时间</span>
                          <span className="timeline-value">
                            {new Date(claim.completed_at).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>
        )}
      </div>
    </div>
  )
}
