import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Upload,
  Tag,
  Progress,
  InputNumber,
  Switch,
  Descriptions,
  Statistic,
  Row,
  Col,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  ScissorOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Project, Dataset, AnnotationType, TaskChunk } from '../types'

const annotationTypeOptions = [
  { label: '文本标注', value: 'text' },
  { label: '边界框标注', value: 'bbox' },
  { label: '多边形标注', value: 'polygon' },
  { label: '轨迹标注', value: 'trajectory' },
  { label: '旋转标注', value: 'rotation' },
  { label: '宫格标注', value: 'grid' },
]

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [chunkModalVisible, setChunkModalVisible] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [form] = Form.useForm()
  const [chunkForm] = Form.useForm()
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadDatasets(selectedProject.id)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const response = await api.projects.list()
      setProjects(response.data)
    } catch (error) {
      message.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const loadDatasets = async (projectId: number) => {
    try {
      const response = await api.datasets.list(projectId)
      setDatasets(response.data)
    } catch (error) {
      message.error('加载数据集失败')
    }
  }

  const handleCreateProject = async (values: any) => {
    try {
      await api.projects.create({
        name: values.name,
        description: values.description,
        annotation_type: values.annotation_type,
        task_instruction: values.task_instruction,
        labels: values.labels ? values.labels.split(',').map((l: string) => l.trim()) : [],
      })
      message.success('项目创建成功')
      setCreateModalVisible(false)
      form.resetFields()
      loadProjects()
    } catch (error) {
      message.error('创建项目失败')
    }
  }

  const handleCreateChunks = async (values: any) => {
    if (!selectedDataset) return

    try {
      await api.datasets.createChunks(selectedDataset.id, {
        chunk_size: values.chunk_size,
        max_claims_per_user: values.max_claims_per_user,
        single_claim_only: values.single_claim_only,
      })
      message.success('分片创建成功')
      setChunkModalVisible(false)
      chunkForm.resetFields()
      if (selectedProject) {
        loadDatasets(selectedProject.id)
      }
    } catch (error: any) {
      message.error('创建分片失败: ' + (error.response?.data?.error || error.message))
    }
  }

  const handlePublishProject = async (project: Project) => {
    try {
      await api.projects.publish(project.id)
      message.success('项目已发布')
      loadProjects()
    } catch (error: any) {
      message.error('发布失败: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleUploadDataset = async (info: any) => {
    if (!selectedProject) return

    const { file } = info
    if (file.status === 'done' || !file.status) {
      try {
        await api.datasets.upload(selectedProject.id, file.originFileObj || file)
        message.success('数据集上传成功')
        setUploadModalVisible(false)
        loadDatasets(selectedProject.id)
      } catch (error) {
        message.error('上传失败')
      }
    }
  }

  const handleDeleteProject = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将同时删除所有数据集和标注，此操作不可恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.projects.delete(id)
          message.success('删除成功')
          if (selectedProject?.id === id) {
            setSelectedProject(null)
          }
          loadProjects()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: any = {
          draft: { color: 'default', text: '草稿' },
          published: { color: 'success', text: '已发布' },
          completed: { color: 'processing', text: '已完成' },
          archived: { color: 'default', text: '已归档' },
        }
        const { color, text } = statusMap[status] || {}
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '标注类型',
      dataIndex: 'annotation_type',
      key: 'annotation_type',
      render: (type: AnnotationType) => {
        const option = annotationTypeOptions.find((o) => o.value === type)
        return <Tag color="blue">{option?.label || type}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: Project) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.stats?.completed_tasks || 0} / {record.stats?.total_tasks || 0}
          </div>
          <Progress
            percent={record.stats?.progress || 0}
            size="small"
            showInfo={false}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Project) => (
        <Space>
          <Button
            type="link"
            icon={<FolderOpenOutlined />}
            onClick={() => setSelectedProject(record)}
          >
            管理
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              icon={<SendOutlined />}
              onClick={() => handlePublishProject(record)}
            >
              发布
            </Button>
          )}
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteProject(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const datasetColumns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: any = {
          uploading: { color: 'processing', text: '上传中' },
          processing: { color: 'processing', text: '处理中' },
          ready: { color: 'success', text: '就绪' },
          error: { color: 'error', text: '错误' },
        }
        const { color, text } = statusMap[status] || {}
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '图片数量',
      dataIndex: 'total_images',
      key: 'total_images',
    },
    {
      title: '分片信息',
      key: 'chunks',
      render: (_: any, record: Dataset) => (
        <Space direction="vertical" size="small">
          <div>
            分片数: {record.total_chunks || 0}
            {record.total_chunks > 0 && (
              <Tag color="green" style={{ marginLeft: 8 }}>
                可用: {record.available_chunks}
              </Tag>
            )}
          </div>
          {record.chunk_size > 0 && (
            <div style={{ fontSize: 12, color: '#666' }}>
              每片 {record.chunk_size} 任务 |
              每人最多 {record.max_claims_per_user} 片
              {record.single_claim_only && ' | 独占模式'}
            </div>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Dataset) => (
        <Space direction="vertical" size="small">
          <Button
            icon={<ScissorOutlined />}
            onClick={() => {
              setSelectedDataset(record)
              setChunkModalVisible(true)
              chunkForm.setFieldsValue({
                chunk_size: record.chunk_size || 100,
                max_claims_per_user: record.max_claims_per_user || 1,
                single_claim_only: record.single_claim_only || false,
              })
            }}
            disabled={record.status !== 'ready'}
          >
            {record.total_chunks > 0 ? '重新分片' : '创建分片'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<span style={{ fontSize: 20, fontWeight: 'bold' }}>项目管理</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            创建项目
          </Button>
        }
      >
        <Table
          columns={projectColumns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {selectedProject && (
        <Card
          title={
            <Space>
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                {selectedProject.name} - 数据集
              </span>
              <Tag color="blue">{selectedProject.annotation_type}</Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传数据集
            </Button>
          }
          style={{ marginTop: 24 }}
        >
          <Table columns={datasetColumns} dataSource={datasets} rowKey="id" />
        </Card>
      )}

      {/* 创建项目模态框 */}
      <Modal
        title="创建项目"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProject}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如: 滑动验证码标注" />
          </Form.Item>

          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={3} placeholder="项目的详细描述..." />
          </Form.Item>

          <Form.Item
            name="annotation_type"
            label="标注类型"
            rules={[{ required: true, message: '请选择标注类型' }]}
          >
            <Select options={annotationTypeOptions} placeholder="选择标注类型" />
          </Form.Item>

          <Form.Item
            name="labels"
            label="标签列表"
            extra="用逗号分隔，例如: 验证码,滑块,拼图"
          >
            <Input placeholder="标签1, 标签2, 标签3" />
          </Form.Item>

          <Form.Item
            name="task_instruction"
            label="标注说明"
            extra="向标注者说明标注注意事项和要求"
          >
            <Input.TextArea
              rows={4}
              placeholder="例如: 请在验证码图片中框选出所有数字和字母，确保边框紧贴文字..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建分片模态框 */}
      <Modal
        title="创建任务分片"
        open={chunkModalVisible}
        onCancel={() => {
          setChunkModalVisible(false)
          chunkForm.resetFields()
        }}
        onOk={() => chunkForm.submit()}
        width={600}
      >
        <Form form={chunkForm} layout="vertical" onFinish={handleCreateChunks}>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="数据集">{selectedDataset?.name}</Descriptions.Item>
            <Descriptions.Item label="总任务数">{selectedDataset?.total_images}</Descriptions.Item>
          </Descriptions>

          <Form.Item
            name="chunk_size"
            label="每个分片的任务数"
            rules={[{ required: true, message: '请输入分片大小' }]}
            extra="将数据集自动分割成多个分片，每个分片包含指定数量的任务"
          >
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="max_claims_per_user"
            label="每人最多领取分片数"
            rules={[{ required: true, message: '请输入最大领取数' }]}
            extra="限制单个用户在该数据集中最多可以领取多少个分片"
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="single_claim_only"
            label="独占模式"
            valuePropName="checked"
            extra="开启后，每个分片只能被一个用户领取（提高标注效率）"
          >
            <Switch />
          </Form.Item>

          {selectedDataset && chunkForm.getFieldValue('chunk_size') && (
            <Alert
              message="预览"
              description={
                <div>
                  将创建约{' '}
                  <strong>
                    {Math.ceil(selectedDataset.total_images / chunkForm.getFieldValue('chunk_size'))}
                  </strong>{' '}
                  个分片
                </div>
              }
              type="info"
            />
          )}
        </Form>
      </Modal>

      {/* 上传数据集模态框 */}
      <Modal
        title="上传数据集"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
      >
        <Upload.Dragger
          name="file"
          accept=".zip,.tar,.tar.gz,.tgz"
          beforeUpload={() => false}
          onChange={handleUploadDataset}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48 }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .zip, .tar, .tar.gz 格式的压缩包
            <br />
            压缩包会自动解压，图片文件将被分配为标注任务
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  )
}
