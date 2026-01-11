import type { Server } from 'http';
import app from './app';
import { config, validateConfig } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import logger from './utils/logger';

// 验证配置
try {
  validateConfig();
} catch (error) {
  logger.error('配置验证失败', error);
  process.exit(1);
}

let server: Server | null = null;

// 启动服务器
const startServer = async (): Promise<void> => {
  try {
    // 连接数据库
    await connectDatabase();

    // 启动HTTP服务器
    server = app.listen(config.server.port, () => {
      logger.info(`🚀 QMX后端服务启动成功`);
      logger.info(`📍 环境: ${config.server.nodeEnv}`);
      logger.info(`🌐 端口: ${config.server.port}`);
      logger.info(`🔗 健康检查: http://localhost:${config.server.port}/health`);
      logger.info(`📚 API文档: http://localhost:${config.server.port}/api/v1`);
    });

    const gracefulShutdown = (signal: NodeJS.Signals) => {
      logger.info(`收到${signal}信号，正在优雅关闭服务器...`);

      if (!server) {
        logger.warn('服务器实例未初始化，直接退出进程');
        process.exit(0);
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          logger.error('关闭HTTP服务器时出错:', closeError);
          process.exit(1);
          return;
        }

        logger.info('HTTP服务器已关闭');
        server = null;

        disconnectDatabase()
          .then(() => {
            logger.info('数据库连接已关闭');
            process.exit(0);
          })
          .catch((dbError) => {
            logger.error('关闭数据库连接时出错:', dbError);
            process.exit(1);
          });
      });
    };

    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();