import app from './app';
import { config, validateConfig } from './config';
import { connectDatabase } from './config/database';
import logger from './utils/logger';

// 验证配置
try {
  validateConfig();
} catch (error) {
  console.error('配置验证失败:', error);
  process.exit(1);
}

// 启动服务器
const startServer = async (): Promise<void> => {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动HTTP服务器
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 QMX后端服务启动成功`);
      logger.info(`📍 环境: ${config.server.nodeEnv}`);
      logger.info(`🌐 端口: ${config.server.port}`);
      logger.info(`🔗 健康检查: http://localhost:${config.server.port}/health`);
      logger.info(`📚 API文档: http://localhost:${config.server.port}/api/v1`);
    });

    // 优雅关闭处理
    const gracefulShutdown = (signal: string) => {
      logger.info(`收到${signal}信号，正在优雅关闭服务器...`);
      server.close(() => {
        logger.info('HTTP服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();