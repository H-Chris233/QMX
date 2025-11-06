[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **config**

# 配置管理模块

## 变更记录 (Changelog)

### 2025-11-06T11:37:40+0000
- 补扫配置管理机制，发现企业级配置架构
- 分析分层配置设计和环境变量验证
- 评估配置管理成熟度为优秀

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录配置架构和环境变量管理

---

## 模块职责

应用程序配置管理，环境变量处理、数据库连接和全局设置。确保不同环境的配置隔离和验证。

**核心价值**：
- 环境配置隔离
- 配置验证和默认值
- 数据库连接管理
- 安全配置保护

## 入口与启动

**核心配置文件**：
- `index.ts` - 主配置入口和验证
- `database.ts` - 数据库配置
- `mongodb.ts` - MongoDB连接管理

## 对外接口

### 主配置模块

**index.ts** - 配置中心
```typescript
// 主要功能：
- config                    // 配置对象导出
- validateConfig()          // 配置验证
- loadEnvironmentConfig()   // 环境配置加载
- getDatabaseConfig()       // 数据库配置获取

// 配置结构：
interface Config {
  server: {
    port: number;
    nodeEnv: string;
    corsOrigin: string[];
    logLevel: string;
  };
  database: {
    mongodb: {
      uri: string;
      dbName: string;
      options: MongoOptions;
    };
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };
  features: {
    enableRegistration: boolean;
    enableEmailVerification: boolean;
    maxLoginAttempts: number;
  };
}
```

**database.ts** - 数据库配置
```typescript
// 主要功能：
- databaseConfig            // 数据库配置对象
- validateDatabaseConfig()  // 数据库配置验证
- getConnectionString()     // 连接字符串构建

// 数据库选项：
interface DatabaseConfig {
  type: 'mongodb';
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl: boolean;
  poolSize: number;
  connectionTimeout: number;
}
```

**mongodb.ts** - MongoDB连接管理
```typescript
// 主要功能：
- mongoManager              // MongoDB管理器实例
- connectDatabase()         // 建立数据库连接
- disconnectDatabase()      // 断开数据库连接
- checkHealth()             // 健康检查
- createIndexes()           // 创建索引

// 连接管理：
class MongoManager {
  private connection: mongoose.Connection | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  checkHealth(): Promise<HealthStatus>;
}
```

## 关键依赖与配置

### 环境变量定义
```bash
# 服务器配置
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:1420
LOG_LEVEL=info

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/qmx
MONGODB_DB_NAME=qmx
MONGODB_MAX_POOL_SIZE=10

# 安全配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# 功能开关
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=false
MAX_LOGIN_ATTEMPTS=5
```

### 配置验证规则
```typescript
// 使用Joi进行配置验证
const configSchema = Joi.object({
  server: Joi.object({
    port: Joi.number().port().default(3001),
    nodeEnv: Joi.string().valid('development', 'production', 'test').default('development'),
    corsOrigin: Joi.array().items(Joi.string()).default(['http://localhost:1420']),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
  }).required(),

  database: Joi.object({
    mongodb: Joi.object({
      uri: Joi.string().required(),
      dbName: Joi.string().required(),
      options: Joi.object({
        maxPoolSize: Joi.number().integer().min(1).default(10),
        serverSelectionTimeoutMS: Joi.number().integer().min(1000).default(5000),
        connectTimeoutMS: Joi.number().integer().min(1000).default(10000)
      })
    }).required()
  }).required()
});
```

### 环境特定配置
```typescript
// 开发环境配置
const developmentConfig = {
  server: {
    port: 3001,
    nodeEnv: 'development',
    corsOrigin: ['http://localhost:1420'],
    logLevel: 'debug'
  },
  database: {
    mongodb: {
      uri: 'mongodb://localhost:27017/qmx_dev',
      dbName: 'qmx_dev'
    }
  }
};

// 生产环境配置
const productionConfig = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: 'production',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || [],
    logLevel: 'info'
  },
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI!,
      dbName: process.env.MONGODB_DB_NAME!
    }
  }
};
```

## 配置管理深度分析 - 优秀成熟度

**分层配置架构**：
```
Environment Variables (环境变量)
    ↓
Default Values (默认值)
    ↓
Environment-specific Config (环境特定配置)
    ↓
Validation (配置验证)
    ↓
Final Config Object (最终配置对象)
```

**配置管理机制评估 - 优秀**：

**多层配置验证机制**：
```typescript
// 启动时配置验证
export function validateConfig(): void {
  // 必需环境变量检查
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI is required for QMX to work. Setting examples:');
    // 详细的配置示例和错误提示
  }

  // 生产环境安全检查
  if (config.server.nodeEnv === 'production' &&
      config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
}
```

**MongoDB连接管理** - 企业级实现：
```typescript
class MongoConnectionManager {
  private isConnected = false;

  async connect(): Promise<void> {
    const { uri, options } = getMongoConfig();

    // 专业级连接选项
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10, // 连接池管理
      serverSelectionTimeoutMS: 5000, // 超时控制
      socketTimeoutMS: 45000, // Socket超时
      bufferCommands: false, // 禁用缓冲
      retryWrites: true, // 重试机制
      w: 'majority', // 写入确认级别
    };

    // 连接事件监听
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB连接错误:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB重新连接成功');
      this.isConnected = true;
    });
  }

  // 健康检查功能
  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', details: { state: this.getConnectionState() } };
      }

      // 执行数据库ping操作
      await mongoose.connection.db.admin().ping();

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
      return { status: 'error', details: { error: error.message } };
    }
  }
}
```

**安全配置保护**：
```typescript
// 敏感信息保护
logger.info(`🔄 正在连接MongoDB: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);

