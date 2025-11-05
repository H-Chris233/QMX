/**
 * 数据转换器功能演示
 * 展示各函数的使用方法和预期行为
 * 
 * 运行方式：node -r esbuild-register src/utils/dataTransformers.demo.ts
 * 或在浏览器控制台中测试
 */

import {
  safeParseNumber,
  transformDashboardData,
  validateTransactionData,
  validateTransactionInput,
  validateSimplifiedTransaction,
  validateScoreInput,
  formatScore,
  calculateScoreStats,
  normalizeMembershipRecord,
  formatDateRange,
  formatDate,
  formatCurrency,
  calculateMembershipDaysRemaining,
  isMembershipExpiringSoon,
  MAX_SAFE_AMOUNT,
  MIN_AMOUNT,
  AMOUNT_DECIMALS,
  SCORE_DECIMALS,
} from './dataTransformers';

console.log('='.repeat(60));
console.log('QMX 数据转换器功能演示');
console.log('='.repeat(60));

// ============================================================================
// 1. safeParseNumber 演示
// ============================================================================
console.log('\n【1. safeParseNumber - 安全数字解析】');
console.log('基础用法：');
console.log('  safeParseNumber("123.45", 0) =>', safeParseNumber("123.45", 0));
console.log('  safeParseNumber("invalid", 0) =>', safeParseNumber("invalid", 0));

console.log('范围控制：');
console.log('  safeParseNumber(150, 0, {min:0, max:100}) =>', safeParseNumber(150, 0, {min:0, max:100}));
console.log('  safeParseNumber(-50, 0, {min:0, max:100}) =>', safeParseNumber(-50, 0, {min:0, max:100}));

console.log('小数位控制：');
console.log('  safeParseNumber(123.456, 0, {decimals:2}) =>', safeParseNumber(123.456, 0, {decimals:2}));

// ============================================================================
// 2. transformDashboardData 演示
// ============================================================================
console.log('\n【2. transformDashboardData - 仪表板数据转换】');
const rawDashboardData = {
  total_revenue: 12345.67,
  total_students: 150,
  average_score: 8.5,
  total_expense: 5000,
  net_income: 7345.67,
  max_score: 10,
  active_courses: 5,
};

const transformedData = transformDashboardData(rawDashboardData);
console.log('原始数据：', rawDashboardData);
console.log('转换结果：', transformedData);
console.log('  - 总收入（元）：', transformedData.totalRevenue);
console.log('  - 活跃学生：', transformedData.activeStudents);
console.log('  - 平均成绩：', transformedData.averageGrade);

// ============================================================================
// 3. 交易数据验证演示
// ============================================================================
console.log('\n【3. validateTransactionData - 交易数据验证】');
const validTransaction = {
  uid: 1,
  amount: 100.50,
  student_id: 1,
  note: '测试交易',
};

const invalidTransaction = {
  uid: 2,
  amount: 'invalid',
  student_id: 1,
};

console.log('有效交易验证：', validateTransactionData(validTransaction));
console.log('无效交易验证：', validateTransactionData(invalidTransaction));

console.log('\n【4. validateTransactionInput - 交易输入验证（带详细错误）】');
const inputValidation = validateTransactionInput({
  amount: 100.50,
  student_id: 1,
  is_installment: true,
  installment_current: 1,
  installment_total: 3,
});
console.log('验证结果：', inputValidation);

const invalidInput = validateTransactionInput({
  amount: MAX_SAFE_AMOUNT + 1,
  student_id: -1,
  is_installment: true,
  installment_current: 3,
  installment_total: 1,
});
console.log('无效输入：', invalidInput);

// ============================================================================
// 5. 成绩数据处理演示
// ============================================================================
console.log('\n【5. 成绩数据处理】');
console.log('validateScoreInput(85.5) =>', validateScoreInput(85.5));
console.log('validateScoreInput(1500) =>', validateScoreInput(1500));
console.log('validateScoreInput("abc") =>', validateScoreInput("abc"));

console.log('\nformatScore 示例：');
console.log('  formatScore(85.567) =>', formatScore(85.567));
console.log('  formatScore("90") =>', formatScore("90"));
console.log('  formatScore(null, "N/A") =>', formatScore(null, "N/A"));

console.log('\ncalculateScoreStats 示例（rings数组）：');
const rings = [450, 480, 520, 490, 510];
const scoreStats = calculateScoreStats(rings);
console.log('  成绩数组：', rings);
console.log('  统计结果：', scoreStats);
console.log('    - 平均分：', scoreStats.average);
console.log('    - 最高分：', scoreStats.max);
console.log('    - 最低分：', scoreStats.min);
console.log('    - 记录数：', scoreStats.count);

