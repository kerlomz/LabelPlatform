"""
任务和分片管理路由
包含任务发布、分片管理、领取等功能
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Project, Dataset, Task, TaskChunk, TaskChunkClaim, Annotation
from datetime import datetime
import math

tasks_bp = Blueprint('tasks', __name__)


# ==================== 任务分片管理 ====================

@tasks_bp.route('/datasets/<int:dataset_id>/create-chunks', methods=['POST'])
@jwt_required()
def create_chunks(dataset_id):
    """创建任务分片"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    dataset = Dataset.query.get_or_404(dataset_id)

    # 权限检查：只有项目创建者可以创建分片
    if dataset.project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    data = request.get_json()
    chunk_size = data.get('chunk_size', 100)
    max_claims_per_user = data.get('max_claims_per_user', 1)
    single_claim_only = data.get('single_claim_only', False)

    # 更新数据集配置
    dataset.chunk_size = chunk_size
    dataset.max_claims_per_user = max_claims_per_user
    dataset.single_claim_only = single_claim_only

    # 删除旧分片
    TaskChunk.query.filter_by(dataset_id=dataset_id).delete()

    # 创建新分片
    tasks = Task.query.filter_by(dataset_id=dataset_id).order_by(Task.task_index).all()
    total_tasks = len(tasks)
    total_chunks = math.ceil(total_tasks / chunk_size)

    chunks = []
    for i in range(total_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, total_tasks)

        chunk = TaskChunk(
            dataset_id=dataset_id,
            chunk_index=i,
            name=f"分片 {i+1}/{total_chunks}",
            start_index=start_idx,
            end_index=end_idx,
            task_count=end_idx - start_idx
        )
        db.session.add(chunk)
        chunks.append(chunk)

        # 更新任务的分片索引
        for task_idx in range(start_idx, end_idx):
            tasks[task_idx].chunk_index = i

    db.session.commit()

    return jsonify({
        'success': True,
        'total_chunks': total_chunks,
        'chunks': [c.to_dict() for c in chunks]
    })


@tasks_bp.route('/datasets/<int:dataset_id>/chunks', methods=['GET'])
@jwt_required()
def get_dataset_chunks(dataset_id):
    """获取数据集的所有分片"""
    dataset = Dataset.query.get_or_404(dataset_id)
    chunks = TaskChunk.query.filter_by(dataset_id=dataset_id).order_by(TaskChunk.chunk_index).all()

    return jsonify({
        'dataset': dataset.to_dict(),
        'chunks': [c.to_dict() for c in chunks]
    })


# ==================== 任务广场（用户视图）====================

@tasks_bp.route('/task-market', methods=['GET'])
@jwt_required()
def get_task_market():
    """获取任务广场 - 显示所有可领取的项目和分片"""
    user_id = get_jwt_identity()

    # 获取所有已发布的项目
    projects = Project.query.filter_by(status='published').all()

    result = []
    for project in projects:
        project_data = project.to_dict(include_stats=True)

        # 获取该项目下所有可用的分片
        available_chunks = []
        for dataset in project.datasets:
            for chunk in dataset.chunks:
                # 检查用户是否已达到领取上限
                user_claims = TaskChunkClaim.query.filter_by(
                    user_id=user_id
                ).join(TaskChunk).filter(
                    TaskChunk.dataset_id == dataset.id
                ).count()

                can_claim = (
                    chunk.is_available() and
                    user_claims < dataset.max_claims_per_user
                )

                if can_claim or user_claims > 0:  # 显示可领取的和已领取的
                    chunk_data = chunk.to_dict()
                    chunk_data['user_claimed'] = TaskChunkClaim.query.filter_by(
                        chunk_id=chunk.id,
                        user_id=user_id
                    ).first() is not None
                    chunk_data['can_claim'] = can_claim
                    available_chunks.append(chunk_data)

        project_data['available_chunks'] = available_chunks
        result.append(project_data)

    return jsonify(result)


# ==================== 任务领取 ====================

