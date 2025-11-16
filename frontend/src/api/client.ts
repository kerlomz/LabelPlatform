import axios from 'axios'
import type {
  User, Project, Dataset, Task, Annotation, Stats,
  AnnotationData, AnnotationType, TaskChunk, TaskChunkClaim
} from '../types'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// 请求拦截器 - 添加token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const api = {
  // ==================== 认证 ====================
  auth: {
    login: (username: string, password: string) =>
      apiClient.post<{ success: boolean; token: string; user: User }>('/auth/login', {
        username,
        password,
      }),

    register: (username: string, password: string) =>
      apiClient.post<{ success: boolean; user: User }>('/auth/register', {
        username,
        password,
      }),

    getCurrentUser: () => apiClient.get<User>('/auth/me'),
  },

  // ==================== 项目 ====================
  projects: {
    list: () => apiClient.get<Project[]>('/projects'),

    create: (data: {
      name: string
      description?: string
      annotation_type: AnnotationType
      task_instruction?: string
      labels?: string[]
    }) => apiClient.post<{ success: boolean; project: Project }>('/projects', data),

    get: (id: number) => apiClient.get<Project>(`/projects/${id}`),

    update: (id: number, data: Partial<Project>) =>
      apiClient.put<{ success: boolean; project: Project }>(`/projects/${id}`, data),

    delete: (id: number) => apiClient.delete(`/projects/${id}`),

    publish: (id: number) =>
      apiClient.post<{ success: boolean; project: Project }>(`/projects/${id}/publish`),

    getStatistics: (id: number) =>
      apiClient.get(`/tasks/projects/${id}/statistics`),

    getAnnotations: (id: number) =>
      apiClient.get(`/tasks/projects/${id}/annotations`),
  },

  // ==================== 数据集 ====================
  datasets: {
    upload: (projectId: number, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient.post<{ success: boolean; dataset: Dataset }>(
        `/projects/${projectId}/datasets`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
    },

    list: (projectId: number) =>
      apiClient.get<Dataset[]>(`/projects/${projectId}/datasets`),

    get: (id: number) => apiClient.get<Dataset>(`/datasets/${id}`),

    createChunks: (datasetId: number, data: {
      chunk_size?: number
      max_claims_per_user?: number
      single_claim_only?: boolean
    }) => apiClient.post<{ success: boolean; total_chunks: number; chunks: TaskChunk[] }>(
      `/tasks/datasets/${datasetId}/create-chunks`,
      data
    ),

    getChunks: (datasetId: number) =>
      apiClient.get<{ dataset: Dataset; chunks: TaskChunk[] }>(`/tasks/datasets/${datasetId}/chunks`),
  },

  // ==================== 任务 ====================
  tasks: {
    list: (params?: { status?: string; dataset_id?: number }) =>
      apiClient.get<Task[]>('/tasks', { params }),

    getNext: (datasetId?: number) =>
      apiClient.get<Task>('/tasks/next', {
        params: datasetId ? { dataset_id: datasetId } : undefined,
      }),

    get: (id: number) => apiClient.get<Task>(`/tasks/${id}`),

    getImage: (taskId: number) => `/api/projects/tasks/${taskId}/image`,

    // 任务广场
    getMarket: () => apiClient.get<Project[]>('/tasks/task-market'),

    // 领取分片
    claimChunk: (chunkId: number) =>
      apiClient.post<{ success: boolean; claim: TaskChunkClaim }>(`/tasks/chunks/${chunkId}/claim`),

    // 我的领取
    getMyClaims: () => apiClient.get<TaskChunkClaim[]>('/tasks/my-claims'),

    // 获取下一个任务
    getNextInClaim: (claimId: number) =>
      apiClient.get<{
        task: Task
        project: Project
        chunk: TaskChunk
        claim: TaskChunkClaim
        remaining_tasks: number
      }>(`/tasks/claims/${claimId}/next-task`),

    // 提交标注
    submitAnnotation: (taskId: number, data: {
      annotation_type: AnnotationType
      data: AnnotationData
      time_spent?: number
    }) => apiClient.post<{ success: boolean; annotation: Annotation }>(
      `/tasks/tasks/${taskId}/submit-annotation`,
      data
    ),
  },

  // ==================== 标注 ====================
  annotations: {
    create: (taskId: number, data: {
      annotation_type: AnnotationType
      data: AnnotationData
      completed?: boolean
    }) =>
      apiClient.post<{ success: boolean; annotation: Annotation }>(
        `/tasks/${taskId}/annotations`,
        data
      ),

    get: (taskId: number) => apiClient.get<Annotation>(`/tasks/${taskId}/annotations`),
  },

  // ==================== 统计 ====================
  stats: {
    get: () => apiClient.get<Stats>('/stats'),
  },
}

export default apiClient
