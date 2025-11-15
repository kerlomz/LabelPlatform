from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import json
import zipfile
import tarfile
from datetime import datetime, timedelta
from models import db, User, Project, Dataset, Task, Annotation
from PIL import Image

app = Flask(__name__)
CORS(app)

# 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///label_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

# 文件路径
UPLOAD_FOLDER = 'uploads'
DATASETS_FOLDER = 'datasets'
STATIC_FOLDER = 'static'

for folder in [UPLOAD_FOLDER, DATASETS_FOLDER, STATIC_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# 初始化
db.init_app(app)
jwt = JWTManager(app)

# 创建数据库表
with app.app_context():
    db.create_all()

    # 创建默认管理员账户
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print('创建默认管理员账户: admin/admin123')


# ==================== 认证相关 ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'success': True,
            'token': access_token,
            'user': user.to_dict()
        })

    return jsonify({'success': False, 'message': '用户名或密码错误'}), 401


@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role='annotator'
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'success': True, 'user': user.to_dict()})


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前用户信息"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify(user.to_dict())


# ==================== 项目管理 ====================

@app.route('/api/projects', methods=['GET'])
@jwt_required()
def get_projects():
    """获取项目列表"""
    projects = Project.query.all()
    return jsonify([p.to_dict() for p in projects])


@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    """创建项目"""
    user_id = get_jwt_identity()
    data = request.get_json()

    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        annotation_type=data['annotation_type'],
        labels=json.dumps(data.get('labels', [])),
        owner_id=user_id
    )

    db.session.add(project)
    db.session.commit()

    return jsonify({'success': True, 'project': project.to_dict()})


@app.route('/api/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """获取项目详情"""
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())


@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """更新项目"""
    project = Project.query.get_or_404(project_id)
    data = request.get_json()

    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'labels' in data:
        project.labels = json.dumps(data['labels'])

    db.session.commit()
    return jsonify({'success': True, 'project': project.to_dict()})


@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """删除项目"""
    project = Project.query.get_or_404(project_id)
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
                image_files.append(os.path.join(root, file))

    return image_files


@app.route('/api/projects/<int:project_id>/datasets', methods=['POST'])
@jwt_required()
def upload_dataset(project_id):
    """上传数据集（支持zip/tar）"""
    project = Project.query.get_or_404(project_id)

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

        for img_path in image_files:
            task = Task(
                dataset_id=dataset.id,
                image_path=img_path,
                image_name=os.path.basename(img_path),
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


@app.route('/api/datasets/<int:dataset_id>', methods=['GET'])
@jwt_required()
def get_dataset(dataset_id):
    """获取数据集详情"""
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify(dataset.to_dict())


@app.route('/api/projects/<int:project_id>/datasets', methods=['GET'])
@jwt_required()
def get_project_datasets(project_id):
    """获取项目的数据集列表"""
    datasets = Dataset.query.filter_by(project_id=project_id).all()
    return jsonify([d.to_dict() for d in datasets])


# ==================== 任务管理 ====================

@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    """获取任务列表"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # 根据角色过滤
    if user.role == 'admin':
        tasks = Task.query.all()
    else:
        tasks = Task.query.filter_by(annotator_id=user_id).all()

    # 支持过滤
    status = request.args.get('status')
    dataset_id = request.args.get('dataset_id', type=int)

    if status:
        tasks = [t for t in tasks if t.status == status]
    if dataset_id:
        tasks = [t for t in tasks if t.dataset_id == dataset_id]

    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/tasks/next', methods=['GET'])
@jwt_required()
def get_next_task():
    """获取下一个待标注任务"""
    user_id = get_jwt_identity()
    dataset_id = request.args.get('dataset_id', type=int)

    # 查找未分配的任务
    query = Task.query.filter_by(status='pending')
    if dataset_id:
        query = query.filter_by(dataset_id=dataset_id)

    task = query.first()

    if task:
        # 分配给当前用户
        task.annotator_id = user_id
        task.status = 'in_progress'
        task.assigned_at = datetime.utcnow()
        db.session.commit()

        return jsonify(task.to_dict())

    return jsonify({'message': '没有更多任务'}), 404


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    """获取任务详情"""
    task = Task.query.get_or_404(task_id)
    return jsonify(task.to_dict())


@app.route('/api/tasks/<int:task_id>/image', methods=['GET'])
@jwt_required()
def get_task_image(task_id):
    """获取任务图片"""
    task = Task.query.get_or_404(task_id)
    directory = os.path.dirname(task.image_path)
    filename = os.path.basename(task.image_path)
    return send_from_directory(directory, filename)


# ==================== 标注管理 ====================

@app.route('/api/tasks/<int:task_id>/annotations', methods=['POST'])
@jwt_required()
def create_annotation(task_id):
    """创建/更新标注"""
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    # 查找现有标注
    annotation = Annotation.query.filter_by(task_id=task_id).first()

    if annotation:
        # 更新现有标注
        annotation.data = json.dumps(data['data'])
        annotation.version += 1
    else:
        # 创建新标注
        annotation = Annotation(
            task_id=task_id,
            annotation_type=data['annotation_type'],
            data=json.dumps(data['data'])
        )
        db.session.add(annotation)

    # 更新任务状态
    if data.get('completed', False):
        task.status = 'completed'
        task.completed_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'success': True,
        'annotation': annotation.to_dict()
    })


@app.route('/api/tasks/<int:task_id>/annotations', methods=['GET'])
@jwt_required()
def get_task_annotation(task_id):
    """获取任务的标注"""
    annotation = Annotation.query.filter_by(task_id=task_id).first()
    if annotation:
        return jsonify(annotation.to_dict())
    return jsonify({'message': '暂无标注'}), 404


# ==================== 统计信息 ====================

@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """获取统计信息"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user.role == 'admin':
        stats = {
            'total_projects': Project.query.count(),
            'total_datasets': Dataset.query.count(),
            'total_tasks': Task.query.count(),
            'completed_tasks': Task.query.filter_by(status='completed').count(),
            'total_users': User.query.count()
        }
    else:
        stats = {
            'assigned_tasks': Task.query.filter_by(annotator_id=user_id).count(),
            'completed_tasks': Task.query.filter_by(annotator_id=user_id, status='completed').count(),
            'in_progress_tasks': Task.query.filter_by(annotator_id=user_id, status='in_progress').count()
        }

    return jsonify(stats)


@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
