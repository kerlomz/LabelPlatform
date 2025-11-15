@echo off
chcp 65001 > nul
title 验证码标注平台

echo 🏷️  验证码标注平台启动脚本
echo ================================

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装 Python 3
    echo 请先安装 Python 3: https://www.python.org/
    pause
    exit /b 1
)

echo.
echo 📦 启动后端服务...
cd backend

REM 创建虚拟环境
if not exist "venv" (
    echo 创建 Python 虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装 Python 依赖...
pip install -r requirements.txt

REM 启动后端服务
echo 启动 Flask 服务器 (端口 5000)...
start "Backend Server" cmd /k python app.py

cd ..

echo.
echo 🎨 启动前端服务...
cd frontend

REM 安装依赖
if not exist "node_modules" (
    echo 安装 Node.js 依赖...
    call npm install
)

REM 启动前端服务
echo 启动 Vite 开发服务器 (端口 5173)...
start "Frontend Server" cmd /k npm run dev

cd ..

echo.
echo ================================
echo ✅ 启动完成!
echo.
echo 📍 前端地址: http://localhost:5173
echo 📍 后端API: http://localhost:5000/api
echo.
echo ================================

pause
