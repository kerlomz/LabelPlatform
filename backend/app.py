"""
标注平台后端主应用
支持多用户协作、任务分片、数据隔离等功能
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from models import db, User
import os

app = Flask(__name__)
CORS(app)

# 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///label_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production-please'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['MAX_CONTENT_LENGTH'] = 1000 * 1024 * 1024  # 1GB

# 初始化
db.init_app(app)
jwt = JWTManager(app)

# 创建文件夹
for folder in ['uploads', 'datasets', 'static']:
    os.makedirs(folder, exist_ok=True)

# 注册蓝图
from routes.projects import projects_bp
from routes.tasks import tasks_bp

app.register_blueprint(projects_bp, url_prefix='/api/projects')
app.register_blueprint(tasks_bp, url_prefix='/api/tasks')


# ==================== 认证相关 ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        if not user.is_active:
            return jsonify({'error': '账户已被禁用'}), 403

        access_token = create_access_token(identity=user.id)
        return jsonify({
            'success': True,
            'token': access_token,
            'user': user.to_dict()
        })

    return jsonify({'error': '用户名或密码错误'}), 401


@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400

    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': '邮箱已被使用'}), 400

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role='annotator'
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'user': user.to_dict()
    })


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前用户信息"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify(user.to_dict())


# ==================== 用户管理 ====================

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """获取用户列表（管理员）"""
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)

    if current_user.role != 'admin':
        return jsonify({'error': '无权限'}), 403

    users = User.query.all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/users/<int:user_id>/toggle-active', methods=['POST'])
@jwt_required()
def toggle_user_active(user_id):
    """启用/禁用用户（管理员）"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': '无权限'}), 403

    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()

    return jsonify({
        'success': True,
        'user': user.to_dict()
    })


# ==================== 健康检查 ====================

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'version': '2.0.0',
        'features': [
            'multi-user',
            'task-chunking',
            'claim-system',
            'data-isolation',
            'statistics'
        ]
    })


# ==================== 数据库初始化 ====================

def init_database():
    """初始化数据库"""
    with app.app_context():
        db.create_all()

        # 创建默认管理员
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@labelplatform.com',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print('✅ 创建默认管理员账户: admin / admin123')

        # 创建测试标注员（可选）
        if not User.query.filter_by(username='annotator1').first():
            annotator = User(
                username='annotator1',
                email='annotator1@test.com',
                password_hash=generate_password_hash('test123'),
                role='annotator'
            )
            db.session.add(annotator)
            db.session.commit()
            print('✅ 创建测试标注员账户: annotator1 / test123')


if __name__ == '__main__':
    init_database()
    print('🚀 服务启动成功!')
    print('📍 API地址: http://localhost:5000/api')
    print('👤 默认账户: admin / admin123')
    app.run(debug=True, host='0.0.0.0', port=5000)
