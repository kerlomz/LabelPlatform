/**
 * 专业标注画布组件
 * 参考 CVAT、Labelme 等专业工具的交互设计
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Group, Text } from 'react-konva'
import { message } from 'antd'
import Konva from 'konva'
import type { BBox, Polygon, Point } from '../../types'
import { CanvasToolbar } from './Toolbar'
import { CanvasSidebar } from './Sidebar'
import { CanvasStatusBar } from './StatusBar'
import './styles.css'

interface AnnotationCanvasProps {
  imageUrl: string
  annotations: any[]
  labels: string[]
  onSave: (data: any) => void
  onCancel?: () => void
}

enum Tool {
  SELECT = 'select',
  BBOX = 'bbox',
  POLYGON = 'polygon',
  PAN = 'pan',
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  annotations,
  labels,
  onSave,
  onCancel,
}) => {
  // 基础状态
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.BBOX)
  const [selectedLabel, setSelectedLabel] = useState(labels[0] || '')

  // Canvas状态
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // 标注对象
  const [bboxes, setBboxes] = useState<BBox[]>([])
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 绘制状态
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  // 历史记录
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const CANVAS_WIDTH = 1400
  const CANVAS_HEIGHT = 900

  // ==================== 图片加载 ====================

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
      // 自动适应画布
      zoomToFit(img.width, img.height)
    }
  }, [imageUrl])

  // ==================== 缩放和平移 ====================

  const zoomToFit = (imgWidth: number, imgHeight: number) => {
    const scaleX = CANVAS_WIDTH / imgWidth
    const scaleY = CANVAS_HEIGHT / imgHeight
    const newScale = Math.min(scaleX, scaleY) * 0.9

    setScale(newScale)
    setPosition({
      x: (CANVAS_WIDTH - imgWidth * newScale) / 2,
      y: (CANVAS_HEIGHT - imgHeight * newScale) / 2,
    })
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const stage = stageRef.current
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // 缩放因子
    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

    // 限制缩放范围
    const clampedScale = Math.max(0.1, Math.min(10, newScale))

    // 以鼠标位置为中心缩放
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    }

    setScale(clampedScale)
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  const handlePanStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && currentTool === Tool.PAN)) {
      // 中键或选择平移工具
      setIsPanning(true)
      setPanStart({
        x: e.evt.clientX - position.x,
        y: e.evt.clientY - position.y,
      })
    }
  }

  const handlePanMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return

    setPosition({
      x: e.evt.clientX - panStart.x,
      y: e.evt.clientY - panStart.y,
    })
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // ==================== 快捷键 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 数字键选择标签
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1
        if (index < labels.length) {
          setSelectedLabel(labels[index])
          message.success(`切换到标签: ${labels[index]}`)
        }
        return
      }

      // 工具切换
      if (e.key === 'v' || e.key === 'V') {
        setCurrentTool(Tool.SELECT)
        return
      }
      if (e.key === 'b' || e.key === 'B') {
        setCurrentTool(Tool.BBOX)
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        setCurrentTool(Tool.POLYGON)
        return
      }

      // 删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selectedId) {
          setBboxes(bboxes.filter(b => b.id !== selectedId))
          setPolygons(polygons.filter(p => p.id !== selectedId))
          setSelectedId(null)
          message.success('已删除')
        }
        return
      }

      // 撤销/重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }

      // 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // 缩放
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setScale(s => Math.min(10, s * 1.2))
        return
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setScale(s => Math.max(0.1, s / 1.2))
        return
      }

      // 适应窗口
      if (e.key === '0') {
        e.preventDefault()
        if (image) {
          zoomToFit(image.width, image.height)
        }
        return
      }

      // 切换平移模式
      if (e.key === ' ') {
        e.preventDefault()
        setCurrentTool(Tool.PAN)
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setCurrentTool(Tool.SELECT)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [labels, selectedId, bboxes, polygons, image])

  // ==================== 历史记录 ====================

  const addToHistory = useCallback((state: any) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(state)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setBboxes(prevState.bboxes || [])
      setPolygons(prevState.polygons || [])
      setHistoryIndex(historyIndex - 1)
      message.success('撤销')
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setBboxes(nextState.bboxes || [])
      setPolygons(nextState.polygons || [])
      setHistoryIndex(historyIndex + 1)
      message.success('重做')
    }
  }

  // ==================== 保存 ====================

  const handleSave = () => {
    onSave({
      bboxes,
      polygons,
    })
    message.success('保存成功')
  }

  // ==================== 渲染 ====================

  return (
    <div className="annotation-canvas-container" ref={containerRef}>
      {/* 顶部工具栏 */}
      <CanvasToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        scale={scale}
        onZoomIn={() => setScale(s => Math.min(10, s * 1.2))}
        onZoomOut={() => setScale(s => Math.max(0.1, s / 1.2))}
        onZoomFit={() => image && zoomToFit(image.width, image.height)}
        onSave={handleSave}
        onCancel={onCancel}
      />

      <div className="canvas-main">
        {/* 左侧工具面板 */}
        <div className="canvas-tools">
          {/* 工具图标 */}
        </div>

        {/* 中间画布区域 */}
        <div className="canvas-stage-wrapper">
          <Stage
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onWheel={handleWheel}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            ref={stageRef}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
          >
            <Layer>
              {/* 背景图片 */}
              {image && <KonvaImage image={image} />}

              {/* 标注对象会在这里渲染 */}
            </Layer>
          </Stage>
        </div>

        {/* 右侧属性面板 */}
        <CanvasSidebar
          labels={labels}
          selectedLabel={selectedLabel}
          onLabelChange={setSelectedLabel}
          annotations={[...bboxes, ...polygons]}
          selectedId={selectedId}
          onSelectAnnotation={setSelectedId}
          onDeleteAnnotation={(id) => {
            setBboxes(bboxes.filter(b => b.id !== id))
            setPolygons(polygons.filter(p => p.id !== id))
          }}
        />
      </div>

      {/* 底部状态栏 */}
      <CanvasStatusBar
        scale={scale}
        objectCount={bboxes.length + polygons.length}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        currentTool={currentTool}
      />
    </div>
  )
}
