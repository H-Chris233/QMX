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

# PostgreSQL systemd unit（自动探测）
SERVICE_UNIT=""
PGDATA_DIR="${PGDATA_DIR:-/var/lib/postgres/data}"
DEFAULT_LOCALE="${DEFAULT_LOCALE:-C.UTF-8}"
DEFAULT_ENCODING="${DEFAULT_ENCODING:-UTF8}"

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

# 探测可用的 PostgreSQL systemd unit
detect_service_unit() {
    if [ -n "$SERVICE_UNIT" ]; then
        return 0
    fi

    if ! command -v systemctl >/dev/null 2>&1; then
        error "未检测到 systemctl，当前系统可能不使用 systemd。"
        return 1
    fi

    local unit_file
    unit_file="$(systemctl list-unit-files --type=service --no-legend --no-pager 2>/dev/null | awk '{print $1}' | grep -E '^postgresql(@.+)?\.service$|^postgresql-[0-9]+\.service$' | head -n 1 || true)"

    if [ -n "$unit_file" ]; then
        SERVICE_UNIT="${unit_file%.service}"
        return 0
    fi

    # 回退：如果 unit 文件列表不可用，尝试查询运行时 unit
    unit_file="$(systemctl list-units --type=service --all --no-legend --no-pager 2>/dev/null | awk '{print $1}' | grep -E '^postgresql(@.+)?\.service$|^postgresql-[0-9]+\.service$' | head -n 1 || true)"
    if [ -n "$unit_file" ]; then
        SERVICE_UNIT="${unit_file%.service}"
        return 0
    fi

    warning "未找到 PostgreSQL systemd 服务单元。"
    echo "可执行检查："
    echo "  1) 确认已安装 PostgreSQL：pacman -Qs postgresql"
    echo "  2) 列出相关 unit：systemctl list-unit-files | grep -i postgresql"
    echo "  3) Arch 常见初始化：sudo -iu postgres initdb -D /var/lib/postgres/data"
    echo "  4) 初始化后启动：sudo systemctl start postgresql"
    return 1
}

# 检查 sudo 权限
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if ! sudo -n true 2>/dev/null; then
            error "需要 sudo 权限，老王正在请求..."
        fi
    fi
}

# 检查数据库目录是否已初始化
is_db_initialized() {
    if [ "$EUID" -eq 0 ]; then
        [ -f "${PGDATA_DIR}/PG_VERSION" ]
        return $?
    fi

    # 使用 sudo 检查，避免普通用户无权限读取 postgres 数据目录导致误判
    if sudo test -f "${PGDATA_DIR}/PG_VERSION" 2>/dev/null; then
        return 0
    fi

    # 回退到当前用户检查（适用于开放权限目录）
    [ -f "${PGDATA_DIR}/PG_VERSION" ]
}

# 初始化数据库集群（Arch Linux 默认路径）
init_db_cluster() {
    local data_dir="${1:-$PGDATA_DIR}"
    local locale="${2:-$DEFAULT_LOCALE}"
    local encoding="${3:-$DEFAULT_ENCODING}"

    info "初始化 PostgreSQL 数据目录..."
    info "目录: ${data_dir}"
    info "区域设置: ${locale}, 编码: ${encoding}"

    check_sudo

    # 创建目录并设置属主
    sudo install -d -m 700 -o postgres -g postgres "$data_dir"

    # 非空且已初始化则直接返回
    if [ -f "${data_dir}/PG_VERSION" ]; then
        success "数据库目录已初始化，无需重复执行。"
        return 0
    fi

    # 非空但未初始化，避免覆盖未知文件
    if [ -n "$(sudo ls -A "$data_dir" 2>/dev/null)" ]; then
        error "目录 ${data_dir} 非空且未检测到 PG_VERSION，已停止以避免破坏现有文件。"
        echo "请先清理目录后重试，或指定新的数据目录："
        echo "  ./pg-manage.sh init /path/to/new/data"
        exit 1
    fi

    sudo -iu postgres initdb --locale="$locale" --encoding="$encoding" -D "$data_dir"
    success "数据库目录初始化完成：${data_dir}"
}

# 启动服务
start_service() {
    info "启动 PostgreSQL 服务..."
    detect_service_unit || exit 1
    check_sudo
    if ! is_db_initialized; then
        error "检测到数据库目录未初始化：${PGDATA_DIR}"
        echo "请先执行："
        echo "  ./pg-manage.sh init"
        echo "或手动执行："
        echo "  sudo -iu postgres initdb --locale=${DEFAULT_LOCALE} --encoding=${DEFAULT_ENCODING} -D ${PGDATA_DIR}"
        exit 1
    fi
    sudo systemctl start "$SERVICE_UNIT"
    success "PostgreSQL 服务已启动（$SERVICE_UNIT）"
}

# 停止服务
stop_service() {
    info "停止 PostgreSQL 服务..."
    detect_service_unit || exit 1
    check_sudo
    sudo systemctl stop "$SERVICE_UNIT"
    success "PostgreSQL 服务已停止（$SERVICE_UNIT）"
}

# 重启服务
restart_service() {
    info "重启 PostgreSQL 服务..."
    detect_service_unit || exit 1
    check_sudo
    sudo systemctl restart "$SERVICE_UNIT"
    success "PostgreSQL 服务已重启（$SERVICE_UNIT）"
}

# 查看状态
status_service() {
    detect_service_unit || exit 1
    info "PostgreSQL 服务状态："
    systemctl status "$SERVICE_UNIT" --no-pager || true
}

# 开机自启
enable_service() {
    info "设置 PostgreSQL 开机自启..."
    detect_service_unit || exit 1
    check_sudo
    sudo systemctl enable "$SERVICE_UNIT"
    success "PostgreSQL 已设置为开机自启（$SERVICE_UNIT）"
}

# 关闭开机自启
disable_service() {
    info "关闭 PostgreSQL 开机自启..."
    detect_service_unit || exit 1
    check_sudo
    sudo systemctl disable "$SERVICE_UNIT"
    success "PostgreSQL 已取消开机自启（$SERVICE_UNIT）"
}

# 查看日志
logs_service() {
    detect_service_unit || exit 1
    info "PostgreSQL 服务日志（最近 50 行）："
    sudo journalctl -u "$SERVICE_UNIT" -n 50 --no-pager || true
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
  init [data_dir] [locale] [encoding]
                    初始化 PostgreSQL 数据目录
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
  ./pg-manage.sh init
  ./pg-manage.sh init /var/lib/postgres/data C.UTF-8 UTF8
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
        init)
            init_db_cluster "$2" "$3" "$4"
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
