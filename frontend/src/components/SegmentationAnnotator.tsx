import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva'
import { Button, Space, Card, Typography, Tag, List, Input } from 'antd'
import { SaveOutlined, UndoOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType, Polygon, Point } from '../types'
import Konva from 'konva'

const { Title, Text } = Typography

interface SegmentationAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (polygons: Polygon[]) => void
}

export const SegmentationAnnotator: React.FC<SegmentationAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [label, setLabel] = useState('')
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
      type: AnnotationType.SEGMENTATION,
      imageUrl,
      imageName,
      polygons
    })
  }, [polygons, imageUrl, imageName])

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // 双击完成当前多边形
    if (e.evt.detail === 2) {
      if (currentPoints.length >= 3) {
        finishPolygon()
      }
      return
    }

    // 添加点
    setCurrentPoints([...currentPoints, { x: pos.x, y: pos.y }])
  }

  const finishPolygon = () => {
    if (currentPoints.length >= 3) {
      setPolygons([
        ...polygons,
        {
          points: currentPoints,
          label: label || undefined
        }
      ])
      setCurrentPoints([])
    }
  }

  const handleUndo = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1))
    }
  }

  const handleDeletePolygon = (index: number) => {
    setPolygons(polygons.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (onSave) {
      onSave(polygons)
    }
  }

  const flattenPoints = (points: Point[]): number[] => {
    return points.flatMap((p) => [p.x, p.y])
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>分割模式标注 (多边形描边)</Title>
            <Text type="secondary">
              点击画布添加点,双击完成多边形。至少需要3个点。
            </Text>
          </div>

          <Space>
            <Input
              placeholder="标签 (可选)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ width: 200 }}
            />
            <Tag color="blue">已完成: {polygons.length} 个多边形</Tag>
            <Tag color="green">当前: {currentPoints.length} 个点</Tag>
          </Space>

          <div style={{ border: '1px solid #d9d9d9', display: 'inline-block' }}>
            <Stage
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onClick={handleClick}
              ref={stageRef}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                  />
                )}

                {/* 已完成的多边形 */}
                {polygons.map((polygon, i) => (
                  <React.Fragment key={i}>
                    <Line
                      points={flattenPoints(polygon.points)}
                      stroke="#1890ff"
                      strokeWidth={2}
                      closed
                      fill="rgba(24, 144, 255, 0.2)"
                    />
                    {polygon.points.map((point, j) => (
                      <Circle
                        key={`${i}-${j}`}
                        x={point.x}
                        y={point.y}
                        radius={4}
                        fill="#1890ff"
                      />
                    ))}
                  </React.Fragment>
                ))}

                {/* 当前正在绘制的多边形 */}
                {currentPoints.length > 0 && (
                  <>
                    <Line
                      points={flattenPoints(currentPoints)}
                      stroke="#52c41a"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                    {currentPoints.map((point, i) => (
                      <Circle
                        key={i}
                        x={point.x}
                        y={point.y}
                        radius={5}
                        fill="#52c41a"
                      />
                    ))}
                  </>
                )}
              </Layer>
            </Stage>
          </div>

          {polygons.length > 0 && (
            <Card title="多边形列表" size="small">
              <List
                size="small"
                dataSource={polygons}
                renderItem={(polygon, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeletePolygon(index)}
                      >
                        删除
                      </Button>
                    ]}
                  >
                    <Text>
                      多边形 {index + 1}: {polygon.label || '无标签'} - {polygon.points.length} 个点
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={polygons.length === 0}
            >
              保存标注
            </Button>
            <Button
              type="default"
              icon={<CheckOutlined />}
              onClick={finishPolygon}
              disabled={currentPoints.length < 3}
            >
              完成当前多边形
            </Button>
            <Button
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={currentPoints.length === 0}
            >
              撤销点
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
