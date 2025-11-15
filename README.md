# 验证码标注平台

一个功能完善、体验友好的验证码标注平台，支持多种验证码类型的标注。

## 功能特性

### 支持的标注类型

1. **字符型验证码标注** - 直接输入识别出的文字内容
2. **点选验证码拉框标注** - 在图片上拉框标注目标区域
3. **分割模式标注** - 使用多边形描边精确标注物体轮廓
4. **拖动轨迹标注** - 记录和标注拖动路径轨迹
5. **旋转验证码标注** - 拖动旋转图片到正确角度
6. **九宫格/六宫格标注** - 选择符合要求的格子

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design (UI组件库)
- Konva.js (Canvas绘图)
- Zustand (状态管理)
- Axios (HTTP客户端)

### 后端
- Flask (轻量级Web框架)
- Flask-CORS (跨域支持)
- SQLite (数据存储)

## 项目结构

```
LabelPlatform/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── stores/        # 状态管理
│   │   ├── types/         # TypeScript类型定义
│   │   ├── utils/         # 工具函数
│   │   └── App.tsx        # 主应用组件
│   ├── package.json
│   └── vite.config.ts
├── backend/               # 后端项目
│   ├── app.py            # Flask应用主文件
│   ├── models.py         # 数据模型
│   ├── routes/           # API路由
│   └── requirements.txt
└── README.md
```

## 快速开始

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 后端启动

```bash
cd backend
pip install -r requirements.txt
python app.py
```

API服务运行在 http://localhost:5000

## 使用说明

1. 选择标注类型
2. 上传或选择待标注图片
3. 根据不同类型进行标注：
   - 字符型：直接输入识别的文字
   - 拉框：按住鼠标左键拖动创建矩形框
   - 分割：点击多个点形成多边形，双击完成
   - 轨迹：按住鼠标左键拖动记录轨迹
   - 旋转：拖动旋转图片到正确角度
   - 宫格：点击选择符合要求的格子
4. 保存标注结果

## 特色功能

- 🎨 直观的可视化标注界面
- ⌨️ 快捷键支持，提高标注效率
- 💾 自动保存，防止数据丢失
- 📊 标注进度统计
- 🔄 支持撤销/重做操作
- 📱 响应式设计，支持多种屏幕尺寸

## 许可证

MIT
