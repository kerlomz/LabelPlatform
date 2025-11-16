from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """用户模型"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(20), default='annotator')  # admin, annotator, reviewer
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 统计字段
    total_annotations = db.Column(db.Integer, default=0)
    total_time_spent = db.Column(db.Integer, default=0)  # 秒

    # 关系
    created_projects = db.relationship('Project', backref='creator', lazy=True, foreign_keys='Project.creator_id')
    claimed_chunks = db.relationship('TaskChunkClaim', backref='user', lazy=True)
    annotations = db.relationship('Annotation', backref='annotator', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'total_annotations': self.total_annotations,
            'total_time_spent': self.total_time_spent,
            'created_at': self.created_at.isoformat()
        }


class Project(db.Model):
    """项目模型 - 发布者创建的标注项目"""
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    annotation_type = db.Column(db.String(50), nullable=False)

    # 任务说明
    task_instruction = db.Column(db.Text)  # 标注注意事项和说明
    example_images = db.Column(db.Text)  # JSON存储示例图片URL

    # 标签配置
    labels = db.Column(db.Text)  # JSON格式

    # 创建者信息
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 状态
    status = db.Column(db.String(20), default='draft')  # draft, published, completed, archived

    # 关系
    datasets = db.relationship('Dataset', backref='project', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_stats=False):
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'annotation_type': self.annotation_type,
            'task_instruction': self.task_instruction,
            'labels': json.loads(self.labels) if self.labels else [],
            'creator': self.creator.to_dict() if self.creator else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_stats:
            result['stats'] = self.get_stats()

        return result

    def get_stats(self):
        """获取项目统计信息"""
        total_tasks = sum(d.total_images for d in self.datasets)
        total_chunks = sum(len(d.chunks) for d in self.datasets)
        claimed_chunks = sum(1 for d in self.datasets for c in d.chunks if len(c.claims) > 0)
        completed_tasks = Task.query.join(Dataset).filter(
            Dataset.project_id == self.id,
            Task.status == 'completed'
        ).count()

        return {
            'total_datasets': len(self.datasets),
            'total_tasks': total_tasks,
            'total_chunks': total_chunks,
            'claimed_chunks': claimed_chunks,
            'completed_tasks': completed_tasks,
            'progress': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }


class Dataset(db.Model):
    """数据集模型"""
    __tablename__ = 'datasets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)

    file_path = db.Column(db.String(500))
    extracted_path = db.Column(db.String(500))

    status = db.Column(db.String(20), default='uploading')
    total_images = db.Column(db.Integer, default=0)

    # 分片配置
    chunk_size = db.Column(db.Integer, default=100)  # 每个分片的任务数
    max_claims_per_user = db.Column(db.Integer, default=1)  # 每个用户最多领取几个分片
    single_claim_only = db.Column(db.Boolean, default=False)  # 每个分片是否只能被领取一次

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    tasks = db.relationship('Task', backref='dataset', lazy=True, cascade='all, delete-orphan')
    chunks = db.relationship('TaskChunk', backref='dataset', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_chunks=False):
        result = {
            'id': self.id,
            'name': self.name,
            'project_id': self.project_id,
            'status': self.status,
            'total_images': self.total_images,
            'chunk_size': self.chunk_size,
            'max_claims_per_user': self.max_claims_per_user,
            'single_claim_only': self.single_claim_only,
            'created_at': self.created_at.isoformat(),
            'total_chunks': len(self.chunks),
            'available_chunks': sum(1 for c in self.chunks if c.is_available()),
        }

        if include_chunks:
            result['chunks'] = [c.to_dict() for c in self.chunks]

        return result


class TaskChunk(db.Model):
    """任务分片模型 - 将数据集分成多个分片供用户领取"""
    __tablename__ = 'task_chunks'

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)

    chunk_index = db.Column(db.Integer, nullable=False)  # 分片序号
    name = db.Column(db.String(100))  # 分片名称

    start_index = db.Column(db.Integer, nullable=False)
    end_index = db.Column(db.Integer, nullable=False)
    task_count = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    claims = db.relationship('TaskChunkClaim', backref='chunk', lazy=True, cascade='all, delete-orphan')

    def is_available(self):
        """检查分片是否可领取"""
        if self.dataset.single_claim_only:
            return len(self.claims) == 0
        return True

    def get_progress(self):
        """获取分片进度"""
        tasks = Task.query.filter(
            Task.dataset_id == self.dataset_id,
            Task.chunk_index == self.chunk_index
        ).all()

        if not tasks:
            return 0

        completed = sum(1 for t in tasks if t.status == 'completed')
        return (completed / len(tasks) * 100) if tasks else 0

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'chunk_index': self.chunk_index,
            'name': self.name,
            'task_count': self.task_count,
            'is_available': self.is_available(),
            'claim_count': len(self.claims),
            'progress': self.get_progress(),
            'created_at': self.created_at.isoformat()
        }


class TaskChunkClaim(db.Model):
    """任务分片领取记录"""
    __tablename__ = 'task_chunk_claims'

    id = db.Column(db.Integer, primary_key=True)
    chunk_id = db.Column(db.Integer, db.ForeignKey('task_chunks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    claimed_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    status = db.Column(db.String(20), default='claimed')  # claimed, in_progress, completed

    # 统计
    completed_tasks = db.Column(db.Integer, default=0)
    total_time_spent = db.Column(db.Integer, default=0)  # 秒

    def to_dict(self):
        return {
            'id': self.id,
            'chunk': self.chunk.to_dict(),
            'user': self.user.to_dict(),
            'status': self.status,
            'claimed_at': self.claimed_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'completed_tasks': self.completed_tasks,
            'total_time_spent': self.total_time_spent,
            'progress': (self.completed_tasks / self.chunk.task_count * 100) if self.chunk.task_count > 0 else 0
        }


class Task(db.Model):
    """标注任务模型"""
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)
    chunk_index = db.Column(db.Integer)  # 所属分片

    image_path = db.Column(db.String(500), nullable=False)
    image_name = db.Column(db.String(200), nullable=False)

    # 任务索引
    task_index = db.Column(db.Integer, nullable=False)

    # 状态
    status = db.Column(db.String(20), default='pending')

    # 时间记录
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    # 关系
    annotations = db.relationship('Annotation', backref='task', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'chunk_index': self.chunk_index,
            'image_path': self.image_path,
            'image_name': self.image_name,
            'task_index': self.task_index,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'has_annotation': len(self.annotations) > 0
        }


class Annotation(db.Model):
    """标注数据模型"""
    __tablename__ = 'annotations'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # 标注者

    annotation_type = db.Column(db.String(50), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON

    # 质量相关
    confidence = db.Column(db.Float, default=1.0)
    time_spent = db.Column(db.Integer, default=0)  # 秒

    # 版本控制
    version = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'annotation_type': self.annotation_type,
            'data': json.loads(self.data) if self.data else {},
            'confidence': self.confidence,
            'time_spent': self.time_spent,
            'version': self.version,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
