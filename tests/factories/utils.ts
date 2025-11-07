/**
 * 测试工具函数
 * 提供金额、日期、ID生成等通用功能
 */

/**
 * 将元转换为分
 * @param yuan - 金额（元）
 * @returns 金额（分）
 * @example
 * yuanToCents(100.50) // => 10050
 * yuanToCents("100.50") // => 10050
 */
export function yuanToCents(yuan: number | string): number {
  const numeric = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  if (!Number.isFinite(numeric)) {
    throw new Error('Invalid amount: must be a finite number');
  }
  return Math.round(numeric * 100);
}

/**
 * 将分转换为元
 * @param cents - 金额（分）
 * @returns 金额（元）
 * @example
 * centsToYuan(10050) // => 100.50
 */
export function centsToYuan(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new Error('Invalid cents: must be a finite number');
  }
  return cents / 100;
}

/**
 * ISO 8601日期转YYYY-MM-DD格式
 * @param isoDate - ISO格式日期字符串或Date对象
 * @returns YYYY-MM-DD格式字符串
 * @example
 * isoToYYYYMMDD("2024-01-15T10:30:00Z") // => "2024-01-15"
 * isoToYYYYMMDD(new Date("2024-01-15")) // => "2024-01-15"
 */
export function isoToYYYYMMDD(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date.toISOString().split('T')[0];
}

/**
 * YYYY-MM-DD格式转ISO 8601日期
 * @param dateStr - YYYY-MM-DD格式字符串
 * @returns ISO格式日期字符串
 * @example
 * yyyymmddToISO("2024-01-15") // => "2024-01-15T00:00:00.000Z"
 */
export function yyyymmddToISO(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date format: expected YYYY-MM-DD');
  }
  return date.toISOString();
}

/**
 * 生成伪MongoDB ObjectId字符串
 * @returns 24位十六进制字符串
 * @example
 * generateObjectId() // => "507f1f77bcf86cd799439011"
 */
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Math.random().toString(16).substring(2, 18).padStart(16, '0');
  return timestamp + random;
}

/**
 * 生成指定范围内的随机整数
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @returns 随机整数
 * @example
 * randomInt(1, 10) // => 7
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成指定范围内的随机浮点数
 * @param min - 最小值
 * @param max - 最大值
 * @param decimals - 小数位数（默认2）
 * @returns 随机浮点数
 * @example
 * randomFloat(10, 100, 2) // => 45.67
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * 从数组中随机选择一个元素
 * @param array - 源数组
 * @returns 随机元素
 * @example
 * randomPick(['a', 'b', 'c']) // => 'b'
 */
export function randomPick<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return array[randomInt(0, array.length - 1)];
}

/**
 * 生成指定日期偏移天数的日期
 * @param date - 基准日期
 * @param days - 偏移天数（正数为未来，负数为过去）
 * @returns 新的Date对象
 * @example
 * addDays(new Date('2024-01-15'), 7) // => Date('2024-01-22')
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 生成指定日期偏移月数的日期
 * @param date - 基准日期
 * @param months - 偏移月数
 * @returns 新的Date对象
 * @example
 * addMonths(new Date('2024-01-15'), 3) // => Date('2024-04-15')
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 格式化为测试用的data-testid选择器
 * @param testId - 测试ID
 * @returns data-testid选择器字符串
 * @example
 * testId("submit-button") // => "[data-testid='submit-button']"
 */
export function testId(testId: string): string {
  return `[data-testid='${testId}']`;
}

/**
 * 生成随机的中文姓名
 * @returns 随机姓名
 * @example
 * randomChineseName() // => "张三"
 */
export function randomChineseName(): string {
  const surnames = ['张', '王', '李', '刘', '陈', '杨', '黄', '赵', '周', '吴'];
  const givenNames = ['明', '华', '伟', '强', '芳', '娜', '静', '丽', '峰', '磊', '洋', '勇'];
  
  const surname = randomPick(surnames);
  const givenName = randomPick(givenNames) + (Math.random() > 0.5 ? randomPick(givenNames) : '');
  
  return surname + givenName;
}

/**
 * 生成随机的手机号码
 * @returns 11位手机号
 * @example
 * randomPhoneNumber() // => "13812345678"
 */
export function randomPhoneNumber(): string {
  const prefixes = ['138', '139', '158', '159', '188', '189'];
  const prefix = randomPick(prefixes);
  const suffix = String(randomInt(10000000, 99999999));
  return prefix + suffix;
}

/**
 * 生成随机的电子邮箱
 * @param domain - 邮箱域名（默认example.com）
 * @returns 邮箱地址
 * @example
 * randomEmail() // => "user12345@example.com"
 */
export function randomEmail(domain: string = 'example.com'): string {
  const user = 'user' + randomInt(10000, 99999);
  return `${user}@${domain}`;
}
