import { Sequelize } from 'sequelize';
import { config } from '@/config';
import logger from '@/utils/logger';

export const sequelize = new Sequelize({
  dialect: config.database.type as 'sqlite' | 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.username,
  password: config.database.password,
  ...(config.database.type === 'sqlite' && {
    storage: config.database.sqlitePath,
  }),
  logging: (msg) => logger.debug(msg),
  
  // 连接池配置
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  
  // SQLite特有配置
  dialectOptions: config.database.type === 'sqlite' ? {
    foreignKeys: false,
  } : {},
  
  // 通用配置
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

// 数据库连接测试
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    if (config.server.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('数据库表结构同步完成');
    }
  } catch (error) {
    logger.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 数据库断开连接
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
};

// 优雅关闭处理
process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭应用...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭应用...');
  await disconnectDatabase();
  process.exit(0);
});

export default sequelize;