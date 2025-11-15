from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='annotator')  # admin, annotator, reviewer
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    projects = db.relationship('Project', backref='owner', lazy=True)
    tasks = db.relationship('Task', backref='annotator', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    annotation_type = db.Column(db.String(50), nullable=False)  # text, bbox, polygon, trajectory, rotation, grid
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 标签配置
    labels = db.Column(db.Text)  # JSON格式存储标签列表

    # 关系
    datasets = db.relationship('Dataset', backref='project', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'annotation_type': self.annotation_type,
            'labels': json.loads(self.labels) if self.labels else [],
            'owner': self.owner.to_dict() if self.owner else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'dataset_count': len(self.datasets)
        }


class Dataset(db.Model):
    __tablename__ = 'datasets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    file_path = db.Column(db.String(500))  # 原始压缩包路径
    extracted_path = db.Column(db.String(500))  # 解压后的路径
    status = db.Column(db.String(20), default='uploading')  # uploading, processing, ready, error
    total_images = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    tasks = db.relationship('Task', backref='dataset', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        completed_tasks = sum(1 for task in self.tasks if task.status == 'completed')
        return {
            'id': self.id,
            'name': self.name,
            'project_id': self.project_id,
            'status': self.status,
            'total_images': self.total_images,
            'completed_tasks': completed_tasks,
            'progress': (completed_tasks / self.total_images * 100) if self.total_images > 0 else 0,
            'created_at': self.created_at.isoformat()
        }


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    image_name = db.Column(db.String(200), nullable=False)
    annotator_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, reviewed
    assigned_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    # 关系
    annotations = db.relationship('Annotation', backref='task', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'image_path': self.image_path,
            'image_name': self.image_name,
            'status': self.status,
            'annotator': self.annotator.to_dict() if self.annotator else None,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'has_annotation': len(self.annotations) > 0
        }


class Annotation(db.Model):
    __tablename__ = 'annotations'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    annotation_type = db.Column(db.String(50), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON格式存储标注数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = db.Column(db.Integer, default=1)  # 版本号，用于撤销/重做

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'annotation_type': self.annotation_type,
            'data': json.loads(self.data) if self.data else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'version': self.version
        }
