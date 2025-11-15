import React, { useState } from 'react'
import { Layout, Menu, Card, Steps, Button, message, Space, Typography, Statistic, Row, Col } from 'antd'
import {
  FileTextOutlined,
  BorderOutlined,
  ScissorOutlined,
  DragOutlined,
  RotateRightOutlined,
  AppstoreOutlined,
  UploadOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { ImageUploader } from '../components/ImageUploader'
import { TextAnnotator } from '../components/TextAnnotator'
import { BoundingBoxAnnotator } from '../components/BoundingBoxAnnotator'
import { SegmentationAnnotator } from '../components/SegmentationAnnotator'
import { TrajectoryAnnotator } from '../components/TrajectoryAnnotator'
import { RotationAnnotator } from '../components/RotationAnnotator'
import { GridAnnotator } from '../components/GridAnnotator'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType } from '../types'
import { api } from '../api/client'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

export const AnnotationPage: React.FC = () => {
  const {
    annotationType,
    setAnnotationType,
    currentImage,
    currentAnnotation,
    reset
  } = useAnnotationStore()

  const [imageName, setImageName] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  const annotationTypes = [
    {
      key: AnnotationType.TEXT,
      label: '字符型验证码',
      icon: <FileTextOutlined />,
      description: '直接输入识别的文字'
    },
    {
      key: AnnotationType.BOUNDING_BOX,
      label: '点选验证码',
      icon: <BorderOutlined />,
      description: '拉框标注目标区域'
    },
    {
      key: AnnotationType.SEGMENTATION,
      label: '分割模式',
      icon: <ScissorOutlined />,
      description: '多边形描边标注'
    },
    {
      key: AnnotationType.TRAJECTORY,
      label: '拖动轨迹',
      icon: <DragOutlined />,
      description: '记录拖动路径'
    },
    {
      key: AnnotationType.ROTATION,
      label: '旋转验证码',
      icon: <RotateRightOutlined />,
      description: '旋转图片到正确角度'
    },
    {
      key: AnnotationType.GRID,
      label: '九宫格/六宫格',
      icon: <AppstoreOutlined />,
      description: '选择符合要求的格子'
    }
  ]

  const handleTypeChange = (type: AnnotationType) => {
    setAnnotationType(type)
    reset()
    setCurrentStep(0)
  }

  const handleImageLoaded = (url: string, filename: string) => {
    setImageName(filename)
    setCurrentStep(1)
  }

  const handleSave = async (data: any) => {
    try {
      const annotation = {
        ...currentAnnotation,
        ...data
      }

      await api.createAnnotation(annotation)
      message.success('标注保存成功!')
      setSavedCount((prev) => prev + 1)

      // 重置状态,准备下一张
      reset()
      setCurrentStep(0)
    } catch (error) {
      message.error('保存失败,请重试')
      console.error(error)
    }
  }

  const renderAnnotator = () => {
    if (!currentImage) {
      return (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <UploadOutlined style={{ fontSize: 48, color: '#999' }} />
            <Title level={4} style={{ marginTop: 20 }}>
              请先上传图片
            </Title>
          </div>
        </Card>
      )
    }

    switch (annotationType) {
      case AnnotationType.TEXT:
        return (
          <TextAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(text) => handleSave({ text })}
          />
        )
      case AnnotationType.BOUNDING_BOX:
        return (
          <BoundingBoxAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(boxes) => handleSave({ boundingBoxes: boxes })}
          />
        )
      case AnnotationType.SEGMENTATION:
        return (
          <SegmentationAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(polygons) => handleSave({ polygons })}
          />
        )
      case AnnotationType.TRAJECTORY:
        return (
          <TrajectoryAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(trajectory) => handleSave({ trajectory })}
          />
        )
      case AnnotationType.ROTATION:
        return (
          <RotationAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(angle) => handleSave({ rotation: { angle } })}
          />
        )
      case AnnotationType.GRID:
        return (
          <GridAnnotator
            imageUrl={currentImage}
            imageName={imageName}
            onSave={(gridType, selectedCells) =>
              handleSave({ grid: { gridType, selectedCells } })
            }
          />
        )
      default:
        return null
    }
  }

  const selectedType = annotationTypes.find((t) => t.key === annotationType)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 20px' }}>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          🏷️ 验证码标注平台
        </div>
      </Header>

      <Layout>
        <Sider width={280} style={{ background: '#fff', padding: '20px' }}>
          <Title level={5}>标注类型</Title>
          <Menu
            mode="inline"
            selectedKeys={[annotationType]}
            onClick={({ key }) => handleTypeChange(key as AnnotationType)}
            items={annotationTypes.map((type) => ({
              key: type.key,
              icon: type.icon,
              label: (
                <div>
                  <div>{type.label}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {type.description}
                  </Text>
                </div>
              )
            }))}
          />

          <Card
            size="small"
            title="统计信息"
            style={{ marginTop: 20 }}
          >
            <Statistic
              title="已完成标注"
              value={savedCount}
              suffix="个"
            />
          </Card>
        </Sider>

        <Layout style={{ padding: '20px' }}>
          <Content>
            <Card
              title={
                <Space>
                  {selectedType?.icon}
                  <span>{selectedType?.label}</span>
                </Space>
              }
              extra={
                <Button
                  type="link"
                  onClick={() => {
                    reset()
                    setCurrentStep(0)
                  }}
                >
                  重新开始
                </Button>
              }
            >
              <Steps
                current={currentStep}
                items={[
                  {
                    title: '上传图片',
                    icon: <UploadOutlined />
                  },
                  {
                    title: '进行标注',
                    icon: selectedType?.icon
                  },
                  {
                    title: '保存结果',
                    icon: <SaveOutlined />
                  }
                ]}
                style={{ marginBottom: 30 }}
              />

              {currentStep === 0 && (
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                  <ImageUploader onImageLoaded={handleImageLoaded} />
                </div>
              )}

              {currentStep === 1 && renderAnnotator()}
            </Card>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
