import { Sequelize } from 'sequelize';
import { config, getDatabaseType } from '@/config';
import { mongoManager } from '@/config/mongodb';
import logger from '@/utils/logger';

// 数据库连接实例
let sequelizeInstance: Sequelize;

// 初始化数据库连接
export const initDatabase = (): Sequelize => {
  const dbType = getDatabaseType();
  
  if (dbType === 'mongodb') {
    logger.info('使用 MongoDB 作为主数据库');
    // MongoDB 使用 Mongoose，这里返回一个 Sequelize 实例用于兼容性
    // 实际的 MongoDB 操作将通过 mongoose 进行
    sequelizeInstance = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    });
  } else {
    logger.info(`使用 ${dbType.toUpperCase()} 作为数据库`);
    sequelizeInstance = new Sequelize({
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
  }
  
  return sequelizeInstance;
};

// 导出 Sequelize 实例
export const sequelize = initDatabase();

// 数据库连接测试
export const connectDatabase = async (): Promise<void> => {
  const dbType = getDatabaseType();
  
  try {
    if (dbType === 'mongodb') {
      await mongoManager.connect();
      logger.info('MongoDB 连接成功');
      
      // 对于 MongoDB，我们不需要 Sequelize 的表结构同步
      // 但可以在这里初始化 MongoDB 的索引等
    } else {
      await sequelize.authenticate();
      logger.info(`${dbType} 数据库连接成功`);
      
      if (config.server.nodeEnv === 'development') {
        await sequelize.sync({ alter: true });
        logger.info('数据库表结构同步完成');
      }
    }
  } catch (error) {
    logger.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 数据库断开连接
export const disconnectDatabase = async (): Promise<void> => {
  try {
    const dbType = getDatabaseType();
    
    if (dbType === 'mongodb') {
      await mongoManager.disconnect();
    } else {
      await sequelize.close();
    }
    
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
};

// 获取当前数据库类型
export const getCurrentDatabaseType = (): string => {
  return getDatabaseType();
};

// 检查是否使用 MongoDB
export const isUsingMongoDB = (): boolean => {
  return getDatabaseType() === 'mongodb';
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