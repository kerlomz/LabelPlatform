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
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Project, Dataset, AnnotationType } from '../types'

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
  const [form] = Form.useForm()
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
      title: '标注类型',
      dataIndex: 'annotation_type',
      key: 'annotation_type',
      render: (type: AnnotationType) => {
        const option = annotationTypeOptions.find((o) => o.value === type)
        return <Tag color="blue">{option?.label || type}</Tag>
      },
    },
    {
      title: '标签',
      dataIndex: 'labels',
      key: 'labels',
      render: (labels: string[]) => (
        <Space size={[0, 4]} wrap>
          {labels.slice(0, 3).map((label) => (
            <Tag key={label}>{label}</Tag>
          ))}
          {labels.length > 3 && <Tag>+{labels.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '数据集数量',
      dataIndex: 'dataset_count',
      key: 'dataset_count',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
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
            查看
          </Button>
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
      title: '完成进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => <Progress percent={Math.round(progress)} size="small" />,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Dataset) => (
        <Button
          type="primary"
          onClick={() => navigate(`/annotate?dataset=${record.id}`)}
          disabled={record.status !== 'ready'}
        >
          开始标注
        </Button>
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
