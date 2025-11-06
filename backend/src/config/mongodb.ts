import mongoose from 'mongoose';
import logger from '@/utils/logger';

// MongoDB连接配置
export interface MongoConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// 获取MongoDB配置
export function getMongoConfig(): MongoConfig {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL ||
    process.env.mongodburl || process.env.mongodb_uri;

  if (!uri) {
    throw new Error('❌ MongoDB连接URI未找到！请设置环境变量：MONGODB_URI 或 MONGODB_URL');
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10, // 连接池最大连接数
    serverSelectionTimeoutMS: 10000, // 服务器选择超时 (增加到10秒)
    socketTimeoutMS: 60000, // Socket超时 (增加到60秒)
    connectTimeoutMS: 15000, // 连接超时 (增加到15秒)
    bufferCommands: false, // 禁用mongoose缓冲
    retryWrites: true, // 启用重试写入
    w: 'majority', // 写入确认
    maxIdleTimeMS: 30000, // 连接空闲超时
    heartbeatFrequencyMS: 10000, // 心跳频率
    family: 4, // 强制使用IPv4
  };

  return { uri, options };
}

// MongoDB连接管理
class MongoConnectionManager {
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('MongoDB已连接，跳过重复连接');
        return;
      }

      const { uri, options } = getMongoConfig();

      logger.info(`🔄 正在连接MongoDB: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);

      await mongoose.connect(uri, options);

      this.isConnected = true;
      logger.info('✅ MongoDB连接成功！');

      // 监听连接事件
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB连接错误:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB连接断开');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB重新连接成功');
        this.isConnected = true;
      });

    } catch (error) {
      this.isConnected = false;
      logger.error('❌ MongoDB连接失败:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('MongoDB未连接，跳过断开连接');
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB连接已断开');

    } catch (error) {
      logger.error('❌ MongoDB断开连接失败:', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  getConnectionState(): string {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState] || 'unknown';
  }

  // 健康检查方法
  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', details: { state: this.getConnectionState() } };
      }

      // 执行简单的ping操作
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      } else {
        throw new Error('MongoDB连接尚未建立');
      }

      return {
        status: 'healthy',
        details: {
          state: this.getConnectionState(),
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          state: this.getConnectionState(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// 导出单例实例
export const mongoManager = new MongoConnectionManager();

// 兼容性导出
export default {
  connect: () => mongoManager.connect(),
  disconnect: () => mongoManager.disconnect(),
  getStatus: () => mongoManager.getConnectionStatus(),
  getState: () => mongoManager.getConnectionState(),
  checkHealth: () => mongoManager.checkHealth(),
};