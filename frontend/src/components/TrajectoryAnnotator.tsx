import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { Button, Space, Card, Typography, Tag } from 'antd'
import { SaveOutlined, ClearOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType, Trajectory, Point } from '../types'
import Konva from 'konva'

const { Title, Text } = Typography

interface TrajectoryAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (trajectory: Trajectory) => void
}

export const TrajectoryAnnotator: React.FC<TrajectoryAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [timestamps, setTimestamps] = useState<number[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const stageRef = useRef<Konva.Stage>(null)
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
      type: AnnotationType.TRAJECTORY,
      imageUrl,
      imageName,
      trajectory: {
        points,
        timestamps
      }
    })
  }, [points, timestamps, imageUrl, imageName])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setIsDrawing(true)
    setStartTime(Date.now())
    setPoints([{ x: pos.x, y: pos.y }])
    setTimestamps([0])
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const currentTime = Date.now() - startTime
    setPoints([...points, { x: pos.x, y: pos.y }])
    setTimestamps([...timestamps, currentTime])
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    setPoints([])
    setTimestamps([])
    setIsDrawing(false)
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        points,
        timestamps
      })
    }
  }

  const flattenPoints = (pts: Point[]): number[] => {
    return pts.flatMap((p) => [p.x, p.y])
  }

  const calculateDistance = (): number => {
    if (points.length < 2) return 0
    let distance = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      distance += Math.sqrt(dx * dx + dy * dy)
    }
    return Math.round(distance)
  }

  const getTotalTime = (): number => {
    return timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>拖动轨迹标注</Title>
            <Text type="secondary">
              按住鼠标左键拖动,记录拖动轨迹
            </Text>
          </div>

          <Space>
            <Tag color="blue">轨迹点数: {points.length}</Tag>
            <Tag color="green">轨迹长度: {calculateDistance()} px</Tag>
            <Tag color="orange">耗时: {getTotalTime()} ms</Tag>
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
              style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                  />
                )}

                {points.length > 1 && (
                  <Line
                    points={flattenPoints(points)}
                    stroke="#ff4d4f"
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.5}
                  />
                )}
              </Layer>
            </Stage>
          </div>

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={points.length === 0}
            >
              保存标注
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={points.length === 0}
            >
              清空轨迹
            </Button>
            {points.length === 0 && (
              <Text type="secondary">
                <PlayCircleOutlined /> 按住鼠标左键开始绘制轨迹
              </Text>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  )
}
