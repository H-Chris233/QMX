#!/bin/bash
# PostgreSQL 服务管理脚本
# 作者: 老王
# 用法: ./pg-manage.sh [start|stop|restart|status|enable|disable|logs]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务名称
SERVICE_NAME="postgresql"

# 打印带颜色的信息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 sudo 权限
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if ! sudo -n true 2>/dev/null; then
            error "需要 sudo 权限，老王正在请求..."
        fi
    fi
}

# 启动服务
start_service() {
    info "启动 PostgreSQL 服务..."
    check_sudo
    sudo systemctl start "$SERVICE_NAME"
    success "PostgreSQL 服务已启动"
}

# 停止服务
stop_service() {
    info "停止 PostgreSQL 服务..."
    check_sudo
    sudo systemctl stop "$SERVICE_NAME"
    success "PostgreSQL 服务已停止"
}

# 重启服务
restart_service() {
    info "重启 PostgreSQL 服务..."
    check_sudo
    sudo systemctl restart "$SERVICE_NAME"
    success "PostgreSQL 服务已重启"
}

# 查看状态
status_service() {
    info "PostgreSQL 服务状态："
    systemctl status "$SERVICE_NAME" --no-pager || true
}

# 开机自启
enable_service() {
    info "设置 PostgreSQL 开机自启..."
    check_sudo
    sudo systemctl enable "$SERVICE_NAME"
    success "PostgreSQL 已设置为开机自启"
}

# 关闭开机自启
disable_service() {
    info "关闭 PostgreSQL 开机自启..."
    check_sudo
    sudo systemctl disable "$SERVICE_NAME"
    success "PostgreSQL 已取消开机自启"
}

# 查看日志
logs_service() {
    info "PostgreSQL 服务日志（最近 50 行）："
    sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager || true
}

# 连接数据库
connect_db() {
    local user="${1:-postgres}"
    local db="${2:-postgres}"
    info "连接 PostgreSQL 数据库 ($user/$db)..."
    psql -U "$user" -d "$db"
}

# 显示帮助
show_help() {
    cat << EOF
PostgreSQL 服务管理脚本

用法: ./pg-manage.sh [命令] [参数]

命令:
  start              启动 PostgreSQL 服务
  stop               停止 PostgreSQL 服务
  restart            重启 PostgreSQL 服务
  status             查看服务状态
  enable             设置开机自启
  disable            取消开机自启
  logs               查看服务日志
  connect [user] [db] 连接数据库（默认: postgres/postgres）
  help               显示此帮助信息

示例:
  ./pg-manage.sh start
  ./pg-manage.sh status
  ./pg-manage.sh connect postgres mydb

作者: 老王
EOF
}

# 主函数
main() {
    local command="${1:-help}"

    case "$command" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            status_service
            ;;
        enable)
            enable_service
            ;;
        disable)
            disable_service
            ;;
        logs)
            logs_service
            ;;
        connect)
            connect_db "$2" "$3"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"