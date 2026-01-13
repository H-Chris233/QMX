#!/bin/bash

# PostgreSQL 测试数据库启动脚本
# 使用 Docker 启动 PostgreSQL 测试数据库

echo "🐳 启动 PostgreSQL 测试数据库..."

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否已安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 停止并删除已有的测试数据库容器（如果存在）
echo "📦 清理旧容器..."
docker stop qmx-postgres-test 2>/dev/null || true
docker rm qmx-postgres-test 2>/dev/null || true

# 启动 PostgreSQL 测试容器
echo "🚀 启动新的 PostgreSQL 测试容器..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.test.yml up -d
else
    docker compose -f docker-compose.test.yml up -d
fi

# 等待 PostgreSQL 启动
echo "⏳ 等待 PostgreSQL 启动..."
sleep 5

# 检查容器健康状态
MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if docker exec qmx-postgres-test pg_isready -U qmx_test -d qmx_test > /dev/null 2>&1; then
        echo "✅ PostgreSQL 测试数据库已就绪"
        
        # 显示连接信息
        echo ""
        echo "📋 连接信息:"
        echo "   Host: localhost"
        echo "   Port: 5433"
        echo "   Database: qmx_test"
        echo "   Username: qmx_test"
        echo "   Password: qmx_test_password"
        echo ""
        echo "🔗 连接字符串:"
        echo "   postgresql://qmx_test:qmx_test_password@localhost:5433/qmx_test"
        
        # 设置数据库迁移
        echo ""
        echo "🔧 执行数据库迁移..."
        cd $(dirname "$0")/..
        pnpm run db:push
        
        exit 0
    fi
    
    echo "   尝试 $ATTEMPT/$MAX_ATTEMPTS: PostgreSQL 尚未就绪，继续等待..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ PostgreSQL 测试数据库启动超时"
exit 1
