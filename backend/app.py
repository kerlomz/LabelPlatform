from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime
import base64
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# 配置
UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

# 标注数据存储
annotations_file = os.path.join(DATA_FOLDER, 'annotations.json')

def load_annotations():
    """加载标注数据"""
    if os.path.exists(annotations_file):
        with open(annotations_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_annotations(annotations):
    """保存标注数据"""
    with open(annotations_file, 'w', encoding='utf-8') as f:
        json.dump(annotations, f, ensure_ascii=False, indent=2)

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """上传图片"""
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    # 保存文件
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    return jsonify({
        'success': True,
        'filename': filename,
        'url': f'/api/images/{filename}'
    })

@app.route('/api/upload-base64', methods=['POST'])
def upload_base64():
    """上传Base64编码的图片"""
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': '无效的请求'}), 400

    try:
        # 解析base64图片
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        # 保存文件
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.png"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image.save(filepath)

        return jsonify({
            'success': True,
            'filename': filename,
            'url': f'/api/images/{filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/<filename>')
def get_image(filename):
    """获取图片"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/annotations', methods=['GET'])
def get_annotations():
    """获取所有标注"""
    annotations = load_annotations()

    # 支持分页
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    annotation_type = request.args.get('type', None)

    # 过滤类型
    if annotation_type:
        annotations = [a for a in annotations if a.get('type') == annotation_type]

    # 分页
    start = (page - 1) * per_page
    end = start + per_page

    return jsonify({
        'annotations': annotations[start:end],
        'total': len(annotations),
        'page': page,
        'per_page': per_page
    })

@app.route('/api/annotations', methods=['POST'])
def create_annotation():
    """创建标注"""
    data = request.get_json()

    if not data:
        return jsonify({'error': '无效的请求'}), 400

    annotations = load_annotations()

    # 添加元数据
    annotation = {
        'id': len(annotations) + 1,
        'timestamp': datetime.now().isoformat(),
        **data
    }

    annotations.append(annotation)
    save_annotations(annotations)

    return jsonify({
        'success': True,
        'annotation': annotation
    })

@app.route('/api/annotations/<int:annotation_id>', methods=['PUT'])
def update_annotation(annotation_id):
    """更新标注"""
    data = request.get_json()
    annotations = load_annotations()

    for i, ann in enumerate(annotations):
        if ann['id'] == annotation_id:
            annotations[i] = {
                **ann,
                **data,
                'updated_at': datetime.now().isoformat()
            }
            save_annotations(annotations)
            return jsonify({
                'success': True,
                'annotation': annotations[i]
            })

    return jsonify({'error': '标注不存在'}), 404

@app.route('/api/annotations/<int:annotation_id>', methods=['DELETE'])
def delete_annotation(annotation_id):
    """删除标注"""
    annotations = load_annotations()
    annotations = [a for a in annotations if a['id'] != annotation_id]
    save_annotations(annotations)

    return jsonify({'success': True})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取统计信息"""
    annotations = load_annotations()

    stats = {
        'total': len(annotations),
        'by_type': {}
    }

    for ann in annotations:
        ann_type = ann.get('type', 'unknown')
        stats['by_type'][ann_type] = stats['by_type'].get(ann_type, 0) + 1

    return jsonify(stats)

@app.route('/api/export', methods=['GET'])
def export_annotations():
    """导出标注数据"""
    annotations = load_annotations()
    export_format = request.args.get('format', 'json')

    if export_format == 'json':
        return jsonify(annotations)
    else:
        return jsonify({'error': '不支持的导出格式'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