// 生产环境强制检查
if (config.server.nodeEnv === 'production' && config.security.jwtSecret === 'default') {
  throw new Error('JWT_SECRET must be changed in production');
}

// 配置覆盖机制
const uri = process.env.MONGODB_URI ||
             process.env.MONGODB_URL ||
             process.env.mongodburl ||
             process.env.mongodb_uri;
```

**配置文件结构**：
- ✅ **.env.example** - 完整的配置模板
- ✅ **环境特定配置** - 开发/测试/生产环境分离
- ✅ **类型安全** - TypeScript接口定义
- ✅ **默认值处理** - 智能回退机制
- ✅ **验证规则** - 启动时验证

**发现的专业特性**：
- ✅ **连接池管理** - 10个连接的最大池大小
- ✅ **超时控制** - 服务器选择和Socket超时
- ✅ **重试机制** - 写入操作自动重试
- ✅ **健康检查** - 实时连接状态监控
- ✅ **事件监听** - 完整的连接生命周期管理
- ✅ **错误日志** - 敏感信息脱敏处理

**配置加载流程**：
```typescript
const loadConfiguration = (): Config => {
  // 1. 加载环境变量 (dotenv.config())
  const envVars = process.env;

  // 2. 设置智能默认值
  const defaultConfig = getDefaultConfig();

  // 3. 多种环境变量名称支持
  const mongoUri = envVars.MONGODB_URI ||
                   envVars.MONGODB_URL ||
                   envVars.mongodburl ||
                   envVars.mongodb_uri;

  // 4. 类型转换和验证
  const port = parseInt(envVars.PORT || '3001', 10);

  // 5. 配置验证
  validateConfig();
};
```

## 配置架构设计

### 分层配置

### 配置加载流程
```typescript
const loadConfiguration = (): Config => {
  // 1. 加载环境变量
  const envVars = process.env;

  // 2. 设置默认值
  const defaultConfig = getDefaultConfig();

  // 3. 合并环境特定配置
  const envConfig = getEnvironmentConfig(envVars.NODE_ENV);

  // 4. 合并所有配置
  const rawConfig = mergeConfig(defaultConfig, envConfig, envVars);

  // 5. 验证配置
  const { error, value } = configSchema.validate(rawConfig);
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }

  return value as Config;
};
```

### 数据库连接管理
```typescript
class MongoManager {
  private static instance: MongoManager;
  private connection: mongoose.Connection | null = null;

