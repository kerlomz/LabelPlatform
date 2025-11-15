import React, { useState, useEffect } from 'react'
import { Button, Space, Card, Typography, Radio, Tag } from 'antd'
import { SaveOutlined, ClearOutlined } from '@ant-design/icons'
import { useAnnotationStore } from '../stores/annotationStore'
import { AnnotationType } from '../types'
import './GridAnnotator.css'

const { Title, Text } = Typography

interface GridAnnotatorProps {
  imageUrl: string
  imageName: string
  onSave?: (gridType: 'grid-9' | 'grid-6', selectedCells: number[]) => void
}

export const GridAnnotator: React.FC<GridAnnotatorProps> = ({
  imageUrl,
  imageName,
  onSave
}) => {
  const [gridType, setGridType] = useState<'grid-9' | 'grid-6'>('grid-9')
  const [selectedCells, setSelectedCells] = useState<number[]>([])
  const { updateCurrentAnnotation } = useAnnotationStore()

  useEffect(() => {
    updateCurrentAnnotation({
      type: AnnotationType.GRID,
      imageUrl,
      imageName,
      grid: {
        gridType,
        selectedCells
      }
    })
  }, [gridType, selectedCells, imageUrl, imageName])

  const handleCellClick = (index: number) => {
    if (selectedCells.includes(index)) {
      setSelectedCells(selectedCells.filter((i) => i !== index))
    } else {
      setSelectedCells([...selectedCells, index])
    }
  }

  const handleClear = () => {
    setSelectedCells([])
  }

  const handleGridTypeChange = (value: 'grid-9' | 'grid-6') => {
    setGridType(value)
    setSelectedCells([])
  }

  const handleSave = () => {
    if (onSave) {
      onSave(gridType, selectedCells)
    }
  }

  const getCellCount = () => (gridType === 'grid-9' ? 9 : 6)
  const getGridLayout = () => (gridType === 'grid-9' ? '3x3' : '2x3')

  const renderGrid = () => {
    const cellCount = getCellCount()
    const cols = gridType === 'grid-9' ? 3 : 2
    const rows = 3

    return (
      <div
        className={`grid-container ${gridType}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: '4px',
          width: '600px',
          height: '600px',
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '2px solid #d9d9d9',
          padding: '4px'
        }}
      >
        {Array.from({ length: cellCount }).map((_, index) => (
          <div
            key={index}
            onClick={() => handleCellClick(index)}
            className={`grid-cell ${
              selectedCells.includes(index) ? 'selected' : ''
            }`}
            style={{
              border: '2px solid rgba(255, 255, 255, 0.8)',
              backgroundColor: selectedCells.includes(index)
                ? 'rgba(24, 144, 255, 0.5)'
                : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: selectedCells.includes(index) ? '#fff' : 'rgba(0,0,0,0.3)',
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
          >
            {selectedCells.includes(index) && '✓'}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>九宫格/六宫格标注</Title>
            <Text type="secondary">
              点击选择符合要求的格子
            </Text>
          </div>

          <Space size="large">
            <div>
              <Text strong>宫格类型:</Text>
              <Radio.Group
                value={gridType}
                onChange={(e) => handleGridTypeChange(e.target.value)}
                style={{ marginLeft: 10 }}
              >
                <Radio.Button value="grid-9">九宫格 (3x3)</Radio.Button>
                <Radio.Button value="grid-6">六宫格 (2x3)</Radio.Button>
              </Radio.Group>
            </div>

            <Tag color="blue">
              已选择: {selectedCells.length} / {getCellCount()} 个格子
            </Tag>
          </Space>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderGrid()}
          </div>

          {selectedCells.length > 0 && (
            <div>
              <Text>选中的格子编号: </Text>
              {selectedCells
                .sort((a, b) => a - b)
                .map((cell) => (
                  <Tag key={cell} color="blue">
                    {cell + 1}
                  </Tag>
                ))}
            </div>
          )}

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={selectedCells.length === 0}
            >
              保存标注
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={selectedCells.length === 0}
            >
              清空选择
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
