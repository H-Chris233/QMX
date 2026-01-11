#!/bin/bash
# 批量移除console.log/console.error，替换为logger或删除

echo "🧹 清理 console 调用..."

# 后端：替换 console.error 为 logger.error
sed -i "s/console\.error('PostgreSQL 连接成功:', result\.rows\[0\]\.now);/logger.info('PostgreSQL 连接成功', { timestamp: result.rows[0].now });/g" backend/src/db/index.ts
sed -i "s/console\.error('❌ PostgreSQL 连接失败:', error);/logger.error('PostgreSQL 连接失败', error);/g" backend/src/db/index.ts
sed -i "s/console\.log('✅ 数据库连接已关闭');/logger.info('数据库连接已关闭');/g" backend/src/db/index.ts

# backend/src/index.ts
sed -i "s/console\.error('配置验证失败:', error);/logger.error('配置验证失败', error);/g" backend/src/index.ts

# 前端组件：删除或简化console
sed -i "s/console\.error('搜索学员失败:', error);/\/\/ 错误已由errorHandler统一处理/g" src/components/StudentManagement.vue
sed -i "s/console\.error('复制失败', err);/\/\/ 复制失败静默处理/g" src/components/ErrorModal.vue
sed -i "s/console\.warn('API调用失败，返回过期缓存数据:', error);/\/\/ 返回过期缓存数据，错误已由拦截器记录/g" src/api/cacheManager.ts

echo "✅ console 调用清理完成"
