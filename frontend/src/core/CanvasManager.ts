/**
 * Canvas管理器
 * 处理缩放、平移、坐标转换等核心功能
 */

import type { Point, CanvasState } from './types'

export class CanvasManager {
  private state: CanvasState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    gridEnabled: false,
    snapEnabled: true,
  }

  private canvas: HTMLCanvasElement | null = null
  private minScale = 0.1
  private maxScale = 10
  private snapDistance = 5

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.setCanvas(canvas)
    }
  }

  /**
   * 设置Canvas元素
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
  }

  /**
   * 获取状态
   */
  getState(): CanvasState {
    return { ...this.state }
  }

  /**
   * 更新状态
   */
  setState(updates: Partial<CanvasState>): void {
    this.state = { ...this.state, ...updates }
  }

  // ==================== 缩放功能 ====================

  /**
   * 缩放到指定比例
   */
  zoomTo(scale: number, center?: Point): void {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, scale))

    if (center) {
      // 以指定点为中心缩放
      const ratio = newScale / this.state.scale
      this.state.offsetX = center.x - (center.x - this.state.offsetX) * ratio
      this.state.offsetY = center.y - (center.y - this.state.offsetY) * ratio
    }

    this.state.scale = newScale
  }

  /**
   * 放大
   */
  zoomIn(center?: Point): void {
    this.zoomTo(this.state.scale * 1.2, center)
  }

  /**
   * 缩小
   */
  zoomOut(center?: Point): void {
    this.zoomTo(this.state.scale / 1.2, center)
  }

  /**
   * 适应窗口
   */
  zoomToFit(imageWidth: number, imageHeight: number): void {
    if (!this.canvas) return

    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height

    const scaleX = canvasWidth / imageWidth
    const scaleY = canvasHeight / imageHeight
    const scale = Math.min(scaleX, scaleY) * 0.9 // 留10%边距

    this.state.scale = scale
    this.state.offsetX = (canvasWidth - imageWidth * scale) / 2
    this.state.offsetY = (canvasHeight - imageHeight * scale) / 2
  }

  /**
   * 重置视图
   */
  resetView(): void {
    this.state.scale = 1
    this.state.offsetX = 0
    this.state.offsetY = 0
  }

  // ==================== 平移功能 ====================

  /**
   * 平移
   */
  pan(dx: number, dy: number): void {
    this.state.offsetX += dx
    this.state.offsetY += dy
  }

  /**
   * 平移到指定位置
   */
  panTo(x: number, y: number): void {
    this.state.offsetX = x
    this.state.offsetY = y
  }

  // ==================== 坐标转换 ====================

  /**
   * 屏幕坐标转画布坐标
   */
  screenToCanvas(point: Point): Point {
    return {
      x: (point.x - this.state.offsetX) / this.state.scale,
      y: (point.y - this.state.offsetY) / this.state.scale,
    }
  }

  /**
   * 画布坐标转屏幕坐标
   */
  canvasToScreen(point: Point): Point {
    return {
      x: point.x * this.state.scale + this.state.offsetX,
      y: point.y * this.state.scale + this.state.offsetY,
    }
  }

  // ==================== 磁吸对齐 ====================

  /**
   * 吸附到网格
   */
  snapToGrid(point: Point, gridSize: number = 10): Point {
    if (!this.state.snapEnabled) return point

    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    }
  }

  /**
   * 吸附到其他对象
   */
  snapToObjects(point: Point, objects: Point[]): Point {
    if (!this.state.snapEnabled) return point

    let snapped = { ...point }
    let minDist = this.snapDistance / this.state.scale

    for (const obj of objects) {
      const dx = Math.abs(point.x - obj.x)
      const dy = Math.abs(point.y - obj.y)

      if (dx < minDist) {
        snapped.x = obj.x
        minDist = dx
      }

      if (dy < minDist) {
        snapped.y = obj.y
      }
    }

    return snapped
  }

  // ==================== 碰撞检测 ====================

  /**
   * 点是否在矩形内
   */
  pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  }

  /**
   * 点是否在多边形内
   */
  pointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }
    return inside
  }

  /**
   * 计算两点距离
   */
  distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // ==================== 工具方法 ====================

  /**
   * 获取鼠标位置（画布坐标）
   */
  getMousePosition(e: MouseEvent): Point {
    if (!this.canvas) return { x: 0, y: 0 }

    const rect = this.canvas.getBoundingClientRect()
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    return this.screenToCanvas(screenPoint)
  }

  /**
   * 限制范围
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
