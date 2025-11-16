"""
项目管理路由
包含项目的创建、更新、发布等功能
"""

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, User, Project, Dataset, Task, TaskChunk
from datetime import datetime
import os
import zipfile
import tarfile
import json

projects_bp = Blueprint('projects', __name__)

UPLOAD_FOLDER = 'uploads'
DATASETS_FOLDER = 'datasets'

for folder in [UPLOAD_FOLDER, DATASETS_FOLDER]:
    os.makedirs(folder, exist_ok=True)


# ==================== 项目管理 ====================

@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    """获取项目列表（只显示自己创建的）"""
    user_id = get_jwt_identity()

    projects = Project.query.filter_by(creator_id=user_id).order_by(
        Project.created_at.desc()
    ).all()

    return jsonify([p.to_dict(include_stats=True) for p in projects])


@projects_bp.route('', methods=['POST'])
@jwt_required()
def create_project():
    """创建项目"""
    user_id = get_jwt_identity()
    data = request.get_json()

    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        annotation_type=data['annotation_type'],
        task_instruction=data.get('task_instruction', ''),
        labels=json.dumps(data.get('labels', [])),
        creator_id=user_id,
        status='draft'
    )

    db.session.add(project)
    db.session.commit()

    return jsonify({
        'success': True,
        'project': project.to_dict()
    })


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """获取项目详情"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    return jsonify(project.to_dict(include_stats=True))


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """更新项目"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    data = request.get_json()

    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'task_instruction' in data:
        project.task_instruction = data['task_instruction']
    if 'labels' in data:
        project.labels = json.dumps(data['labels'])

    db.session.commit()

    return jsonify({
        'success': True,
        'project': project.to_dict()
    })


@projects_bp.route('/<int:project_id>/publish', methods=['POST'])
@jwt_required()
def publish_project(project_id):
    """发布项目（发布后用户可以在任务广场看到并领取）"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    # 检查是否有数据集
    if not project.datasets:
        return jsonify({'error': '项目必须包含至少一个数据集才能发布'}), 400

    # 检查数据集是否已创建分片
    for dataset in project.datasets:
        if not dataset.chunks:
            return jsonify({'error': f'数据集 {dataset.name} 尚未创建分片'}), 400

    project.status = 'published'
    db.session.commit()

    return jsonify({
        'success': True,
        'project': project.to_dict()
    })


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """删除项目"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    db.session.delete(project)
    db.session.commit()

    return jsonify({'success': True})


# ==================== 数据集管理 ====================

def extract_archive(file_path, extract_to):
    """解压文件"""
    if file_path.endswith('.zip'):
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
    elif file_path.endswith(('.tar', '.tar.gz', '.tgz')):
        with tarfile.open(file_path, 'r:*') as tar_ref:
            tar_ref.extractall(extract_to)
    else:
        raise ValueError('不支持的压缩格式')


def get_image_files(directory):
    """获取目录下所有图片文件"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    image_files = []

    for root, dirs, files in os.walk(directory):
        for file in files:
            if os.path.splitext(file)[1].lower() in image_extensions:
                full_path = os.path.join(root, file)
                image_files.append(full_path)

    return sorted(image_files)  # 排序保证顺序一致


@projects_bp.route('/<int:project_id>/datasets', methods=['POST'])
@jwt_required()
def upload_dataset(project_id):
    """上传数据集"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    # 保存上传的文件
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
    file.save(file_path)

    # 创建数据集记录
    dataset = Dataset(
        name=filename,
        project_id=project_id,
        file_path=file_path,
        status='processing'
    )
    db.session.add(dataset)
    db.session.commit()

    try:
        # 解压文件
        extract_path = os.path.join(DATASETS_FOLDER, f'dataset_{dataset.id}')
        os.makedirs(extract_path, exist_ok=True)
        extract_archive(file_path, extract_path)

        dataset.extracted_path = extract_path

        # 扫描图片文件并创建任务
        image_files = get_image_files(extract_path)

        for idx, img_path in enumerate(image_files):
            task = Task(
                dataset_id=dataset.id,
                image_path=img_path,
                image_name=os.path.basename(img_path),
                task_index=idx,
                status='pending'
            )
            db.session.add(task)

        dataset.total_images = len(image_files)
        dataset.status = 'ready'
        db.session.commit()

        return jsonify({
            'success': True,
            'dataset': dataset.to_dict()
        })

    except Exception as e:
        dataset.status = 'error'
        db.session.commit()
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/<int:project_id>/datasets', methods=['GET'])
@jwt_required()
def get_project_datasets(project_id):
    """获取项目的数据集列表"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    datasets = Dataset.query.filter_by(project_id=project_id).all()
    return jsonify([d.to_dict(include_chunks=True) for d in datasets])


@projects_bp.route('/tasks/<int:task_id>/image', methods=['GET'])
@jwt_required()
def get_task_image(task_id):
    """获取任务图片"""
    task = Task.query.get_or_404(task_id)
    directory = os.path.dirname(task.image_path)
    filename = os.path.basename(task.image_path)
    return send_from_directory(directory, filename)
