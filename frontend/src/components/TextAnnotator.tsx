import React, { useState, useEffect } from 'react'
import { Input, Button, Space, Card, Typography } from 'antd'
import { SaveOutlined, ClearOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType } from '../types'

const { Title, Text } = Typography

interface TextAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (text: string) => void
}

export const TextAnnotator: React.FC<TextAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [text, setText] = useState('')
  const { updateCurrentAnnotation } = useAnnotationStore()

  useEffect(() => {
    // 初始化标注数据
    updateCurrentAnnotation({
      type: AnnotationType.TEXT,
      imageUrl,
      imageName,
      text: ''
    })
  }, [imageUrl, imageName])

  const handleSave = () => {
    updateCurrentAnnotation({ text })
    if (onSave) {
      onSave(text)
    }
  }

  const handleClear = () => {
    setText('')
    updateCurrentAnnotation({ text: '' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <img
              src={imageUrl}
              alt="待标注图片"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain'
              }}
            />
          </div>

          <div>
            <Title level={5}>请输入验证码内容</Title>
            <Text type="secondary">
              提示: 按 Enter 键快速保存
            </Text>
            <Input
              size="large"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入图片中的文字内容"
              autoFocus
              style={{ marginTop: '10px' }}
            />
          </div>

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!text.trim()}
            >
              保存标注
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
            >
              清空
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
