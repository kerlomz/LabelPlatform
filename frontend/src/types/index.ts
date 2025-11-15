// 标注类型枚举
export enum AnnotationType {
  TEXT = 'text',                    // 字符型验证码
  BOUNDING_BOX = 'bounding_box',    // 点选验证码拉框
  SEGMENTATION = 'segmentation',    // 分割模式(描边)
  TRAJECTORY = 'trajectory',        // 拖动轨迹
  ROTATION = 'rotation',            // 旋转验证码
  GRID = 'grid'                     // 九宫格/六宫格
}

// 边界框
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  label?: string
}

// 点坐标
export interface Point {
  x: number
  y: number
}

// 多边形(用于分割)
export interface Polygon {
  points: Point[]
  label?: string
}

// 轨迹
export interface Trajectory {
  points: Point[]
  timestamps?: number[]
}

// 旋转信息
export interface RotationInfo {
  angle: number  // 旋转角度
}

// 宫格信息
export interface GridInfo {
  gridType: 'grid-9' | 'grid-6'  // 九宫格或六宫格
  selectedCells: number[]         // 选中的格子索引
}

// 标注数据
export interface Annotation {
  id?: number
  type: AnnotationType
  imageUrl: string
  imageName: string
  timestamp?: string

  // 不同类型的标注数据
  text?: string                   // 字符型
  boundingBoxes?: BoundingBox[]   // 拉框
  polygons?: Polygon[]            // 分割
  trajectory?: Trajectory         // 轨迹
  rotation?: RotationInfo         // 旋转
  grid?: GridInfo                 // 宫格

  // 额外信息
  metadata?: Record<string, any>
}

// 统计信息
export interface Stats {
  total: number
  by_type: Record<string, number>
}
