import axios from 'axios'
import type { User, Project, Dataset, Task, Annotation, Stats, AnnotationData, AnnotationType } from '../types'

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
      labels?: string[]
    }) => apiClient.post<{ success: boolean; project: Project }>('/projects', data),

    get: (id: number) => apiClient.get<Project>(`/projects/${id}`),

    update: (id: number, data: Partial<Project>) =>
      apiClient.put<{ success: boolean; project: Project }>(`/projects/${id}`, data),

    delete: (id: number) => apiClient.delete(`/projects/${id}`),
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

    getImage: (id: number) => `/api/tasks/${id}/image`,
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
