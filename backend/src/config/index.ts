import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:1420',
  },

  // MongoDB 配置 - 唯一数据库
  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.mongodburl || process.env.mongodb_uri,
    options: {
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_TIMEOUT || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
      retryWrites: process.env.MONGO_RETRY_WRITES !== 'false',
      w: process.env.MONGO_WRITE_CONCERN || 'majority',
    },
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // 速率限制配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // 文件上传配置
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
};

// 验证必需的环境变量
export function validateConfig(): void {
  // 只检查MongoDB连接必需的环境变量
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI is required for QMX to work. Setting examples:');
    console.error('');
    console.error('  # MongoDB Atlas (recommended):');
    console.error('  MONGODB_URI=mongodb+srv://username:password@cluster_name.mongodb.net/qmx');
    console.error('');
    console.error('  # Local MongoDB:');
    console.error('  MONGODB_URI=mongodb://localhost:27017/qmx');
    console.error('');
    console.error('  # MongoDB Compass (local):');
    console.error('  MONGODB_URI=mongodb://admin:password@localhost:27017/qmx?authSource=admin');
    console.error('');
  }

  if (config.server.nodeEnv === 'production' && config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
}

// 获取数据库类型 - 只返回MongoDB
export function getDatabaseType(): 'mongodb' {
  return 'mongodb';
}

// 获取MongoDB URI
export function getMongoDBUri(): string {
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI is not configured');
  }
  return config.mongodb.uri;
}