  static getInstance(): MongoManager {
    if (!MongoManager.instance) {
      MongoManager.instance = new MongoManager();
    }
    return MongoManager.instance;
  }

  async connect(): Promise<void> {
    try {
      const options = {
        maxPoolSize: config.database.mongodb.options.maxPoolSize,
        serverSelectionTimeoutMS: config.database.mongodb.options.serverSelectionTimeoutMS,
        connectTimeoutMS: config.database.mongodb.options.connectTimeoutMS
      };

      await mongoose.connect(config.database.mongodb.uri, options);
      this.connection = mongoose.connection;

      // 监听连接事件
      this.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      this.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      this.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
}
```

## 测试与质量

### 配置测试
- **验证测试**: 配置验证规则测试
- **环境测试**: 不同环境配置测试
- **连接测试**: 数据库连接测试

### 代码质量
- TypeScript类型定义
- 配置验证和默认值
- 错误处理机制
- 敏感信息保护

### 安全措施
- 环境变量加密
- 敏感配置不从git提交
- 配置访问权限控制
- 配置变更审计

## 常见问题 (FAQ)

**Q: 如何添加新的配置项？**
A:
1. 在环境变量中定义新变量
2. 在配置Schema中添加验证规则
3. 在Config接口中添加类型定义
4. 设置合适的默认值

**Q: 如何管理敏感配置？**
A:
1. 使用环境变量存储敏感信息
2. 不要在代码中硬编码敏感值
3. 使用加密存储生产环境密钥
4. 限制配置文件访问权限

**Q: 数据库连接失败怎么办？**
A:
1. 检查连接字符串是否正确
2. 确认MongoDB服务是否运行
3. 验证网络连接和防火墙设置
4. 查看详细的错误日志

**Q: 如何在不同环境使用不同配置？**
A:
1. 使用NODE_ENV区分环境
2. 为每个环境创建配置对象
3. 使用环境变量覆盖配置
4. 实现配置加载逻辑

## 配置使用示例

### 获取配置
```typescript
import { config } from '@/config';

// 在应用中使用配置
const server = app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
  console.log(`Environment: ${config.server.nodeEnv}`);
});

// 数据库连接
await connectDatabase();
```

### 配置验证
```typescript
import { validateConfig } from '@/config';

// 应用启动时验证配置
try {
  validateConfig();
  console.log('Configuration validated successfully');
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}
```

### 数据库健康检查
```typescript
import { mongoManager } from '@/config/mongodb';

// API健康检查端点
app.get('/health/db', async (req, res) => {
  try {
    const health = await mongoManager.checkHealth();
    res.json({
      success: true,
      data: {
        database_type: 'mongodb',
        connection_status: health.status,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database health check failed'
    });
  }
});
```

## 相关文件清单

```
backend/src/config/
├── index.ts              # 主配置入口
├── database.ts           # 数据库配置
└── mongodb.ts            # MongoDB连接管理
```

## 配置架构图

```
┌─────────────────────────────────────────┐
│        Environment Variables            │
│  (MONGODB_URI, JWT_SECRET, NODE_ENV...) │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│          Configuration Loader           │
│  ┌─────────────────────────────────────┐ │
│  │        Default Values              │ │
│  │     (Port: 3001, Development...)    │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │    Environment-specific Config     │ │
│  │      (dev/staging/prod)            │ │
│  └─────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│          Configuration Validator        │
│         (Joi Schema Validation)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Final Config Object           │
│  ┌─────────────┬─────────────────────┐  │
│  │   Server    │     Database        │  │
│  │  Config     │      Config         │  │
│  └─────────────┴─────────────────────┘  │
│  ┌─────────────┬─────────────────────┐  │
│  │  Security   │      Features       │  │
│  │  Config     │      Config         │  │
│  └─────────────┴─────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Application Usage             │
│    (Express App, Database Connect)      │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000