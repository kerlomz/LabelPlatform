import React from 'react'
import { Card, List, Tag, Button, Select, Space, Empty } from 'antd'
import { DeleteOutlined, EyeOutlined, EyeInvisibleOutlined, LockOutlined } from '@ant-design/icons'

interface CanvasSidebarProps {
  labels: string[]
  selectedLabel: string
  onLabelChange: (label: string) => void
  annotations: any[]
  selectedId: string | null
  onSelectAnnotation: (id: string) => void
  onDeleteAnnotation: (id: string) => void
}

export const CanvasSidebar: React.FC<CanvasSidebarProps> = ({
  labels,
  selectedLabel,
  onLabelChange,
  annotations,
  selectedId,
  onSelectAnnotation,
  onDeleteAnnotation,
}) => {
  return (
    <div className="canvas-sidebar">
      <Card title="标签" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={selectedLabel}
            onChange={onLabelChange}
            style={{ width: '100%' }}
            placeholder="选择标签"
          >
            {labels.map((label, index) => (
              <Select.Option key={label} value={label}>
                <Space>
                  <Tag color="blue">{index + 1}</Tag>
                  {label}
                </Space>
              </Select.Option>
            ))}
          </Select>

          <div style={{ fontSize: 12, color: '#999' }}>
            快捷键: 按数字键 1-{labels.length} 快速切换
          </div>
        </Space>
      </Card>

      <Card
        title={`标注列表 (${annotations.length})`}
        size="small"
        bodyStyle={{ padding: 0 }}
      >
        {annotations.length === 0 ? (
          <Empty description="暂无标注" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={annotations}
            renderItem={(item: any) => (
              <List.Item
                className={selectedId === item.id ? 'annotation-item-selected' : ''}
                onClick={() => onSelectAnnotation(item.id)}
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  background: selectedId === item.id ? '#e6f7ff' : 'transparent',
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Tag color={item.type === 'bbox' ? 'blue' : 'green'}>
                      {item.type}
                    </Tag>
                    <span>{item.label || '未标记'}</span>
                  </Space>

                  <Space>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteAnnotation(item.id)
                      }}
                    />
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}
