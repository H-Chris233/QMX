#!/bin/bash

# 前端测试稳定性运行脚本
# 用于验证测试的稳定性和一致性

set -e

echo "🧪 开始前端测试稳定性验证..."

# 清理可能的缓存和临时文件
echo "🧹 清理测试环境..."
rm -rf node_modules/.vite
rm -rf coverage
rm -rf test-results

# 运行测试多次以验证稳定性
echo "🔄 运行测试稳定性验证 (3次)..."

for i in {1..3}; do
  echo "📊 第 $i 次测试运行..."
  
  if pnpm run test; then
    echo "✅ 第 $i 次测试通过"
  else
    echo "❌ 第 $i 次测试失败"
    exit 1
  fi
done

echo "🎉 所有测试运行都成功完成！"
echo "📈 测试稳定性验证通过"

# 生成测试报告
echo "📋 生成测试报告..."
pnpm run test -- --reporter=json > test-results/test-results.json 2>&1 || true

echo "✨ 测试稳定性验证完成！"