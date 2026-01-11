import { redis } from './redis';
import logger from './logger';

/**
 * 缓存键前缀
 */
export const CacheKeys = {
  DASHBOARD_STATS: 'dashboard:stats',
  STUDENT_LIST: 'students:list',
  STUDENT_DETAIL: 'student:detail',
  FINANCIAL_STATS: 'financial:stats',
  MEMBERSHIP_ALERTS: 'membership:alerts',
} as const;

/**
 * 缓存TTL（秒）
 */
export const CacheTTL = {
  DASHBOARD_STATS: 5 * 60,      // 5分钟
  STUDENT_LIST: 3 * 60,         // 3分钟
  STUDENT_DETAIL: 10 * 60,      // 10分钟
  FINANCIAL_STATS: 10 * 60,     // 10分钟
  MEMBERSHIP_ALERTS: 15 * 60,   // 15分钟
} as const;

/**
 * 带缓存的数据获取包装器
 * @param cacheKey - 缓存键
 * @param fetchFn - 数据获取函数
 * @param ttl - 缓存过期时间（秒），默认5分钟
 * @param params - 缓存键参数（用于动态缓存键）
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300,
  params?: Record<string, any>
): Promise<T> {
  // 构建完整缓存键
  const fullKey = params
    ? `${cacheKey}:${JSON.stringify(params)}`
    : cacheKey;

  // 尝试从缓存获取
  try {
    const cached = await redis.get<T>(fullKey);
    if (cached !== null) {
      logger.debug('缓存命中', { key: fullKey });
      return cached;
    }
  } catch (error) {
    logger.error('缓存读取失败', { key: fullKey, error });
  }

  // 缓存未命中，执行数据获取
  logger.debug('缓存未命中，执行数据获取', { key: fullKey });
  const data = await fetchFn();

  // 写入缓存
  try {
    await redis.set(fullKey, data, ttl);
    logger.debug('数据已缓存', { key: fullKey, ttl });
  } catch (error) {
    logger.error('缓存写入失败', { key: fullKey, error });
  }

  return data;
}

/**
 * 使缓存失效
 * @param pattern - 缓存键或模式（支持通配符）
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    if (pattern.includes('*')) {
      const count = await redis.delPattern(pattern);
      logger.info('批量缓存失效', { pattern, count });
    } else {
      await redis.del(pattern);
      logger.info('缓存失效', { key: pattern });
    }
  } catch (error) {
    logger.error('缓存失效失败', { pattern, error });
  }
}

/**
 * 使所有学员相关缓存失效
 */
export async function invalidateStudentCache(studentId?: number): Promise<void> {
  if (studentId) {
    await invalidateCache(`${CacheKeys.STUDENT_DETAIL}:${studentId}`);
  }
  await invalidateCache(`${CacheKeys.STUDENT_LIST}:*`);
  await invalidateCache(CacheKeys.DASHBOARD_STATS);
  await invalidateCache(CacheKeys.MEMBERSHIP_ALERTS);
}

/**
 * 使所有财务相关缓存失效
 */
export async function invalidateFinancialCache(): Promise<void> {
  await invalidateCache(CacheKeys.FINANCIAL_STATS);
  await invalidateCache(CacheKeys.DASHBOARD_STATS);
}
