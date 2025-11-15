// ==================== 用户相关 ====================

export interface User {
  id: number
  username: string
  role: 'admin' | 'annotator' | 'reviewer'
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ==================== 项目相关 ====================

export enum AnnotationType {
  TEXT = 'text',
  BBOX = 'bbox',
  POLYGON = 'polygon',
  TRAJECTORY = 'trajectory',
  ROTATION = 'rotation',
  GRID = 'grid'
}

export interface Project {
  id: number
  name: string
  description: string
  annotation_type: AnnotationType
  labels: string[]
  owner: User
  created_at: string
  updated_at: string
  dataset_count: number
}

// ==================== 数据集相关 ====================

export interface Dataset {
  id: number
  name: string
  project_id: number
  status: 'uploading' | 'processing' | 'ready' | 'error'
  total_images: number
  completed_tasks: number
  progress: number
  created_at: string
}

// ==================== 任务相关 ====================

export interface Task {
  id: number
  dataset_id: number
  image_path: string
  image_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed'
  annotator: User | null
  assigned_at: string | null
  completed_at: string | null
  has_annotation: boolean
}

// ==================== 标注相关 ====================

export interface Point {
  x: number
  y: number
}

export interface BBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  confidence?: number
}

export interface Polygon {
  id: string
  points: Point[]
  label?: string
  confidence?: number
}

export interface Trajectory {
  points: Point[]
  timestamps: number[]
}

export interface RotationData {
  angle: number
}

export interface GridData {
  gridType: 'grid-9' | 'grid-6'
  selectedCells: number[]
}

export interface AnnotationData {
  // 文本标注
  text?: string

  // 边界框标注
  bboxes?: BBox[]

  // 多边形标注
  polygons?: Polygon[]

  // 轨迹标注
  trajectory?: Trajectory

  // 旋转标注
  rotation?: RotationData

  // 宫格标注
  grid?: GridData
}

export interface Annotation {
  id: number
  task_id: number
  annotation_type: AnnotationType
  data: AnnotationData
  created_at: string
  updated_at: string
  version: number
}

// ==================== 统计相关 ====================

export interface Stats {
  total_projects?: number
  total_datasets?: number
  total_tasks?: number
  completed_tasks?: number
  total_users?: number
  assigned_tasks?: number
  in_progress_tasks?: number
}
