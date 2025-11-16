import React from 'react'
import { Tag, Space } from 'antd'
import { CheckCircleOutlined, ToolOutlined } from '@ant-design/icons'

interface CanvasStatusBarProps {
  scale: number
  objectCount: number
  canUndo: boolean
  canRedo: boolean
  currentTool: string
}

const toolNames: Record<string, string> = {
  select: '选择工具',
  bbox: '矩形框',
  polygon: '多边形',
  pan: '平移',
}

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = ({
  scale,
  objectCount,
  canUndo,
  canRedo,
  currentTool,
}) => {
  return (
    <div className="canvas-status-bar">
      <Space split="|" size="middle">
        <span>
          <ToolOutlined /> {toolNames[currentTool] || currentTool}
        </span>

        <span>
          <CheckCircleOutlined /> 标注数量: {objectCount}
        </span>

        <span>缩放: {Math.round(scale * 100)}%</span>

        <Space size="small">
          <Tag color={canUndo ? 'blue' : 'default'}>
            Ctrl+Z 撤销
          </Tag>
          <Tag color={canRedo ? 'blue' : 'default'}>
            Ctrl+Y 重做
          </Tag>
        </Space>

        <Space size="small">
          <Tag>V: 选择</Tag>
          <Tag>B: 矩形</Tag>
          <Tag>P: 多边形</Tag>
          <Tag>空格: 平移</Tag>
          <Tag>Delete: 删除</Tag>
          <Tag>+/-: 缩放</Tag>
          <Tag>0: 适应</Tag>
        </Space>
      </Space>
    </div>
  )
}
