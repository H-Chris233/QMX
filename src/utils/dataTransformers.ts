/**
 * 数据转换工具 - 占位实现
 * TODO: 实现实际的数据转换逻辑
 */

/**
 * 安全解析数字
 * @param value - 要解析的值
 * @param defaultValue - 默认值
 * @returns 解析后的数字或默认值
 */
export function safeParseNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * 安全映射 API 交易到前端
 * @param transaction - 交易数据
 * @returns 前端交易数据或 null
 */
export function safeMapApiTransactionToFrontend(transaction: unknown): unknown {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }
  return transaction;
}
