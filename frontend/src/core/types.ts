// ==================== 核心抽象层 ====================

import type { Point } from '../types'

/**
 * 工具类型枚举
 */
export enum ToolType {
  SELECT = 'select',          // 选择工具
  PAN = 'pan',               // 平移工具
  BBOX = 'bbox',             // 矩形框
  POLYGON = 'polygon',       // 多边形
  POINT = 'point',           // 点标注
  LINE = 'line',             // 线段
  TRAJECTORY = 'trajectory', // 轨迹
  BRUSH = 'brush',           // 笔刷
}

/**
 * 工具状态
 */
export enum ToolState {
  IDLE = 'idle',
  DRAWING = 'drawing',
  EDITING = 'editing',
  DRAGGING = 'dragging',
}

/**
 * 标注对象基类接口
 */
export interface AnnotationObject {
  id: string
  type: string
  label?: string
  color?: string
  visible: boolean
  locked: boolean
  selected: boolean
  confidence?: number
  metadata?: Record<string, any>
}

/**
 * 矩形框标注
 */
export interface BBoxObject extends AnnotationObject {
  type: 'bbox'
  x: number
  y: number
  width: number
  height: number
}

/**
 * 多边形标注
 */
export interface PolygonObject extends AnnotationObject {
  type: 'polygon'
  points: Point[]
  closed: boolean
}

/**
 * 点标注
 */
export interface PointObject extends AnnotationObject {
  type: 'point'
  x: number
  y: number
}

/**
 * 线段标注
 */
export interface LineObject extends AnnotationObject {
  type: 'line'
  points: Point[]
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  type: ToolType
  name: string
  icon: React.ReactNode
  hotkey?: string
  cursor?: string
}

/**
 * 画布状态
 */
export interface CanvasState {
  scale: number        // 缩放比例
  offsetX: number      // X偏移
  offsetY: number      // Y偏移
  isPanning: boolean   // 是否在平移
  gridEnabled: boolean // 网格显示
  snapEnabled: boolean // 磁吸对齐
}

/**
 * 工具基类接口
 */
export interface BaseTool {
  type: ToolType
  state: ToolState
  config: ToolConfig

  // 生命周期
  onActivate(): void
  onDeactivate(): void

  // 鼠标事件
  onMouseDown(e: MouseEvent, pos: Point): void
  onMouseMove(e: MouseEvent, pos: Point): void
  onMouseUp(e: MouseEvent, pos: Point): void
  onMouseClick(e: MouseEvent, pos: Point): void
  onMouseDblClick(e: MouseEvent, pos: Point): void

  // 键盘事件
  onKeyDown(e: KeyboardEvent): void
  onKeyUp(e: KeyboardEvent): void

  // 渲染
  render(): React.ReactNode

  // 工具特定方法
  reset(): void
  canUndo(): boolean
  canRedo(): boolean
}

/**
 * 快捷键配置
 */
export interface HotkeyConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  category?: string
}

/**
 * 操作历史记录
 */
export interface HistoryAction {
  type: 'create' | 'update' | 'delete' | 'batch'
  timestamp: number
  objects: AnnotationObject[]
  metadata?: any
}

/**
 * 项目配置
 */
export interface ProjectConfig {
  id: number
  name: string
  annotationType: string
  labels: LabelConfig[]
  colors: string[]
  settings: {
    autoSave: boolean
    autoSaveInterval: number
    showGrid: boolean
    enableSnap: boolean
    snapDistance: number
    minBBoxSize: number
    pointRadius: number
    lineWidth: number
  }
}

/**
 * 标签配置
 */
export interface LabelConfig {
  id: string
  name: string
  color: string
  hotkey?: string
  attributes?: AttributeConfig[]
}

/**
 * 属性配置
 */
export interface AttributeConfig {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  options?: string[]
  required?: boolean
  default?: any
}
