import React, { useCallback } from 'react'
import { Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import { useAnnotationStore } from '../stores/annotationStore'

const { Dragger } = Upload

interface ImageUploaderProps {
  onImageLoaded?: (url: string, filename: string) => void
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoaded }) => {
  const { setCurrentImage, reset } = useAnnotationStore()

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const response = await api.uploadImage(file)
        const { url, filename } = response.data

        // 设置当前图片
        setCurrentImage(url)

        // 回调
        if (onImageLoaded) {
          onImageLoaded(url, filename)
        }

        message.success('图片上传成功')
        return false // 阻止默认上传行为
      } catch (error) {
        message.error('图片上传失败')
        console.error(error)
        return false
      }
    },
    [setCurrentImage, onImageLoaded]
  )

  return (
    <Dragger
      name="file"
      multiple={false}
      accept="image/*"
      beforeUpload={handleUpload}
      showUploadList={false}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
      <p className="ant-upload-hint">
        支持常见图片格式: JPG, PNG, GIF, BMP 等
      </p>
    </Dragger>
  )
}
