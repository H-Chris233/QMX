#!/bin/bash

# 验证端口冲突修复的脚本
# 运行多次并发测试，检查是否有端口冲突错误

echo "🔍 验证 MongoDB Memory Server 端口冲突修复..."
echo ""

RUNS=3
FAILURES=0

for i in $(seq 1 $RUNS); do
  echo "===== 运行 $i/$RUNS ====="
  
  # 运行并发测试
  OUTPUT=$(npm test -- --maxWorkers=3 --testPathPattern="counter|errorHandling" 2>&1)
  
  # 检查端口冲突错误
  if echo "$OUTPUT" | grep -iq "EADDRINUSE\|address already in use"; then
    echo "❌ 发现端口冲突错误！"
    FAILURES=$((FAILURES + 1))
  else
    echo "✅ 无端口冲突"
  fi
  
  # 提取测试结果
  if echo "$OUTPUT" | grep -q "Test Suites:.*passed"; then
    RESULT=$(echo "$OUTPUT" | grep "Test Suites:" | tail -1)
    echo "   $RESULT"
  fi
  
  echo ""
done

echo "=============================="
echo "验证完成: $RUNS 次运行"
echo "端口冲突次数: $FAILURES"
echo ""

if [ $FAILURES -eq 0 ]; then
  echo "✅ 端口冲突问题已完全修复！"
  exit 0
else
  echo "❌ 仍存在端口冲突问题"
  exit 1
fi
