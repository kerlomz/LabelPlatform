import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import { Button, Space, Card, Typography, Slider, Tag } from 'antd'
import { SaveOutlined, ReloadOutlined, RotateRightOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType } from '../types'
import Konva from 'konva'

const { Title, Text } = Typography

interface RotationAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (angle: number) => void
}

export const RotationAnnotator: React.FC<RotationAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseAngle, setLastMouseAngle] = useState(0)
  const stageRef = useRef<Konva.Stage>(null)
  const imageRef = useRef<Konva.Image>(null)
  const { updateCurrentAnnotation } = useAnnotationStore()

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600

  useEffect(() => {
    const img = new window.Image()
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
    }
  }, [imageUrl])

  useEffect(() => {
    updateCurrentAnnotation({
      type: AnnotationType.ROTATION,
      imageUrl,
      imageName,
      rotation: {
        angle: rotation
      }
    })
  }, [rotation, imageUrl, imageName])

  const getMouseAngle = (e: Konva.KonvaEventObject<MouseEvent>): number => {
    const stage = e.target.getStage()
    if (!stage) return 0

    const pos = stage.getPointerPosition()
    if (!pos) return 0

    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2

    return Math.atan2(pos.y - centerY, pos.x - centerX) * (180 / Math.PI)
  }

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsDragging(true)
    setLastMouseAngle(getMouseAngle(e))
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDragging) return

    const currentAngle = getMouseAngle(e)
    const angleDiff = currentAngle - lastMouseAngle

    setRotation((prev) => {
      let newRotation = prev + angleDiff
      // 归一化到 0-360
      while (newRotation < 0) newRotation += 360
      while (newRotation >= 360) newRotation -= 360
      return newRotation
    })

    setLastMouseAngle(currentAngle)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleSliderChange = (value: number) => {
    setRotation(value)
  }

  const handleReset = () => {
    setRotation(0)
  }

  const handleSave = () => {
    if (onSave) {
      onSave(rotation)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>旋转验证码标注</Title>
            <Text type="secondary">
              拖动图片旋转到正确角度,或使用滑块精确调整
            </Text>
          </div>

          <Space>
            <Tag color="blue" icon={<RotateRightOutlined />}>
              当前角度: {Math.round(rotation)}°
            </Tag>
          </Space>

          <div style={{ border: '1px solid #d9d9d9', display: 'inline-block' }}>
            <Stage
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              ref={stageRef}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    ref={imageRef}
                    image={image}
                    x={CANVAS_WIDTH / 2}
                    y={CANVAS_HEIGHT / 2}
                    offsetX={image.width / 2}
                    offsetY={image.height / 2}
                    rotation={rotation}
                    width={image.width}
                    height={image.height}
                  />
                )}
              </Layer>
            </Stage>
          </div>

          <div style={{ width: '100%', maxWidth: 600 }}>
            <Text>精确调整角度:</Text>
            <Slider
              min={0}
              max={360}
              value={rotation}
              onChange={handleSliderChange}
              marks={{
                0: '0°',
                90: '90°',
                180: '180°',
                270: '270°',
                360: '360°'
              }}
              tooltip={{
                formatter: (value) => `${value}°`
              }}
            />
          </div>

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存标注
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              重置角度
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
