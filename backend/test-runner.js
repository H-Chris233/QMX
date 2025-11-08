const { execSync } = require('child_process');

console.log('🧪 开始运行后端测试...');

try {
  // 运行一个简单的测试
  console.log('运行基础测试...');
  execSync('npx jest src/__tests__/counter-basic.spec.ts --verbose', { 
    stdio: 'inherit',
    timeout: 30000 
  });
  
  console.log('✅ 基础测试通过');
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}