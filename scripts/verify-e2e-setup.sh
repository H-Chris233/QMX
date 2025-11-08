#!/bin/bash

# E2E 测试设置验证脚本
# 验证所有E2E稳定性改进已正确配置

set -e

echo "🔍 开始验证E2E测试设置..."
echo ""

ERRORS=0
WARNINGS=0

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_file() {
  local file=$1
  local pattern=$2
  local description=$3
  
  if [ -f "$file" ]; then
    if grep -q "$pattern" "$file"; then
      echo -e "${GREEN}✓${NC} $description"
      return 0
    else
      echo -e "${RED}✗${NC} $description (未找到: $pattern)"
      ((ERRORS++))
      return 1
    fi
  else
    echo -e "${RED}✗${NC} 文件不存在: $file"
    ((ERRORS++))
    return 1
  fi
}

check_file_exists() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    return 0
  else
    echo -e "${RED}✗${NC} $description"
    ((ERRORS++))
    return 1
  fi
}

echo "📋 检查配置文件..."
check_file "playwright.config.ts" "pnpm run backend" "WebServer启动后端配置"
check_file "playwright.config.ts" "pnpm run dev" "WebServer启动前端配置"
check_file "playwright.config.ts" "120 \* 1000" "WebServer超时配置"
check_file "playwright.config.ts" "reducedMotion.*reduce" "禁用动画配置"
check_file "playwright.config.ts" "global-setup.ts" "全局Setup配置"
check_file "playwright.config.ts" "global-teardown.ts" "全局Teardown配置"

echo ""
echo "🌍 检查全局设置..."
check_file "tests/e2e/global-setup.ts" "process.env.TZ.*UTC" "UTC时区设置"
check_file "tests/e2e/global-setup.ts" "waitForServices" "服务就绪检测"
check_file "tests/e2e/global-setup.ts" "setupTestData" "测试数据准备"
check_file "tests/e2e/global-setup.ts" "AbortSignal.timeout" "API超时控制"

echo ""
echo "🧹 检查全局清理..."
check_file "tests/e2e/global-teardown.ts" "cleanupTestData" "数据清理功能"
check_file "tests/e2e/global-teardown.ts" "collectTestSummary" "结果摘要收集"

echo ""
echo "🔧 检查测试工具..."
check_file "tests/e2e/utils/test-utils.ts" "verifyDateFormat" "日期格式验证"
check_file "tests/e2e/utils/test-utils.ts" "formatDateYYYYMMDD" "日期格式化"
check_file "tests/e2e/utils/test-utils.ts" "getTodayYYYYMMDD" "UTC日期获取"

echo ""
echo "⚙️  检查测试Fixture..."
check_file "tests/e2e/fixtures.ts" "emulateMedia.*reducedMotion" "Fixture禁用动画"
check_file "tests/e2e/fixtures.ts" "pageErrors" "错误记录机制"
check_file "tests/e2e/fixtures.ts" "consoleErrors" "控制台错误记录"

echo ""
echo "🚀 检查CI工作流..."
check_file ".github/workflows/e2e.yml" "TZ=UTC" "CI时区设置"
check_file ".github/workflows/e2e.yml" "Start backend and frontend services" "CI服务启动步骤"
check_file ".github/workflows/e2e.yml" "Run E2E tests" "CI E2E测试步骤"
check_file ".github/workflows/e2e.yml" "Upload.*screenshots" "CI截图上传"
check_file ".github/workflows/e2e.yml" "Upload.*videos" "CI视频上传"
check_file ".github/workflows/e2e.yml" "Upload.*traces" "CI追踪上传"

echo ""
echo "📄 检查测试文件..."
check_file_exists "tests/e2e/connectivity.spec.ts" "连接性测试文件"
check_file_exists "tests/e2e/smoke/smoke.spec.ts" "冒烟测试文件"
check_file_exists "E2E_STABILITY_IMPROVEMENTS.md" "稳定性改进文档"

echo ""
echo "🎯 验证npm脚本..."
check_file "package.json" '"e2e".*playwright test' "e2e命令配置"
check_file "package.json" '"e2e:headed"' "e2e:headed命令"
check_file "package.json" '"e2e:debug"' "e2e:debug命令"
check_file "package.json" '"e2e:report"' "e2e:report命令"

echo ""
echo "════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ 所有检查通过！E2E设置已正确配置。${NC}"
  echo ""
  echo "📝 后续步骤："
  echo "  1. 本地测试: npm run e2e"
  echo "  2. 查看报告: npm run e2e:report"
  echo "  3. 调试测试: npm run e2e:debug"
  exit 0
else
  echo -e "${RED}❌ 发现 $ERRORS 个错误需要修复${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS 个警告${NC}"
  fi
  exit 1
fi
