const { setupTestDatabase, TestDataFactory, createTestApp } = require('./test/setupBackend.ts');

async function debugTest() {
  try {
    console.log('1. 设置测试数据库...');
    await setupTestDatabase();

    console.log('2. 创建测试应用...');
    const app = await createTestApp();

    console.log('3. 创建测试学生...');
    const student = await TestDataFactory.createStudent({ name: 'Debug Student' });
    console.log('创建的学生:', student);

    console.log('4. 测试API调用...');
    const response = await request(app)
      .get('/api/v1/students')
      .expect(200);

    console.log('API响应:', response.body);

    console.log('5. 清理...');
    // 这里应该有清理代码

  } catch (error) {
    console.error('调试测试失败:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugTest();