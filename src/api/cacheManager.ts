/**
 * API层统一缓存管理器
 * 负责所有API调用的缓存逻辑，避免在store中重复实现
 */
import type { ApiResponse } from '../types/api';

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// 缓存配置接口
interface CacheConfig {
  defaultExpiry: number;
  maxSize: number;
  customExpiry?: Record<string, number>;
}

/**
 * 统一的API缓存管理器
 */
export class ApiCacheManager {
  private cache = new Map<string, CacheItem<unknown>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultExpiry: 5 * 60 * 1000, // 默认5分钟
      maxSize: 100, // 最大缓存项数
      customExpiry: {},
      ...config
    };
  }

  /**
   * 生成缓存键
   */
  private generateKey(endpoint: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramStr}`;
  }

  /**
   * 获取缓存过期时间
   */
  private getExpiry(endpoint: string): number {
    return this.config.customExpiry?.[endpoint] || this.config.defaultExpiry;
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(item: CacheItem<unknown>): boolean {
    return Date.now() - item.timestamp > item.expiry;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清理最旧的缓存项（LRU策略）
   */
  private evictOldest(): void {
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 获取缓存数据
   */
  get<T>(endpoint: string, params?: Record<string, unknown>): T | null {
    const key = this.generateKey(endpoint, params);
    const item = this.cache.get(key);

    if (!item || this.isExpired(item)) {
      if (item) {
        this.cache.delete(key);
      }
      return null;
    }

    // 将访问的项移到最后（LRU）
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(endpoint: string, data: T, params?: Record<string, unknown>): void {
    this.cleanupExpired();
    this.evictOldest();

    const key = this.generateKey(endpoint, params);
    const expiry = this.getExpiry(endpoint);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  /**
   * 删除特定缓存
   */
  delete(endpoint: string, params?: Record<string, unknown>): boolean {
    const key = this.generateKey(endpoint, params);
    return this.cache.delete(key);
  }

  /**
   * 按端点前缀删除缓存（用于批量失效）
   */
  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: 实现命中率统计
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 刷新特定缓存（强制重新获取）
   */
  async refresh<T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    params?: Record<string, unknown>
  ): Promise<T> {
    // 删除现有缓存
    this.delete(endpoint, params);

    // 重新获取数据
    const data = await fetcher();

    // 设置新缓存
    this.set(endpoint, data, params);

    return data;
  }
}

/**
 * 全局缓存管理器实例
 */
export const apiCache = new ApiCacheManager({
  defaultExpiry: 5 * 60 * 1000, // 5分钟
  maxSize: 100,
  customExpiry: {
    // 学生数据相对稳定，缓存10分钟
    '/students': 10 * 60 * 1000,
    // 交易数据变化频繁，缓存2分钟
    '/transactions': 2 * 60 * 1000,
    // 统计数据按类型设置不同缓存时间
    '/stats/dashboard': 5 * 60 * 1000,
    '/stats/student': 10 * 60 * 1000,
    '/stats/financial': 3 * 60 * 1000,
    '/stats/membership': 15 * 60 * 1000,
  }
});

/**
 * 带缓存的API调用包装器
 */
export async function cachedApiCall<T>(
  endpoint: string,
  fetcher: () => Promise<T>,
  params?: Record<string, unknown>,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    // 尝试从缓存获取
    const cached = apiCache.get<T>(endpoint, params);
    if (cached !== null) {
      return cached;
    }
  }

  // 缓存未命中或强制刷新，调用API
  try {
    const data = await fetcher();
    apiCache.set(endpoint, data, params);
    return data;
  } catch (error) {
    // 如果API调用失败，尝试返回过期的缓存数据
    if (!forceRefresh) {
      const expiredData = apiCache.get<T>(endpoint, params);
      if (expiredData !== null) {
        console.warn('API调用失败，返回过期缓存数据:', error);
        return expiredData;
      }
    }
    throw error;
  }
}