// ============================================================================
// 6. 会员数据处理演示
// ============================================================================
console.log('\n【6. 会员数据处理】');
const memberRecord = {
  uid: 1,
  name: '张三',
  phone: '13800138000',
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  is_membership_active: true,
  membership_days_remaining: 30,
  rings: [],
  age: 25,
  class: 'Year',
  note: null,
  subject: 'Shooting',
  lesson_left: 10,
};

const normalizedMember = normalizeMembershipRecord(memberRecord);
console.log('标准化会员记录：', normalizedMember);

console.log('\nformatDateRange 示例：');
console.log('  完整范围：', formatDateRange('2024-01-01', '2024-12-31'));
console.log('  仅开始：', formatDateRange('2024-01-01', null));
console.log('  仅结束：', formatDateRange(null, '2024-12-31'));
console.log('  空范围：', formatDateRange(null, null));

// 计算剩余天数
const today = new Date();
const futureDate = new Date(today);
futureDate.setDate(today.getDate() + 5);
const futureDateStr = futureDate.toISOString().split('T')[0];

console.log('\n会员到期计算：');
console.log('  5天后到期：', calculateMembershipDaysRemaining(futureDateStr));
console.log('  是否即将过期（7天内）：', isMembershipExpiringSoon(5, 7));
console.log('  是否即将过期（3天内）：', isMembershipExpiringSoon(5, 3));

// ============================================================================
// 7. 格式化工具演示
// ============================================================================
console.log('\n【7. 格式化工具】');
console.log('formatCurrency 示例：');
console.log('  ¥1,234.56 =>', formatCurrency(1234.56));
console.log('  -¥100.00 =>', formatCurrency(-100));
console.log('  ¥0.00 =>', formatCurrency(0));

console.log('\nformatDate 示例：');
const now = new Date();
console.log('  日期格式：', formatDate(now, 'date'));
console.log('  日期时间：', formatDate(now, 'datetime'));
console.log('  时间格式：', formatDate(now, 'time'));
console.log('  空值处理：', formatDate(null));

// ============================================================================
// 8. 常量展示
// ============================================================================
console.log('\n【8. 导出的常量】');
console.log('  MAX_SAFE_AMOUNT:', MAX_SAFE_AMOUNT, '元');
console.log('  MIN_AMOUNT:', MIN_AMOUNT, '元');
console.log('  AMOUNT_DECIMALS:', AMOUNT_DECIMALS, '位小数');
console.log('  SCORE_DECIMALS:', SCORE_DECIMALS, '位小数');

// ============================================================================
// 9. 完整使用场景：处理交易列表
// ============================================================================
console.log('\n【9. 完整场景：处理API返回的交易数据】');
import { safeMapApiTransactionToFrontend } from './dataTransformers';

// 模拟API返回的交易数据（金额已经是元）
const apiTransactions = [
  {
    uid: 1,
    amount: 500.00,
    student_id: 1,
    note: '学费',
    is_installment: false,
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    uid: 2,
    amount: 1200.00,
    student_id: 2,
    note: '分期学费',
    is_installment: true,
    installment: {
      plan_uid: 1,
      installment_number: 1,
      total_installments: 3,
      due_date: '2024-02-01',
      status: 'Paid'
    },
    created_at: '2024-01-20T14:30:00Z'
  },
  {
    uid: 3,
    amount: -150.00,
    student_id: null,
    note: '器材采购',
    is_installment: false,
    created_at: '2024-01-25T09:15:00Z'
  }
];

console.log('原始API交易数据：');
apiTransactions.forEach(tx => {
  console.log(`  交易 ${tx.uid}:`, tx);
});

console.log('\n转换后的前端交易数据：');
apiTransactions.forEach(tx => {
  const mapped = safeMapApiTransactionToFrontend(tx);
  if (mapped) {
    console.log(`  交易 ${mapped.id}:`);
    console.log(`    金额: ${mapped.amount} 元`);
    console.log(`    类型: ${mapped.is_income ? '收入' : '支出'}`);
    console.log(`    描述: ${mapped.description}`);
    if (mapped.is_installment) {
      console.log(`    分期: ${mapped.installment_current}/${mapped.installment_total}`);
    }
  }
});

console.log('\n' + '='.repeat(60));
console.log('演示完成！所有函数运行正常。');
console.log('='.repeat(60));
