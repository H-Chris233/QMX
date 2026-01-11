import Redis, { RedisOptions } from 'ioredis';
import { config } from '@/config';
import logger from './logger';

/**
 * Redis 客户端单例
 * 用于缓存热点数据，提升API性能
 */
class RedisClient {
  private client: Redis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.isEnabled = config.redis.enabled;
  }

  /**
   * 连接 Redis
   */
  async connect(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Redis 缓存已禁用（配置: REDIS_ENABLED=false）');
      return;
    }

    try {
      const options: RedisOptions = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      };

      this.client = new Redis(options);

      // 连接事件
      this.client.on('connect', () => {
        logger.info('Redis 连接成功');
      });

      this.client.on('error', (err: Error) => {
        logger.error('Redis 错误:', err);
      });

      this.client.on('close', () => {
        logger.warn('Redis 连接关闭');
      });

      // 尝试连接
      await this.client.connect();
    } catch (error) {
      logger.error('Redis 连接失败，缓存功能将被禁用:', error);
      this.isEnabled = false;
      this.client = null;
    }
  }

  /**
   * 断开 Redis 连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Redis GET 错误:', { key, error });
      return null;
    }
  }

  /**
   * 设置缓存（带过期时间，单位：秒）
   */
  async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Redis SET 错误:', { key, error });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const keys = Array.isArray(key) ? key : [key];
      await this.client.del(...keys);
      return true;
    } catch (error) {
      logger.error('Redis DEL 错误:', { key, error });
      return false;
    }
  }

  /**
   * 批量删除（按模式）
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error('Redis DEL_PATTERN 错误:', { pattern, error });
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS 错误:', { key, error });
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE 错误:', { key, error });
      return false;
    }
  }

  /**
   * 获取剩余过期时间（秒）
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return -2;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL 错误:', { key, error });
      return -2;
    }
  }

  /**
   * 清空所有缓存（慎用）
   */
  async flushAll(): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      await this.client.flushdb();
      logger.warn('Redis 数据库已清空');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL 错误:', error);
      return false;
    }
  }

  /**
   * 获取 Redis 状态
   */
  getStatus(): { enabled: boolean; connected: boolean } {
    return {
      enabled: this.isEnabled,
      connected: this.client?.status === 'ready',
    };
  }
}

// 导出单例
export const redis = new RedisClient();
export default redis;
