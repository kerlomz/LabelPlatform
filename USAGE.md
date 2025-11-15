# 使用指南

## 快速开始

### 方式一: 使用启动脚本 (推荐)

#### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

#### Windows
```cmd
start.bat
```

### 方式二: 手动启动

#### 1. 启动后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

后端将运行在 http://localhost:5000

#### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端将运行在 http://localhost:5173

## 功能介绍

### 1. 字符型验证码标注

**适用场景**: 传统的文字识别验证码

**使用方法**:
1. 选择"字符型验证码"类型
2. 上传验证码图片
3. 在输入框中输入识别的文字
4. 按 Enter 或点击"保存标注"

**快捷键**:
- `Enter`: 保存标注

### 2. 点选验证码拉框标注

**适用场景**: 需要框选目标物体的验证码,如"点击所有的汽车"

**使用方法**:
1. 选择"点选验证码"类型
2. 上传图片
3. 按住鼠标左键拖动创建矩形框
4. 可为每个框添加标签
5. 点击"保存标注"

**操作技巧**:
- 可以创建多个框
- 点击框可以选中
- 使用"撤销上一个"删除最后创建的框

### 3. 分割模式标注 (多边形描边)

**适用场景**: 需要精确标注物体轮廓的场景

**使用方法**:
1. 选择"分割模式"类型
2. 上传图片
3. 在物体边缘点击添加点
4. 双击完成当前多边形
5. 可继续创建其他多边形
6. 点击"保存标注"

**操作技巧**:
- 至少需要3个点才能形成多边形
- 双击完成当前多边形
- 可以为每个多边形添加标签
- 使用"撤销点"删除最后添加的点

### 4. 拖动轨迹标注

**适用场景**: 滑动验证码,需要记录拖动路径

**使用方法**:
1. 选择"拖动轨迹"类型
2. 上传图片
3. 按住鼠标左键拖动,模拟拖动过程
4. 松开鼠标完成轨迹记录
5. 点击"保存标注"

**记录信息**:
- 轨迹点坐标
- 每个点的时间戳
- 轨迹总长度
- 拖动总耗时

### 5. 旋转验证码标注

**适用场景**: 需要旋转图片到正确角度的验证码

**使用方法**:
1. 选择"旋转验证码"类型
2. 上传图片
3. 拖动图片旋转,或使用滑块精确调整
4. 调整到正确角度后点击"保存标注"

**操作技巧**:
- 拖动图片进行旋转
- 使用滑块精确调整角度
- 点击"重置角度"回到0度

### 6. 九宫格/六宫格标注

**适用场景**: 图片分类验证码,如"选择包含交通灯的格子"

**使用方法**:
1. 选择"九宫格/六宫格"类型
2. 选择宫格类型 (9宫格或6宫格)
3. 上传图片
4. 点击符合要求的格子
5. 点击"保存标注"

**操作技巧**:
- 点击格子选中/取消选中
- 可多选
- 选中的格子会高亮显示

## 数据管理

### 查看标注数据

标注数据保存在 `backend/data/annotations.json`

### 导出数据

```bash
curl http://localhost:5000/api/export?format=json
```

### API 接口

- `GET /api/health` - 健康检查
- `POST /api/upload` - 上传图片
- `GET /api/annotations` - 获取标注列表
- `POST /api/annotations` - 创建标注
- `PUT /api/annotations/:id` - 更新标注
- `DELETE /api/annotations/:id` - 删除标注
- `GET /api/stats` - 获取统计信息
- `GET /api/export` - 导出数据

## 标注数据格式

```json
{
  "id": 1,
  "type": "text",
  "imageUrl": "/api/images/xxx.png",
  "imageName": "xxx.png",
  "timestamp": "2024-01-01T12:00:00",

  // 不同类型的标注数据
  "text": "abc123",                    // 字符型
  "boundingBoxes": [...],              // 拉框
  "polygons": [...],                   // 分割
  "trajectory": {...},                 // 轨迹
  "rotation": {"angle": 45},           // 旋转
  "grid": {"gridType": "grid-9", "selectedCells": [0,1,2]}  // 宫格
}
```

## 常见问题

### Q: 上传图片失败?
A: 检查后端服务是否正常运行,确保 `backend/uploads` 目录存在且有写入权限

### Q: 如何批量标注?
A: 完成一张后会自动重置,可以继续上传下一张图片

### Q: 如何修改已保存的标注?
A: 目前暂不支持在界面上修改,可以通过 API 接口进行更新

### Q: 支持哪些图片格式?
A: 支持常见的图片格式: JPG, PNG, GIF, BMP 等

## 开发说明

### 技术栈

**前端**:
- React 18 + TypeScript
- Ant Design (UI组件)
- Konva.js (Canvas绘图)
- Zustand (状态管理)
- Vite (构建工具)

**后端**:
- Flask (Web框架)
- Python 3.8+

### 目录结构

```
LabelPlatform/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/    # 标注组件
│   │   ├── pages/         # 页面
│   │   ├── stores/        # 状态管理
│   │   ├── types/         # TypeScript类型
│   │   └── api/           # API客户端
│   └── package.json
├── backend/               # 后端项目
│   ├── app.py            # Flask应用
│   ├── data/             # 数据存储
│   └── uploads/          # 上传的图片
└── README.md
```

### 添加新的标注类型

1. 在 `frontend/src/types/index.ts` 中添加类型定义
2. 创建新的标注组件
3. 在 `AnnotationPage.tsx` 中注册新类型
4. 更新后端 API (如需要)

## 许可证

MIT License