@tasks_bp.route('/chunks/<int:chunk_id>/claim', methods=['POST'])
@jwt_required()
def claim_chunk(chunk_id):
    """领取任务分片"""
    user_id = get_jwt_identity()
    chunk = TaskChunk.query.get_or_404(chunk_id)
    dataset = chunk.dataset

    # 检查分片是否可领取
    if not chunk.is_available():
        return jsonify({'error': '该分片已被领取'}), 400

    # 检查用户是否已达到领取上限
    user_claims = TaskChunkClaim.query.filter_by(
        user_id=user_id
    ).join(TaskChunk).filter(
        TaskChunk.dataset_id == dataset.id
    ).count()

    if user_claims >= dataset.max_claims_per_user:
        return jsonify({'error': f'您已达到该数据集的领取上限（{dataset.max_claims_per_user}个分片）'}), 400

    # 检查是否已经领取过
    existing_claim = TaskChunkClaim.query.filter_by(
        chunk_id=chunk_id,
        user_id=user_id
    ).first()

    if existing_claim:
        return jsonify({'error': '您已经领取过该分片'}), 400

    # 创建领取记录
    claim = TaskChunkClaim(
        chunk_id=chunk_id,
        user_id=user_id,
        status='claimed'
    )
    db.session.add(claim)
    db.session.commit()

    return jsonify({
        'success': True,
        'claim': claim.to_dict()
    })


@tasks_bp.route('/my-claims', methods=['GET'])
@jwt_required()
def get_my_claims():
    """获取我的领取记录"""
    user_id = get_jwt_identity()

    claims = TaskChunkClaim.query.filter_by(user_id=user_id).order_by(
        TaskChunkClaim.claimed_at.desc()
    ).all()

    return jsonify([c.to_dict() for c in claims])


# ==================== 标注任务获取 ====================

@tasks_bp.route('/claims/<int:claim_id>/next-task', methods=['GET'])
@jwt_required()
def get_next_task_in_claim(claim_id):
    """获取领取分片中的下一个待标注任务"""
    user_id = get_jwt_identity()
    claim = TaskChunkClaim.query.get_or_404(claim_id)

    # 权限检查
    if claim.user_id != user_id:
        return jsonify({'error': '无权限'}), 403

    # 更新领取状态
    if claim.status == 'claimed':
        claim.status = 'in_progress'
        claim.started_at = datetime.utcnow()
        db.session.commit()

    # 获取分片中的下一个未完成任务
    chunk = claim.chunk
    tasks = Task.query.filter_by(
        dataset_id=chunk.dataset_id,
        chunk_index=chunk.chunk_index
    ).filter(
        Task.status.in_(['pending', 'in_progress'])
    ).order_by(Task.task_index).all()

    if not tasks:
        # 所有任务已完成
        claim.status = 'completed'
        claim.completed_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': '该分片的所有任务已完成'}), 404

    # 返回第一个任务
    task = tasks[0]
    task.status = 'in_progress'
    if not task.started_at:
        task.started_at = datetime.utcnow()
    db.session.commit()

    # 获取项目信息（用于显示标注说明）
    project = chunk.dataset.project

    return jsonify({
        'task': task.to_dict(),
        'project': project.to_dict(),
        'chunk': chunk.to_dict(),
        'claim': claim.to_dict(),
        'remaining_tasks': len(tasks) - 1
    })


# ==================== 标注提交 ====================

