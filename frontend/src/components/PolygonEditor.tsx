import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle, Group, Text } from 'react-konva'
import { Button, Space, Select, Tag, message, Card, Switch } from 'antd'
import {
  SaveOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import Konva from 'konva'
import type { Polygon, Point } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface PolygonEditorProps {
  imageUrl: string
  initialPolygons?: Polygon[]
  labels: string[]
  onSave?: (polygons: Polygon[]) => void
  onCancel?: () => void
}

interface EditablePolygon extends Polygon {
  isSelected: boolean
  isClosed: boolean
}

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  imageUrl,
  initialPolygons = [],
  labels,
  onSave,
  onCancel,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [polygons, setPolygons] = useState<EditablePolygon[]>(
    initialPolygons.map((poly) => ({ ...poly, isSelected: false, isClosed: true }))
  )
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([])
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [currentLabel, setCurrentLabel] = useState<string>(labels[0] || '')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showPoints, setShowPoints] = useState(true)

  // 历史记录
  const [history, setHistory] = useState<EditablePolygon[][]>([polygons])
  const [historyIndex, setHistoryIndex] = useState(0)

  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)

  const CANVAS_WIDTH = 1200
  const CANVAS_HEIGHT = 800
  const POINT_RADIUS = 6

  // 加载图片
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => setImage(img)
  }, [imageUrl])

  // 添加到历史记录
  const addToHistory = useCallback(
    (polys: EditablePolygon[]) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(polys)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex]
  )

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPolygons(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPolygons(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // 点击画布
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage()

    if (!clickedOnEmpty) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    if (isDrawing) {
      // 添加点到当前多边形
      setCurrentPolygon([...currentPolygon, { x: pos.x, y: pos.y }])
    } else {
      // 取消选择
      setSelectedPolygonId(null)
      setSelectedPointIndex(null)
      setPolygons(polygons.map((p) => ({ ...p, isSelected: false })))
    }
  }

  // 双击完成多边形
  const handleStageDblClick = () => {
    if (isDrawing && currentPolygon.length >= 3) {
      finishPolygon()
    }
  }

  // 完成当前多边形
  const finishPolygon = () => {
    if (currentPolygon.length < 3) {
      message.warning('至少需要3个点')
      return
    }

    const newPolygon: EditablePolygon = {
      id: uuidv4(),
      points: currentPolygon,
      label: currentLabel,
      isSelected: false,
      isClosed: true,
    }

    const newPolygons = [...polygons, newPolygon]
    setPolygons(newPolygons)
    addToHistory(newPolygons)

    setCurrentPolygon([])
    setIsDrawing(false)
    message.success('多边形创建成功')
  }

  // 取消当前多边形
  const cancelCurrentPolygon = () => {
    setCurrentPolygon([])
    setIsDrawing(false)
  }

  // 开始绘制新多边形
  const startNewPolygon = () => {
    setIsDrawing(true)
    setCurrentPolygon([])
    setSelectedPolygonId(null)
    setSelectedPointIndex(null)
  }

  // 选中多边形
  const selectPolygon = (id: string) => {
    setSelectedPolygonId(id)
    setSelectedPointIndex(null)
    setPolygons(
      polygons.map((p) => ({
        ...p,
        isSelected: p.id === id,
      }))
    )
  }

  // 删除选中的多边形
  const deleteSelectedPolygon = () => {
    if (!selectedPolygonId) return

    const newPolygons = polygons.filter((p) => p.id !== selectedPolygonId)
    setPolygons(newPolygons)
    addToHistory(newPolygons)
    setSelectedPolygonId(null)
    message.success('删除成功')
  }

  // 点拖动结束
  const handlePointDragEnd = (polygonId: string, pointIndex: number, e: any) => {
    const newPolygons = polygons.map((poly) => {
      if (poly.id === polygonId) {
        const newPoints = [...poly.points]
        newPoints[pointIndex] = {
          x: e.target.x(),
          y: e.target.y(),
        }
        return { ...poly, points: newPoints }
      }
      return poly
    })

    setPolygons(newPolygons)
    addToHistory(newPolygons)
  }

  // 删除点
  const deletePoint = (polygonId: string, pointIndex: number) => {
    const polygon = polygons.find((p) => p.id === polygonId)
    if (!polygon || polygon.points.length <= 3) {
      message.warning('至少需要保留3个点')
      return
    }

    const newPolygons = polygons.map((poly) => {
      if (poly.id === polygonId) {
        const newPoints = poly.points.filter((_, i) => i !== pointIndex)
        return { ...poly, points: newPoints }
      }
      return poly
    })

    setPolygons(newPolygons)
    addToHistory(newPolygons)
    setSelectedPointIndex(null)
    message.success('删除点成功')
  }

  // 更新选中多边形的标签
  const updateSelectedLabel = (label: string) => {
    if (!selectedPolygonId) return

    const newPolygons = polygons.map((p) =>
      p.id === selectedPolygonId ? { ...p, label } : p
    )
    setPolygons(newPolygons)
    addToHistory(newPolygons)
  }

  // 保存
  const handleSave = () => {
    if (isDrawing) {
      message.warning('请先完成当前多边形')
      return
    }

    const result = polygons.map(({ isSelected, isClosed, ...rest }) => rest)
    if (onSave) {
      onSave(result)
      message.success('保存成功')
    }
  }

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selectedPointIndex !== null && selectedPolygonId) {
          deletePoint(selectedPolygonId, selectedPointIndex)
        } else {
          deleteSelectedPolygon()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (isDrawing) {
          cancelCurrentPolygon()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (isDrawing) {
          finishPolygon()
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          undo()
        } else if (e.key === 'y') {
          e.preventDefault()
          redo()
        } else if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing, currentPolygon, selectedPolygonId, selectedPointIndex, polygons])

  const flattenPoints = (points: Point[]): number[] => {
    return points.flatMap((p) => [p.x, p.y])
  }

  const selectedPolygon = polygons.find((p) => p.id === selectedPolygonId)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <Card size="small" style={{ borderRadius: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color="blue">已标注: {polygons.length}</Tag>
            {isDrawing && <Tag color="orange">绘制中: {currentPolygon.length} 个点</Tag>}

            {!isDrawing && (
              <Button type="primary" onClick={startNewPolygon}>
                开始绘制多边形
              </Button>
            )}

            <Select
              value={currentLabel}
              onChange={setCurrentLabel}
              style={{ width: 150 }}
              placeholder="选择标签"
              disabled={isDrawing}
            >
              {labels.map((label) => (
                <Select.Option key={label} value={label}>
                  {label}
                </Select.Option>
              ))}
            </Select>

            {selectedPolygon && (
              <>
                <span>选中多边形标签:</span>
                <Select
                  value={selectedPolygon.label}
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

            <span>显示点:</span>
            <Switch checked={showPoints} onChange={setShowPoints} />
          </Space>

          <Space>
            {isDrawing && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={finishPolygon}
                  disabled={currentPolygon.length < 3}
                >
                  完成 (Enter)
                </Button>
                <Button icon={<CloseOutlined />} onClick={cancelCurrentPolygon}>
                  取消 (Esc)
                </Button>
              </>
            )}

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
              danger
              icon={<DeleteOutlined />}
              onClick={deleteSelectedPolygon}
              disabled={!selectedPolygonId}
              title="删除 (Delete)"
            >
              删除
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={isDrawing}
            >
              保存 (Ctrl+S)
            </Button>
            {onCancel && <Button onClick={onCancel}>取消</Button>}
          </Space>
        </div>
      </Card>

      {/* 画布 */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f0f0', padding: 20 }}>
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          ref={stageRef}
          style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Layer ref={layerRef}>
            {/* 背景图片 */}
            {image && <KonvaImage image={image} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />}

            {/* 已完成的多边形 */}
            {polygons.map((polygon) => (
              <Group key={polygon.id}>
                {/* 多边形线 */}
                <Line
                  points={flattenPoints(polygon.points)}
                  stroke={polygon.isSelected ? '#1890ff' : '#52c41a'}
                  strokeWidth={polygon.isSelected ? 3 : 2}
                  closed
                  fill={
                    polygon.isSelected
                      ? 'rgba(24, 144, 255, 0.1)'
                      : 'rgba(82, 196, 26, 0.1)'
                  }
                  onClick={() => selectPolygon(polygon.id)}
                  onTap={() => selectPolygon(polygon.id)}
                />

                {/* 标签 */}
                {polygon.label && polygon.points.length > 0 && (
                  <Text
                    x={polygon.points[0].x}
                    y={polygon.points[0].y - 20}
                    text={polygon.label}
                    fontSize={14}
                    fill={polygon.isSelected ? '#1890ff' : '#52c41a'}
                    fontStyle="bold"
                  />
                )}

                {/* 点 */}
                {showPoints &&
                  polygon.points.map((point, index) => (
                    <Circle
                      key={index}
                      x={point.x}
                      y={point.y}
                      radius={POINT_RADIUS}
                      fill={
                        selectedPolygonId === polygon.id &&
                        selectedPointIndex === index
                          ? '#ff4d4f'
                          : polygon.isSelected
                          ? '#1890ff'
                          : '#52c41a'
                      }
                      stroke="white"
                      strokeWidth={2}
                      draggable={polygon.isSelected}
                      onDragEnd={(e) => handlePointDragEnd(polygon.id, index, e)}
                      onClick={(e) => {
                        e.cancelBubble = true
                        setSelectedPointIndex(index)
                        setSelectedPolygonId(polygon.id)
                      }}
                      onMouseEnter={(e) => {
                        const stage = e.target.getStage()
                        if (stage) stage.container().style.cursor = 'pointer'
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage()
                        if (stage) stage.container().style.cursor = 'default'
                      }}
                    />
                  ))}
              </Group>
            ))}

            {/* 当前正在绘制的多边形 */}
            {isDrawing && currentPolygon.length > 0 && (
              <>
                <Line
                  points={flattenPoints(currentPolygon)}
                  stroke="#faad14"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
                {currentPolygon.map((point, index) => (
                  <Circle
                    key={index}
                    x={point.x}
                    y={point.y}
                    radius={POINT_RADIUS}
                    fill="#faad14"
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* 快捷键提示 */}
      <Card size="small" style={{ borderRadius: 0 }}>
        <Space split="|">
          <span>点击: 添加点</span>
          <span>双击: 完成多边形</span>
          <span>拖动点: 调整位置</span>
          <span>选中点+Delete: 删除点</span>
          <span>Enter: 完成</span>
          <span>Esc: 取消</span>
          <span>Ctrl+Z/Y: 撤销/重做</span>
        </Space>
      </Card>
    </div>
  )
}
