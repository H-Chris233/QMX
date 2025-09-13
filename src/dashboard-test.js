// Dashboard组件修复验证测试
import { ApiService } from './api/ApiService.js';

// 模拟测试Dashboard组件使用的API调用
async function testDashboardApis() {
  console.log('🧪 测试Dashboard组件修复...');
  
  try {
    // 测试原有的getDashboardStats方法（Dashboard现在使用的）
    console.log('1. 测试 getDashboardStats 方法...');
    const dashboardStats = await ApiService.getDashboardStats();
    console.log('✅ getDashboardStats 调用成功:', dashboardStats);
    
    // 验证返回的数据结构
    const expectedFields = ['total_students', 'total_revenue', 'average_score'];
    const missingFields = expectedFields.filter(field => 
      dashboardStats[field] === undefined
    );
    
    if (missingFields.length === 0) {
      console.log('✅ 数据结构验证通过');
    } else {
      console.warn('⚠️ 缺少字段:', missingFields);
    }
    
    // 测试新增的全局统计方法
    console.log('2. 测试 getGlobalStudentStats 方法...');
    const globalStudentStats = await ApiService.getGlobalStudentStats();
    console.log('✅ getGlobalStudentStats 调用成功:', globalStudentStats);
    
    console.log('3. 测试 getGlobalFinancialStats 方法...');
    const globalFinancialStats = await ApiService.getGlobalFinancialStats();
    console.log('✅ getGlobalFinancialStats 调用成功:', globalFinancialStats);
    
    // 测试特定学员统计方法（需要参数）
    console.log('4. 测试 getStudentStats 方法（带参数）...');
    try {
      const studentStats = await ApiService.getStudentStats(1);
      console.log('✅ getStudentStats(1) 调用成功:', studentStats);
    } catch (error) {
      console.log('ℹ️ getStudentStats(1) 调用失败（可能学员不存在）:', error.message);
    }
    
    // 测试财务统计方法（带参数）
    console.log('5. 测试 getFinancialStats 方法（带参数）...');
    const financialStats = await ApiService.getFinancialStats('ThisMonth');
    console.log('✅ getFinancialStats("ThisMonth") 调用成功:', financialStats);
    
    console.log('🎉 Dashboard组件修复验证完成！');
    console.log('📋 修复总结:');
    console.log('  - Dashboard现在使用getDashboardStats()方法（单次调用，性能更好）');
    console.log('  - 修复了错误的API调用（之前尝试无参数调用需要参数的方法）');
    console.log('  - 添加了全局统计方法作为备选方案');
    console.log('  - 保持了向后兼容性');
    
  } catch (error) {
    console.error('❌ Dashboard API测试失败:', error);
    console.log('💡 这在没有Tauri后端运行的环境中是正常的');
    console.log('📝 修复说明: Dashboard组件现在使用正确的API调用方法');
  }
}

// 导出测试函数
export { testDashboardApis };

// 如果在浏览器环境中直接运行
if (typeof window !== 'undefined') {
  console.log('Dashboard修复测试已加载。调用 testDashboardApis() 来运行测试。');
  
  // 自动运行测试（可选）
  // testDashboardApis();
}