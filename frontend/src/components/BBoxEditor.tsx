import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Text, Group } from 'react-konva'
import { Button, Space, Select, Input, Tag, message, Card } from 'antd'
import {
  SaveOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import Konva from 'konva'
import type { BBox } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface BBoxEditorProps {
  imageUrl: string
  initialBBoxes?: BBox[]
  labels: string[]
  onSave?: (bboxes: BBox[]) => void
  onCancel?: () => void
}

interface Rectangle extends BBox {
  isSelected: boolean
}

export const BBoxEditor: React.FC<BBoxEditorProps> = ({
  imageUrl,
  initialBBoxes = [],
  labels,
  onSave,
  onCancel,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [rectangles, setRectangles] = useState<Rectangle[]>(
    initialBBoxes.map((bbox) => ({ ...bbox, isSelected: false }))
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newRect, setNewRect] = useState<Partial<BBox> | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLabel, setCurrentLabel] = useState<string>(labels[0] || '')

  // 历史记录
  const [history, setHistory] = useState<Rectangle[][]>([rectangles])
  const [historyIndex, setHistoryIndex] = useState(0)

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)

  const CANVAS_WIDTH = 1200
  const CANVAS_HEIGHT = 800

  // 加载图片
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => setImage(img)
  }, [imageUrl])

  // 更新Transformer
  useEffect(() => {
    if (transformerRef.current) {
      const selectedNode = layerRef.current?.findOne(`#${selectedId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      } else {
        transformerRef.current.nodes([])
      }
    }
  }, [selectedId])

  // 添加到历史记录
  const addToHistory = useCallback((rects: Rectangle[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(rects)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setRectangles(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setRectangles(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // 鼠标按下 - 开始绘制
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
      setSelectedId(null)

      // 开始绘制新矩形
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        setIsDrawing(true)
        setNewRect({
          id: uuidv4(),
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          label: currentLabel,
        })
      }
    }
  }

  // 鼠标移动 - 绘制中
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newRect) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      setNewRect({
        ...newRect,
        width: pos.x - (newRect.x || 0),
        height: pos.y - (newRect.y || 0),
      })
    }
  }

  // 鼠标松开 - 完成绘制
  const handleMouseUp = () => {
    if (!isDrawing || !newRect) return

    // 只添加有效的矩形
    if (newRect.width && newRect.height &&
        Math.abs(newRect.width) > 10 && Math.abs(newRect.height) > 10) {
      const normalizedRect: Rectangle = {
        id: newRect.id!,
        x: newRect.width < 0 ? (newRect.x! + newRect.width) : newRect.x!,
        y: newRect.height < 0 ? (newRect.y! + newRect.height) : newRect.y!,
        width: Math.abs(newRect.width),
        height: Math.abs(newRect.height),
        label: newRect.label,
        isSelected: false,
      }

      const newRects = [...rectangles, normalizedRect]
      setRectangles(newRects)
      addToHistory(newRects)
      message.success('添加框成功')
    }

    setIsDrawing(false)
    setNewRect(null)
  }

  // 选中矩形
  const handleRectClick = (id: string) => {
    setSelectedId(id)
    setRectangles(
      rectangles.map((rect) => ({
        ...rect,
        isSelected: rect.id === id,
      }))
    )
  }

  // 矩形变换结束（移动/调整大小）
  const handleTransformEnd = (id: string, node: Konva.Rect) => {
    const rect = rectangles.find((r) => r.id === id)
    if (!rect) return

    const newRects = rectangles.map((r) =>
      r.id === id
        ? {
            ...r,
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
          }
        : r
    )

    // 重置缩放
    node.scaleX(1)
    node.scaleY(1)

    setRectangles(newRects)
    addToHistory(newRects)
  }

  // 删除选中的矩形
  const deleteSelected = () => {
    if (!selectedId) return

    const newRects = rectangles.filter((r) => r.id !== selectedId)
    setRectangles(newRects)
    addToHistory(newRects)
    setSelectedId(null)
    message.success('删除成功')
  }

  // 复制选中的矩形
  const duplicateSelected = () => {
    if (!selectedId) return

    const rect = rectangles.find((r) => r.id === selectedId)
    if (!rect) return

    const newRect: Rectangle = {
      ...rect,
      id: uuidv4(),
      x: rect.x + 20,
      y: rect.y + 20,
      isSelected: false,
    }

    const newRects = [...rectangles, newRect]
    setRectangles(newRects)
    addToHistory(newRects)
    message.success('复制成功')
  }

  // 更新选中矩形的标签
  const updateSelectedLabel = (label: string) => {
    if (!selectedId) return

    const newRects = rectangles.map((r) =>
      r.id === selectedId ? { ...r, label } : r
    )
    setRectangles(newRects)
    addToHistory(newRects)
  }

  // 保存
  const handleSave = () => {
    const bboxes = rectangles.map(({ isSelected, ...rest }) => rest)
    if (onSave) {
      onSave(bboxes)
      message.success('保存成功')
    }
  }

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          undo()
        } else if (e.key === 'y') {
          e.preventDefault()
          redo()
        } else if (e.key === 'd') {
          e.preventDefault()
          duplicateSelected()
        } else if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, rectangles])

  const selectedRect = rectangles.find((r) => r.id === selectedId)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <Card size="small" style={{ borderRadius: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color="blue">已标注: {rectangles.length}</Tag>

            <Select
              value={currentLabel}
              onChange={setCurrentLabel}
              style={{ width: 150 }}
              placeholder="选择标签"
            >
              {labels.map((label) => (
                <Select.Option key={label} value={label}>
                  {label}
                </Select.Option>
              ))}
            </Select>

            {selectedRect && (
              <>
                <span>选中框标签:</span>
                <Select
                  value={selectedRect.label}
                  onChange={updateSelectedLabel}
                  style={{ width: 150 }}
                >
                  {labels.map((label) => (
                    <Select.Option key={label} value={label}>
                      {label}
                    </Select.Option>
                  ))}
                </Select>
              </>
            )}
          </Space>

          <Space>
            <Button
              icon={<UndoOutlined />}
              onClick={undo}
              disabled={historyIndex === 0}
              title="撤销 (Ctrl+Z)"
            >
              撤销
            </Button>
            <Button
              icon={<RedoOutlined />}
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              title="重做 (Ctrl+Y)"
            >
              重做
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={duplicateSelected}
              disabled={!selectedId}
              title="复制 (Ctrl+D)"
            >
              复制
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={deleteSelected}
              disabled={!selectedId}
              title="删除 (Delete)"
            >
              删除
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存 (Ctrl+S)
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>取消</Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 画布 */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f0f0', padding: 20 }}>
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
          style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Layer ref={layerRef}>
            {/* 背景图片 */}
            {image && (
              <KonvaImage
                image={image}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
              />
            )}

            {/* 已有的矩形 */}
            {rectangles.map((rect) => (
              <Group key={rect.id}>
                <Rect
                  id={rect.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  stroke={rect.isSelected ? '#1890ff' : '#52c41a'}
                  strokeWidth={rect.isSelected ? 3 : 2}
                  fill={rect.isSelected ? 'rgba(24, 144, 255, 0.1)' : 'rgba(82, 196, 26, 0.1)'}
                  onClick={() => handleRectClick(rect.id)}
                  onTap={() => handleRectClick(rect.id)}
                  draggable
                  onDragEnd={(e) => handleTransformEnd(rect.id, e.target as Konva.Rect)}
                  onTransformEnd={(e) => handleTransformEnd(rect.id, e.target as Konva.Rect)}
                />
                {/* 标签 */}
                {rect.label && (
                  <Text
                    x={rect.x}
                    y={rect.y - 20}
                    text={rect.label}
                    fontSize={14}
                    fill={rect.isSelected ? '#1890ff' : '#52c41a'}
                    fontStyle="bold"
                  />
                )}
              </Group>
            ))}

            {/* 正在绘制的矩形 */}
            {newRect && newRect.width && newRect.height && (
              <Rect
                x={newRect.width < 0 ? (newRect.x! + newRect.width) : newRect.x}
                y={newRect.height < 0 ? (newRect.y! + newRect.height) : newRect.y}
                width={Math.abs(newRect.width)}
                height={Math.abs(newRect.height)}
                stroke="#faad14"
                strokeWidth={2}
                fill="rgba(250, 173, 20, 0.1)"
                dash={[5, 5]}
              />
            )}

            {/* 变换器 */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // 限制最小尺寸
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox
                }
                return newBox
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* 快捷键提示 */}
      <Card size="small" style={{ borderRadius: 0 }}>
        <Space split="|">
          <span>鼠标拖动: 创建框</span>
          <span>点击: 选中框</span>
          <span>拖动框: 移动</span>
          <span>拖动角点: 调整大小</span>
          <span>Delete: 删除</span>
          <span>Ctrl+Z/Y: 撤销/重做</span>
          <span>Ctrl+D: 复制</span>
          <span>Ctrl+S: 保存</span>
        </Space>
      </Card>
    </div>
  )
}
