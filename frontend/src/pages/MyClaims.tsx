import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Button, Tag, Space, Progress, message,
  Statistic, Empty, Descriptions,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type { TaskChunkClaim } from '../types'
import { useNavigate } from 'react-router-dom'

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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'claimed':
        return { color: 'blue', text: '已领取' }
      case 'in_progress':
        return { color: 'orange', text: '进行中' }
      case 'completed':
        return { color: 'green', text: '已完成' }
      default:
        return { color: 'default', text: status }
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}时${minutes}分${secs}秒`
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`
    } else {
      return `${secs}秒`
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

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
          <TrophyOutlined /> 我的任务
        </h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          查看和管理已领取的标注任务
        </p>
      </div>

      {/* 总体统计 */}
      {claims.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="已领取分片"
                value={claims.length}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="完成任务"
                value={totalStats.completedTasks}
                suffix={`/ ${totalStats.totalTasks}`}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="累计时长"
                value={formatTime(totalStats.totalTime)}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 任务列表 */}
      <Row gutter={[16, 16]}>
        {claims.map((claim) => {
          const statusInfo = getStatusInfo(claim.status)

          return (
            <Col key={claim.id} xs={24} sm={24} md={12} lg={8}>
              <Card
                title={
                  <Space>
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                    {claim.chunk.name}
                  </Space>
                }
                extra={
                  <Tag color="blue">
                    ID: {claim.id}
                  </Tag>
                }
                actions={[
                  claim.status === 'completed' ? (
                    <Button type="link" disabled icon={<CheckCircleOutlined />}>
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
                ]}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="任务数量">
                    {claim.chunk.task_count}
                  </Descriptions.Item>
                  <Descriptions.Item label="已完成">
                    {claim.completed_tasks} / {claim.chunk.task_count}
                  </Descriptions.Item>
                  <Descriptions.Item label="累计时长">
                    {formatTime(claim.total_time_spent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="领取时间">
                    {new Date(claim.claimed_at).toLocaleString()}
                  </Descriptions.Item>
                  {claim.started_at && (
                    <Descriptions.Item label="开始时间">
                      {new Date(claim.started_at).toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {claim.completed_at && (
                    <Descriptions.Item label="完成时间">
                      {new Date(claim.completed_at).toLocaleString()}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                    进度: {claim.progress.toFixed(1)}%
                  </div>
                  <Progress
                    percent={claim.progress}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    status={claim.status === 'completed' ? 'success' : 'active'}
                  />
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      {claims.length === 0 && !loading && (
        <Card>
          <Empty
            description="您还没有领取任何任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/task-market')}>
              前往任务广场
            </Button>
          </Empty>
        </Card>
      )}
    </div>
  )
}
