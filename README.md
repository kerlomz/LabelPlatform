# 专业验证码标注平台

一个功能完善、体验优秀的验证码标注平台，支持项目管理、批量数据上传、任务分配和多种标注模式。

## ✨ 核心特性

### 后台管理系统
- 📁 **项目管理** - 创建项目，配置标注类型和标签
- 📦 **批量上传** - 支持zip/tar压缩包，自动解压和任务分发
- 📊 **进度跟踪** - 实时查看标注进度和统计信息
- 👥 **用户系统** - 登录认证，权限管理

### 专业标注工具

#### 1. 边界框标注 (BBox)
- ✅ 鼠标拖动创建矩形框
- ✅ 点击选中框
- ✅ 拖动框进行移动
- ✅ 拖动角点调整大小
- ✅ 删除、复制框
- ✅ 为每个框添加标签
- ✅ 撤销/重做 (Ctrl+Z/Y)
- ✅ 快捷键支持

#### 2. 多边形标注 (Polygon)
- ✅ 点击添加点
- ✅ 拖动点调整位置
- ✅ 删除点（至少保留3个点）
- ✅ 双击完成多边形
- ✅ 支持多个多边形
- ✅ 标签管理
- ✅ 撤销/重做
- ✅ 快捷键支持

#### 3. 其他标注类型
- 文本标注
- 轨迹标注
- 旋转标注
- 宫格标注

### 任务管理
- 🔄 自动任务分配
- 📝 标注状态跟踪（待标注、标注中、已完成）
- 💾 自动保存和版本管理
- ⏭️ 跳过任务功能

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- Python >= 3.8

### 安装依赖

**后端:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**前端:**
```bash
cd frontend
npm install
```

### 启动服务

**后端:**
```bash
cd backend
python app.py
```
后端运行在 http://localhost:5000

**前端:**
```bash
cd frontend
npm run dev
```
前端运行在 http://localhost:5173

### 默认账户
- 用户名: `admin`
- 密码: `admin123`

## 📖 使用流程

### 1. 创建项目
1. 登录后台管理
2. 点击"创建项目"
3. 填写项目名称、选择标注类型、配置标签
4. 确认创建

### 2. 上传数据集
1. 选择项目，点击"上传数据集"
2. 上传zip/tar压缩包（包含图片文件）
3. 系统自动解压并创建标注任务

### 3. 开始标注
1. 在数据集列表中点击"开始标注"
2. 系统自动分配下一个待标注任务
3. 使用标注工具进行标注
4. 保存后自动进入下一张

## 🎮 快捷键

### 边界框标注
- `鼠标拖动` - 创建框
- `点击` - 选中框
- `Delete` - 删除选中的框
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `Ctrl+D` - 复制选中的框
- `Ctrl+S` - 保存

### 多边形标注
- `点击` - 添加点
- `双击` - 完成多边形
- `拖动点` - 调整位置
- `选中点 + Delete` - 删除点
- `Enter` - 完成当前多边形
- `Esc` - 取消当前多边形
- `Ctrl+Z/Y` - 撤销/重做

## 🏗️ 技术架构

### 后端
- **Flask** - Web框架
- **SQLAlchemy** - ORM
- **JWT** - 身份认证
- **SQLite** - 数据库

### 前端
- **React 18** + **TypeScript**
- **Ant Design** - UI组件库
- **Konva.js** - Canvas绘图
- **Zustand** - 状态管理
- **React Router** - 路由
- **Vite** - 构建工具

## 📁 项目结构

```
LabelPlatform/
├── backend/                 # 后端
│   ├── app.py              # Flask应用
│   ├── models.py           # 数据模型
│   ├── requirements.txt    # 依赖
│   ├── uploads/            # 上传文件
│   ├── datasets/           # 解压后的数据集
│   └── label_platform.db   # SQLite数据库
│
├── frontend/               # 前端
│   ├── src/
│   │   ├── components/     # 标注工具组件
│   │   │   ├── BBoxEditor.tsx       # 边界框编辑器
│   │   │   └── PolygonEditor.tsx    # 多边形编辑器
│   │   ├── pages/          # 页面
│   │   │   ├── Login.tsx            # 登录页
│   │   │   ├── ProjectManagement.tsx # 项目管理
│   │   │   └── AnnotationWorkspace.tsx # 标注工作台
│   │   ├── stores/         # 状态管理
│   │   ├── api/            # API客户端
│   │   ├── types/          # TypeScript类型
│   │   └── App.tsx         # 主应用
│   └── package.json
│
└── README.md
```

## 🎯 核心功能

### 项目管理
- 创建项目并配置标注类型
- 支持多种标注类型：文本、边界框、多边形、轨迹、旋转、宫格
- 标签配置和管理

### 数据集管理
- 批量上传压缩包（支持zip、tar、tar.gz）
- 自动解压和图片识别
- 自动创建标注任务
- 进度跟踪和统计

### 标注工具
- 专业的Canvas绘图工具
- 完善的编辑功能（创建、选择、移动、调整、删除）
- 撤销/重做支持
- 快捷键操作
- 自动保存

### 任务系统
- 自动任务分配
- 状态管理（待标注、进行中、已完成）
- 跳过功能
- 批量处理

## 🔐 权限系统

- **管理员** - 可以创建项目、上传数据集、查看所有任务
- **标注员** - 可以标注分配给自己的任务
- **审核员** - 可以审核已完成的标注

## 📊 数据导出

标注数据以JSON格式存储，可通过API导出：

```json
{
  "task_id": 1,
  "annotation_type": "bbox",
  "data": {
    "bboxes": [
      {
        "id": "uuid",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "label": "验证码"
      }
    ]
  }
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
