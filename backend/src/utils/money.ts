/**
 * 后端金额工具模块
 * 
 * 规范：
 * - 数据库存储使用"分"（整数）
 * - API 输入/输出可以是"元"或"分"，需明确标注
 * - 内部计算统一使用"分"
 * - 舍入规则：四舍五入到分
 */

/**
 * 分到元的转换比率
 */
export const CENTS_TO_YUAN_RATIO = 100;

/**
 * 金额显示小数位数
 */
export const AMOUNT_DECIMALS = 2;

/**
 * 最大安全金额（单位：元）
 */
export const MAX_SAFE_AMOUNT_YUAN = 999999999999;

/**
 * 最小安全金额（单位：元）
 */
export const MIN_SAFE_AMOUNT_YUAN = -999999999999;

/**
 * 将元转换为分
 * @param yuan - 金额（元），可以是数字或字符串
 * @returns 金额（分）
 */
export function yuanToCents(yuan: number | string): number {
  const numeric = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  
  if (!Number.isFinite(numeric)) {
    throw new Error('Invalid amount: must be a finite number');
  }
  
  if (numeric > MAX_SAFE_AMOUNT_YUAN || numeric < MIN_SAFE_AMOUNT_YUAN) {
    throw new Error(`Amount out of safe range: ${numeric}`);
  }
  
  return Math.round(numeric * CENTS_TO_YUAN_RATIO);
}

/**
 * 将分转换为元
 * @param cents - 金额（分）
 * @returns 金额（元）
 */
export function centsToYuan(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new Error('Invalid cents: must be a finite number');
  }
  
  return cents / CENTS_TO_YUAN_RATIO;
}

/**
 * 格式化金额为字符串（两位小数）
 * @param cents - 金额（分）
 * @returns 格式化的金额字符串
 */
export function formatMoney(cents: number): string {
  const yuan = centsToYuan(cents);
  return yuan.toFixed(AMOUNT_DECIMALS);
}

/**
 * 验证金额是否有效
 * @param value - 待验证的值
 * @returns 是否有效
 */
export function isValidAmount(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && 
           value >= MIN_SAFE_AMOUNT_YUAN && 
           value <= MAX_SAFE_AMOUNT_YUAN;
  }
  
  if (typeof value === 'string') {
    const numeric = parseFloat(value);
    return !Number.isNaN(numeric) && 
           numeric >= MIN_SAFE_AMOUNT_YUAN && 
           numeric <= MAX_SAFE_AMOUNT_YUAN;
  }
  
  return false;
}

/**
 * 金额加法（分）
 * @param cents1 - 金额1（分）
 * @param cents2 - 金额2（分）
 * @returns 相加结果（分）
 */
export function addMoney(cents1: number, cents2: number): number {
  if (!Number.isFinite(cents1) || !Number.isFinite(cents2)) {
    throw new Error('Invalid amounts for addition');
  }
  return cents1 + cents2;
}

/**
 * 金额减法（分）
 * @param cents1 - 金额1（分）
 * @param cents2 - 金额2（分）
 * @returns 相减结果（分）
 */
export function subtractMoney(cents1: number, cents2: number): number {
  if (!Number.isFinite(cents1) || !Number.isFinite(cents2)) {
    throw new Error('Invalid amounts for subtraction');
  }
  return cents1 - cents2;
}

/**
 * 金额乘法（分）
 * @param cents - 金额（分）
 * @param multiplier - 乘数
 * @returns 相乘结果（分）
 */
export function multiplyMoney(cents: number, multiplier: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(multiplier)) {
    throw new Error('Invalid values for multiplication');
  }
  return Math.round(cents * multiplier);
}

/**
 * 金额除法（分）
 * @param cents - 金额（分）
 * @param divisor - 除数
 * @returns 相除结果（分，四舍五入）
 */
export function divideMoney(cents: number, divisor: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(divisor)) {
    throw new Error('Invalid values for division');
  }
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }
  return Math.round(cents / divisor);
}

/**
 * 比较两个金额
 * @param cents1 - 金额1（分）
 * @param cents2 - 金额2（分）
 * @returns 比较结果 (-1: cents1 < cents2, 0: 相等, 1: cents1 > cents2)
 */
export function compareMoney(cents1: number, cents2: number): number {
  if (!Number.isFinite(cents1) || !Number.isFinite(cents2)) {
    throw new Error('Invalid amounts for comparison');
  }
  
  if (cents1 < cents2) return -1;
  if (cents1 > cents2) return 1;
  return 0;
}
