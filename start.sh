#!/bin/bash

# 验证码标注平台启动脚本

echo "🏷️  验证码标注平台启动脚本"
echo "================================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未安装 Python 3"
    echo "请先安装 Python 3: https://www.python.org/"
    exit 1
fi

# 启动后端
echo ""
echo "📦 启动后端服务..."
cd backend

# 创建虚拟环境(如果不存在)
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 启动后端服务(后台运行)
echo "启动 Flask 服务器 (端口 5000)..."
python app.py &
BACKEND_PID=$!

cd ..

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd frontend

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "安装 Node.js 依赖..."
    npm install
fi

# 启动前端服务
echo "启动 Vite 开发服务器 (端口 5173)..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "================================"
echo "✅ 启动完成!"
echo ""
echo "📍 前端地址: http://localhost:5173"
echo "📍 后端API: http://localhost:5000/api"
echo ""
echo "按 Ctrl+C 停止服务"
echo "================================"

# 等待进程
wait $BACKEND_PID $FRONTEND_PID