@tasks_bp.route('/tasks/<int:task_id>/submit-annotation', methods=['POST'])
@jwt_required()
def submit_annotation(task_id):
    """提交标注"""
    user_id = get_jwt_identity()
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    # 检查是否已有标注
    annotation = Annotation.query.filter_by(task_id=task_id).first()

    import json
    if annotation:
        # 更新现有标注
        annotation.data = json.dumps(data['data'])
        annotation.user_id = user_id
        annotation.time_spent = data.get('time_spent', 0)
        annotation.version += 1
    else:
        # 创建新标注
        annotation = Annotation(
            task_id=task_id,
            user_id=user_id,
            annotation_type=data['annotation_type'],
            data=json.dumps(data['data']),
            time_spent=data.get('time_spent', 0)
        )
        db.session.add(annotation)

    # 更新任务状态
    task.status = 'completed'
    task.completed_at = datetime.utcnow()

    # 更新用户统计
    user = User.query.get(user_id)
    user.total_annotations += 1
    user.total_time_spent += data.get('time_spent', 0)

    # 更新分片领取记录
    chunk_claim = TaskChunkClaim.query.join(TaskChunk).filter(
        TaskChunk.dataset_id == task.dataset_id,
        TaskChunk.chunk_index == task.chunk_index,
        TaskChunkClaim.user_id == user_id
    ).first()

    if chunk_claim:
        chunk_claim.completed_tasks += 1
        chunk_claim.total_time_spent += data.get('time_spent', 0)

    db.session.commit()

    return jsonify({
        'success': True,
        'annotation': annotation.to_dict()
    })


# ==================== 统计和可视化 ====================

@tasks_bp.route('/projects/<int:project_id>/statistics', methods=['GET'])
@jwt_required()
def get_project_statistics(project_id):
    """获取项目统计信息（创建者可见）"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    # 总体统计
    total_tasks = sum(d.total_images for d in project.datasets)
    completed_tasks = Task.query.join(Dataset).filter(
        Dataset.project_id == project_id,
        Task.status == 'completed'
    ).count()

    # 标注者统计
    annotator_stats = db.session.query(
        User.id,
        User.username,
        db.func.count(Annotation.id).label('annotation_count'),
        db.func.sum(Annotation.time_spent).label('total_time')
    ).join(
        Annotation, User.id == Annotation.user_id
    ).join(
        Task, Annotation.task_id == Task.id
    ).join(
        Dataset, Task.dataset_id == Dataset.id
    ).filter(
        Dataset.project_id == project_id
    ).group_by(User.id).all()

    # 分片领取情况
    chunk_stats = db.session.query(
        TaskChunk.id,
        TaskChunk.name,
        db.func.count(TaskChunkClaim.id).label('claim_count'),
        TaskChunk.task_count
    ).outerjoin(
        TaskChunkClaim, TaskChunk.id == TaskChunkClaim.chunk_id
    ).join(
        Dataset, TaskChunk.dataset_id == Dataset.id
    ).filter(
        Dataset.project_id == project_id
    ).group_by(TaskChunk.id).all()

    return jsonify({
        'project': project.to_dict(include_stats=True),
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'progress': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
        'annotators': [
            {
                'user_id': a.id,
                'username': a.username,
                'annotation_count': a.annotation_count,
                'total_time': a.total_time or 0
            }
            for a in annotator_stats
        ],
        'chunks': [
            {
                'chunk_id': c.id,
                'name': c.name,
                'claim_count': c.claim_count,
                'task_count': c.task_count,
                'claimed_rate': (c.claim_count / c.task_count * 100) if c.task_count > 0 else 0
            }
            for c in chunk_stats
        ]
    })


@tasks_bp.route('/projects/<int:project_id>/annotations', methods=['GET'])
@jwt_required()
def get_project_annotations(project_id):
    """获取项目的所有标注（创建者可见，用于导出）"""
    user_id = get_jwt_identity()
    project = Project.query.get_or_404(project_id)

    # 权限检查
    if project.creator_id != user_id:
        return jsonify({'error': '无权限'}), 403

    # 获取所有标注
    annotations = db.session.query(
        Annotation, Task, User
    ).join(
        Task, Annotation.task_id == Task.id
    ).join(
        Dataset, Task.dataset_id == Dataset.id
    ).outerjoin(
        User, Annotation.user_id == User.id
    ).filter(
        Dataset.project_id == project_id
    ).all()

    result = []
    for ann, task, user in annotations:
        result.append({
            **ann.to_dict(),
            'task': task.to_dict(),
            'annotator': user.to_dict() if user else None
        })

    return jsonify(result)
