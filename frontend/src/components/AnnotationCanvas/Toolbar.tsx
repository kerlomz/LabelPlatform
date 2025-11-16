import React from 'react'
import { Button, Space, Tooltip, Divider, InputNumber } from 'antd'
import {
  SelectOutlined,
  BorderOutlined,
  DeploymentUnitOutlined,
  DragOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  SaveOutlined,
  CloseOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons'

interface CanvasToolbarProps {
  currentTool: string
  onToolChange: (tool: string) => void
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onSave: () => void
  onCancel?: () => void
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  currentTool,
  onToolChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onSave,
  onCancel,
}) => {
  return (
    <div className="canvas-toolbar">
      <div className="toolbar-section">
        <Space>
          <Tooltip title="选择工具 (V)">
            <Button
              type={currentTool === 'select' ? 'primary' : 'default'}
              icon={<SelectOutlined />}
              onClick={() => onToolChange('select')}
            />
          </Tooltip>

          <Tooltip title="矩形框 (B)">
            <Button
              type={currentTool === 'bbox' ? 'primary' : 'default'}
              icon={<BorderOutlined />}
              onClick={() => onToolChange('bbox')}
            />
          </Tooltip>

          <Tooltip title="多边形 (P)">
            <Button
              type={currentTool === 'polygon' ? 'primary' : 'default'}
              icon={<DeploymentUnitOutlined />}
              onClick={() => onToolChange('polygon')}
            />
          </Tooltip>

          <Tooltip title="平移 (空格)">
            <Button
              type={currentTool === 'pan' ? 'primary' : 'default'}
              icon={<DragOutlined />}
              onClick={() => onToolChange('pan')}
            />
          </Tooltip>
        </Space>
      </div>

      <Divider type="vertical" />

      <div className="toolbar-section">
        <Space>
          <Tooltip title="放大 (+)">
            <Button icon={<ZoomInOutlined />} onClick={onZoomIn} />
          </Tooltip>

          <span style={{ minWidth: 80, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>

          <Tooltip title="缩小 (-)">
            <Button icon={<ZoomOutOutlined />} onClick={onZoomOut} />
          </Tooltip>

          <Tooltip title="适应窗口 (0)">
            <Button icon={<FullscreenOutlined />} onClick={onZoomFit} />
          </Tooltip>
        </Space>
      </div>

      <div className="toolbar-section" style={{ marginLeft: 'auto' }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave}>
            保存 (Ctrl+S)
          </Button>
          {onCancel && (
            <Button icon={<CloseOutlined />} onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
