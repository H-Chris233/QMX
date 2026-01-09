import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export interface Config {
  server: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
  };
  // PostgreSQL 配置 - 主数据库
  postgresql: {
    database_url?: string;
    poolSize: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
  // MongoDB 配置（保留用于历史数据迁移，已废弃）
  mongodb?: {
    uri?: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptSaltRounds: number;
  };
  logging: {
    level: string;
    file: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  upload: {
    maxFileSize: number;
    uploadPath: string;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  request: {
    bodyLimit: string;
  };
}

export const config: Config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:1420',
  },

  // PostgreSQL 配置 - 主数据库
  postgresql: {
    database_url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },

  // MongoDB 配置（保留用于历史数据迁移，已废弃）
  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.mongodburl || process.env.mongodb_uri,
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

  // 分页配置
  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10),
  },

  // 请求配置
  request: {
    bodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  },
};

// 验证必需的环境变量
export function validateConfig(): void {
  // 检查PostgreSQL连接必需的环境变量
  if (!config.postgresql.database_url) {
    throw new Error('DATABASE_URL is required for QMX to work. Setting examples:');
    console.error('');
    console.error('  # PostgreSQL (recommended):');
    console.error('  DATABASE_URL=postgresql://username:password@localhost:5432/qmx');
    console.error('');
    console.error('  # PostgreSQL with password:');
    console.error('  DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require');
    console.error('');
    console.error('  # Docker Compose PostgreSQL:');
    console.error('  DATABASE_URL=postgresql://qmx:qmx_password@postgres:5432/qmx');
    console.error('');
  }

  if (config.server.nodeEnv === 'production' && config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
}

// 获取PostgreSQL URL
export function getPostgreSQLUrl(): string {
  if (!config.postgresql.database_url) {
    throw new Error('DATABASE_URL is not configured');
  }
  return config.postgresql.database_url;
}