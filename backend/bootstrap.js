const path = require('path');
const Module = require('module');

// 创建自定义的require解析器
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // 替换 @/ 路径 - 指向dist目录！
  if (id.startsWith('@/')) {
    const relativePath = id.substring(2); // 去掉 @/
    const fullPath = path.join(__dirname, 'dist', relativePath);
    console.log(`🔄 路径映射: ${id} -> ${fullPath}`);
    return originalRequire.apply(this, [fullPath]);
  }

  return originalRequire.apply(this, arguments);
};

console.log('✅ 自定义路径映射已注册 (指向dist目录)');