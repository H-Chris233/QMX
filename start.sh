#!/bin/bash

# QMX项目启动脚本
# 启动前后端分离的学生管理系统

echo "🚀 QMX启明星学生管理系统启动脚本"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到Node.js，请先安装Node.js >= 18.0.0"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到npm，请先安装npm"
    exit 1
fi

# 显示Node.js版本
NODE_VERSION=$(node --version)
echo "✅ Node.js版本: $NODE_VERSION"

# 检查端口是否被占用
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 端口3001已被占用，可能是后端服务正在运行"
fi

if lsof -Pi :1420 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 端口1420已被占用，可能是前端服务正在运行"
fi

echo ""
echo "请选择启动方式:"
echo "1) 同时启动前后端服务 (推荐)"
echo "2) 仅启动后端服务"
echo "3) 仅启动前端服务"
echo "4) 退出"
echo ""

read -p "请输入选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 正在同时启动前后端服务..."
        
        # 检查依赖
        if [ ! -d "node_modules" ]; then
            echo "📦 正在安装前端依赖..."
            npm install
        fi
        
        if [ ! -d "backend/node_modules" ]; then
            echo "📦 正在安装后端依赖..."
            cd backend && npm install && cd ..
        fi
        
        # 启动服务
        echo "🔧 启动服务中..."
        npm run dev:full
        ;;
    2)
        echo "🔧 正在启动后端服务..."
        
        if [ ! -d "backend/node_modules" ]; then
            echo "📦 正在安装后端依赖..."
            cd backend && npm install && cd ..
        fi
        
        npm run backend
        ;;
    3)
        echo "🔧 正在启动前端服务..."
        
        if [ ! -d "node_modules" ]; then
            echo "📦 正在安装前端依赖..."
            npm install
        fi
        
        npm run dev
        ;;
    4)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选择，请重新运行脚本"
        exit 1
        ;;
esac