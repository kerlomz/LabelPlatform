import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva'
import { Button, Space, Card, Typography, Input, Tag, List } from 'antd'
import { SaveOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType, BoundingBox } from '../types'
import Konva from 'konva'

const { Title, Text } = Typography

interface BoundingBoxAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (boxes: BoundingBox[]) => void
}

export const BoundingBoxAnnotator: React.FC<BoundingBoxAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [boxes, setBoxes] = useState<BoundingBox[]>([])
  const [newBox, setNewBox] = useState<BoundingBox | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
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
      type: AnnotationType.BOUNDING_BOX,
      imageUrl,
      imageName,
      boundingBoxes: boxes
    })
  }, [boxes, imageUrl, imageName])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectedId !== null) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setIsDrawing(true)
    setNewBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      label: label || undefined
    })
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newBox) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setNewBox({
      ...newBox,
      width: pos.x - newBox.x,
      height: pos.y - newBox.y
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !newBox) return

    // 只添加有效的框
    if (Math.abs(newBox.width) > 5 && Math.abs(newBox.height) > 5) {
      const normalizedBox = {
        x: newBox.width < 0 ? newBox.x + newBox.width : newBox.x,
        y: newBox.height < 0 ? newBox.y + newBox.height : newBox.y,
        width: Math.abs(newBox.width),
        height: Math.abs(newBox.height),
        label: newBox.label
      }
      setBoxes([...boxes, normalizedBox])
    }

    setIsDrawing(false)
    setNewBox(null)
  }

  const handleDelete = (index: number) => {
    setBoxes(boxes.filter((_, i) => i !== index))
    setSelectedId(null)
  }

  const handleDeleteLast = () => {
    if (boxes.length > 0) {
      setBoxes(boxes.slice(0, -1))
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave(boxes)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>点选验证码拉框标注</Title>
            <Text type="secondary">
              按住鼠标左键拖动创建矩形框,可为每个框添加标签
            </Text>
          </div>

          <Space>
            <Input
              placeholder="标签 (可选)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ width: 200 }}
            />
            <Tag color="blue">已标注: {boxes.length} 个框</Tag>
          </Space>

          <div style={{ border: '1px solid #d9d9d9', display: 'inline-block' }}>
            <Stage
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
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
                {boxes.map((box, i) => (
                  <Rect
                    key={i}
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    stroke="#1890ff"
                    strokeWidth={2}
                    fill="rgba(24, 144, 255, 0.2)"
                    onClick={() => setSelectedId(i)}
                  />
                ))}
                {newBox && (
                  <Rect
                    x={newBox.x}
                    y={newBox.y}
                    width={newBox.width}
                    height={newBox.height}
                    stroke="#52c41a"
                    strokeWidth={2}
                    fill="rgba(82, 196, 26, 0.2)"
                    dash={[5, 5]}
                  />
                )}
              </Layer>
            </Stage>
          </div>

          {boxes.length > 0 && (
            <Card title="标注列表" size="small">
              <List
                size="small"
                dataSource={boxes}
                renderItem={(box, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(index)}
                      >
                        删除
                      </Button>
                    ]}
                  >
                    <Text>
                      框 {index + 1}: {box.label || '无标签'} - ({Math.round(box.x)}, {Math.round(box.y)}, {Math.round(box.width)}x{Math.round(box.height)})
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
              disabled={boxes.length === 0}
            >
              保存标注
            </Button>
            <Button
              icon={<UndoOutlined />}
              onClick={handleDeleteLast}
              disabled={boxes.length === 0}
            >
              撤销上一个
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
