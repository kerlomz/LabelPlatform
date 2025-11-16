import React, { useState, useEffect } from 'react'
import { Card, Button, message, Empty, Spin, Space, Tag, Alert } from 'antd'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import { BBoxEditor } from '../components/BBoxEditor'
import { PolygonEditor } from '../components/PolygonEditor'
import type { Task, Project, TaskChunk, TaskChunkClaim } from '../types'

export const AnnotationWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const claimId = searchParams.get('claim_id')

  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [chunk, setChunk] = useState<TaskChunk | null>(null)
  const [claim, setClaim] = useState<TaskChunkClaim | null>(null)
  const [remainingTasks, setRemainingTasks] = useState(0)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState<number>(Date.now())

  useEffect(() => {
    if (claimId) {
      loadNextTask()
    } else {
      message.error('缺少领取ID参数')
      navigate('/my-claims')
    }
  }, [claimId])

  const loadNextTask = async () => {
    if (!claimId) return

    setLoading(true)
    try {
      const response = await api.tasks.getNextInClaim(parseInt(claimId))
      setCurrentTask(response.data.task)
      setProject(response.data.project)
      setChunk(response.data.chunk)
      setClaim(response.data.claim)
      setRemainingTasks(response.data.remaining_tasks)
      setStartTime(Date.now())
    } catch (error: any) {
      if (error.response?.status === 404) {
        message.success('该分片的所有任务已完成！')
        navigate('/my-claims')
      } else {
        message.error('加载任务失败: ' + (error.response?.data?.message || error.message))
      }
      setCurrentTask(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any) => {
    if (!currentTask || !project) return

    const timeSpent = Math.floor((Date.now() - startTime) / 1000) // 秒

    try {
      await api.tasks.submitAnnotation(currentTask.id, {
        annotation_type: project.annotation_type,
        data,
        time_spent: timeSpent,
      })

      message.success(`标注已完成 (用时 ${timeSpent}秒)`)

      // 加载下一个任务
      setTimeout(() => {
        loadNextTask()
      }, 500)
    } catch (error: any) {
      message.error('保存失败: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSkip = () => {
    // 跳过当前任务，但不提交标注
    loadNextTask()
  }

  const renderEditor = () => {
    if (!currentTask || !project) return null

    const imageUrl = api.tasks.getImage(currentTask.id)
    const labels = project.labels || []

    // 根据标注类型渲染对应的编辑器
    const annotationType = project.annotation_type

    switch (annotationType) {
      case 'bbox':
        return (
          <BBoxEditor
            imageUrl={imageUrl}
            initialBBoxes={[]}
            labels={labels}
            onSave={(bboxes) => handleSave({ bboxes })}
            onCancel={() => navigate('/my-claims')}
          />
        )

      case 'polygon':
        return (
          <PolygonEditor
            imageUrl={imageUrl}
            initialPolygons={[]}
            labels={labels}
            onSave={(polygons) => handleSave({ polygons })}
            onCancel={() => navigate('/my-claims')}
          />
        )

      // 其他类型的编辑器...
      default:
        return <Empty description={`暂不支持 ${annotationType} 类型的标注`} />
    }
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!currentTask) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card>
          <Empty
            description={
              <div>
                <p style={{ fontSize: 18, marginBottom: 16 }}>
                  {chunk
                    ? `分片 "${chunk.name}" 的所有任务已完成！`
                    : '没有可标注的任务'}
                </p>
                <Button type="primary" onClick={() => navigate('/my-claims')}>
                  返回我的任务
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部信息栏 */}
      <div
        style={{
          background: '#001529',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/my-claims')}
            style={{ color: 'white' }}
          >
            返回
          </Button>
          <span style={{ fontSize: 16 }}>
            {project?.name} - {chunk?.name}
          </span>
          {claim && (
            <Tag color="blue">
              进度: {claim.completed_tasks}/{chunk?.task_count}
            </Tag>
          )}
          <Tag color="orange">
            剩余: {remainingTasks + 1} 任务
          </Tag>
        </Space>

        <Space>
          <Button onClick={handleSkip} icon={<ArrowRightOutlined />}>
            跳过
          </Button>
        </Space>
      </div>

      {/* 任务说明 */}
      {project?.task_instruction && (
        <Alert
          message="标注说明"
          description={
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {project.task_instruction}
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          closable
          style={{ margin: '16px 24px 0' }}
        />
      )}

      {/* 编辑器 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderEditor()}
      </div>
    </div>
  )
}
