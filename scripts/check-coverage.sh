#!/bin/bash
# 检查前后端覆盖率脚本

set -e

echo "🧪 QMX 测试覆盖率检查"
echo "===================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 前端覆盖率
echo "📦 前端覆盖率测试..."
cd "$(dirname "$0")/.."
pnpm test:coverage > /tmp/frontend-coverage.log 2>&1 || true

if [ -f "coverage/coverage-summary.json" ]; then
  echo -e "${GREEN}✓${NC} 前端覆盖率报告已生成"
  
  # 提取覆盖率数据
  FRONTEND_STATEMENTS=$(jq -r '.total.statements.pct' coverage/coverage-summary.json)
  FRONTEND_BRANCHES=$(jq -r '.total.branches.pct' coverage/coverage-summary.json)
  FRONTEND_FUNCTIONS=$(jq -r '.total.functions.pct' coverage/coverage-summary.json)
  FRONTEND_LINES=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
  
  echo "  - Statements: ${FRONTEND_STATEMENTS}%"
  echo "  - Branches:   ${FRONTEND_BRANCHES}%"
  echo "  - Functions:  ${FRONTEND_FUNCTIONS}%"
  echo "  - Lines:      ${FRONTEND_LINES}%"
  
  # 检查是否达标
  if (( $(echo "$FRONTEND_STATEMENTS >= 25" | bc -l) )) && \
     (( $(echo "$FRONTEND_BRANCHES >= 75" | bc -l) )) && \
     (( $(echo "$FRONTEND_FUNCTIONS >= 50" | bc -l) )) && \
     (( $(echo "$FRONTEND_LINES >= 25" | bc -l) )); then
    echo -e "  ${GREEN}✓ 前端覆盖率达标${NC}"
  else
    echo -e "  ${YELLOW}⚠ 前端覆盖率未达标（目标: statements≥25%, branches≥75%, functions≥50%, lines≥25%）${NC}"
  fi
else
  echo -e "${RED}✗${NC} 前端覆盖率报告生成失败"
fi

echo ""

# 后端覆盖率
echo "📦 后端覆盖率测试..."
cd backend
npm test -- --coverage --maxWorkers=2 > /tmp/backend-coverage.log 2>&1 || true

if [ -f "coverage/coverage-summary.json" ]; then
  echo -e "${GREEN}✓${NC} 后端覆盖率报告已生成"
  
  # 提取覆盖率数据
  BACKEND_STATEMENTS=$(jq -r '.total.statements.pct' coverage/coverage-summary.json)
  BACKEND_BRANCHES=$(jq -r '.total.branches.pct' coverage/coverage-summary.json)
  BACKEND_FUNCTIONS=$(jq -r '.total.functions.pct' coverage/coverage-summary.json)
  BACKEND_LINES=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
  
  echo "  - Statements: ${BACKEND_STATEMENTS}%"
  echo "  - Branches:   ${BACKEND_BRANCHES}%"
  echo "  - Functions:  ${BACKEND_FUNCTIONS}%"
  echo "  - Lines:      ${BACKEND_LINES}%"
  
  # 检查是否达标
  if (( $(echo "$BACKEND_STATEMENTS >= 50" | bc -l) )) && \
     (( $(echo "$BACKEND_BRANCHES >= 40" | bc -l) )) && \
     (( $(echo "$BACKEND_FUNCTIONS >= 45" | bc -l) )) && \
     (( $(echo "$BACKEND_LINES >= 50" | bc -l) )); then
    echo -e "  ${GREEN}✓ 后端覆盖率达标${NC}"
  else
    echo -e "  ${YELLOW}⚠ 后端覆盖率未达标（目标: statements≥50%, branches≥40%, functions≥45%, lines≥50%）${NC}"
  fi
else
  echo -e "${RED}✗${NC} 后端覆盖率报告生成失败"
fi

cd ..
echo ""
echo "===================="
echo "📊 覆盖率检查完成"
echo ""
echo "查看详细报告:"
echo "  前端: open coverage/index.html"
echo "  后端: open backend/coverage/index.html"
echo ""
echo "查看完整日志:"
echo "  前端: cat /tmp/frontend-coverage.log"
echo "  后端: cat /tmp/backend-coverage.log"
