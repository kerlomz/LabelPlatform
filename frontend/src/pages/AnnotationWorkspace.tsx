import React, { useState, useEffect } from 'react'
import { Card, Button, message, Empty, Spin, Space, Tag } from 'antd'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined, CheckOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import { BBoxEditor } from '../components/BBoxEditor'
import { PolygonEditor } from '../components/PolygonEditor'
import type { Task, Annotation, AnnotationType, Dataset } from '../types'

export const AnnotationWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const datasetId = searchParams.get('dataset')

  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [annotation, setAnnotation] = useState<Annotation | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataset, setDataset] = useState<Dataset | null>(null)

  useEffect(() => {
    if (datasetId) {
      loadDataset(parseInt(datasetId))
      loadNextTask()
    }
  }, [datasetId])

  const loadDataset = async (id: number) => {
    try {
      const response = await api.datasets.get(id)
      setDataset(response.data)
    } catch (error) {
      message.error('加载数据集失败')
    }
  }

  const loadNextTask = async () => {
    if (!datasetId) return

    setLoading(true)
    try {
      const response = await api.tasks.getNext(parseInt(datasetId))
      setCurrentTask(response.data)

      // 加载现有标注
      try {
        const annResponse = await api.annotations.get(response.data.id)
        setAnnotation(annResponse.data)
      } catch (error) {
        setAnnotation(null)
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        message.info('没有更多任务了')
        setCurrentTask(null)
      } else {
        message.error('加载任务失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any, completed: boolean = false) => {
    if (!currentTask) return

    try {
      await api.annotations.create(currentTask.id, {
        annotation_type: getAnnotationType(),
        data,
        completed,
      })

      if (completed) {
        message.success('标注已完成')
        loadNextTask()
      } else {
        message.success('保存成功')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const handleSkip = () => {
    loadNextTask()
  }

  const getAnnotationType = (): AnnotationType => {
    // 从数据集或项目获取标注类型
    return 'bbox' // 简化处理，实际应从项目配置获取
  }

  const renderEditor = () => {
    if (!currentTask) return null

    const imageUrl = api.tasks.getImage(currentTask.id)
    const labels = ['验证码', '滑块', '拼图', '文字'] // 应从项目配置获取

    // 根据标注类型渲染对应的编辑器
    const annotationType = getAnnotationType()

    switch (annotationType) {
      case 'bbox':
        return (
          <BBoxEditor
            imageUrl={imageUrl}
            initialBBoxes={annotation?.data?.bboxes || []}
            labels={labels}
            onSave={(bboxes) => handleSave({ bboxes }, true)}
            onCancel={() => navigate('/admin/projects')}
          />
        )

      case 'polygon':
        return (
          <PolygonEditor
            imageUrl={imageUrl}
            initialPolygons={annotation?.data?.polygons || []}
            labels={labels}
            onSave={(polygons) => handleSave({ polygons }, true)}
            onCancel={() => navigate('/admin/projects')}
          />
        )

      // 其他类型的编辑器...
      default:
        return <Empty description="不支持的标注类型" />
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
                  {dataset
                    ? `数据集 "${dataset.name}" 的所有任务已完成！`
                    : '没有可标注的任务'}
                </p>
                <Button type="primary" onClick={() => navigate('/admin/projects')}>
                  返回项目列表
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
            onClick={() => navigate('/admin/projects')}
            style={{ color: 'white' }}
          >
            返回
          </Button>
          <span style={{ fontSize: 16 }}>
            {dataset?.name} - {currentTask.image_name}
          </span>
          {dataset && (
            <Tag color="blue">
              进度: {dataset.completed_tasks}/{dataset.total_images}
            </Tag>
          )}
        </Space>

        <Space>
          <Button onClick={handleSkip} icon={<ArrowRightOutlined />}>
            跳过
          </Button>
        </Space>
      </div>

      {/* 编辑器 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderEditor()}
      </div>
    </div>
  )
}
