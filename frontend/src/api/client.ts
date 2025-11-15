import axios from 'axios'
import { Annotation, Stats } from '../types'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const api = {
  // 健康检查
  healthCheck: () => apiClient.get('/health'),

  // 上传图片
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 上传Base64图片
  uploadBase64: (imageData: string) =>
    apiClient.post('/upload-base64', { image: imageData }),

  // 获取标注列表
  getAnnotations: (params?: {
    page?: number
    per_page?: number
    type?: string
  }) => apiClient.get<{
    annotations: Annotation[]
    total: number
    page: number
    per_page: number
  }>('/annotations', { params }),

  // 创建标注
  createAnnotation: (annotation: Annotation) =>
    apiClient.post<{ success: boolean; annotation: Annotation }>(
      '/annotations',
      annotation
    ),

  // 更新标注
  updateAnnotation: (id: number, annotation: Partial<Annotation>) =>
    apiClient.put<{ success: boolean; annotation: Annotation }>(
      `/annotations/${id}`,
      annotation
    ),

  // 删除标注
  deleteAnnotation: (id: number) =>
    apiClient.delete(`/annotations/${id}`),

  // 获取统计信息
  getStats: () => apiClient.get<Stats>('/stats'),

  // 导出标注
  exportAnnotations: (format: string = 'json') =>
    apiClient.get('/export', { params: { format } })
}

export default apiClient
