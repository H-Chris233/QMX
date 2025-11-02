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

  // 数据库配置
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'qmx_db',
    username: process.env.DB_USER || 'qmx_user',
    password: process.env.DB_PASSWORD || 'qmx_password',
    sqlitePath: process.env.SQLITE_PATH || './data/qmx.db',
  },

  // MongoDB 云数据库配置
  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.mongodburl || process.env.mongodb_uri,
    enabled: process.env.MONGODB_ENABLED === 'true' || !!(process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.mongodburl || process.env.mongodb_uri),
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
  const requiredVars = ['JWT_SECRET'];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  if (config.server.nodeEnv === 'production' && config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }

  // 如果启用了MongoDB，验证MongoDB配置
  if (config.mongodb.enabled && !config.mongodb.uri) {
    throw new Error('MongoDB is enabled but MONGODB_URI is not provided');
  }
}

// 获取数据库类型
export function getDatabaseType(): 'sqlite' | 'postgresql' | 'mongodb' {
  if (config.mongodb.enabled) {
    return 'mongodb';
  }
  return config.database.type as 'sqlite' | 'postgresql';
}

// 获取数据库连接字符串
export function getDatabaseUrl(): string {
  if (config.mongodb.enabled && config.mongodb.uri) {
    return config.mongodb.uri;
  }
  
  if (config.database.type === 'postgresql') {
    return `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
  }
  
  return config.database.sqlitePath;
}