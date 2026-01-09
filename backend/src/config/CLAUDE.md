[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **config**

# 配置管理模块

## 变更记录 (Changelog)

### 2026-01-09 - PostgreSQL迁移完成
- 完成从MongoDB到PostgreSQL的配置迁移
- 移除MongoDB连接管理，保留URI仅用于历史数据迁移
- 采用PostgreSQL连接池（pg + Drizzle ORM）
- 添加指数退避重连机制
- 更新环境变量配置为DATABASE_URL

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
- PostgreSQL连接池管理
- 安全配置保护

## 入口与启动

**核心配置文件**：
- `index.ts` - 主配置入口和验证
- `database.ts` - PostgreSQL连接管理

## 对外接口

### 主配置模块

**index.ts** - 配置中心
```typescript
// 主要功能：
- config                    // 配置对象导出
- validateConfig()          // 配置验证
- getPostgreSQLUrl()        // PostgreSQL URL获取

// 配置结构：
interface Config {
  server: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
  };
  postgresql: {
    database_url?: string;
    poolSize: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
  mongodb?: {
    uri?: string;  // 保留用于历史数据迁移，已废弃
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
```

**database.ts** - PostgreSQL连接管理
```typescript
// 主要功能：
- connectDatabase()         // 建立PostgreSQL连接（带重试）
- disconnectDatabase()      // 断开数据库连接
- isUsingPostgreSQL()       // 返回true
- isUsingMongoDB()          // 返回false（已废弃）

// 连接管理特性：
- 指数退避重连算法
- 后台持续重试机制
- 连接池管理（Drizzle + pg）
- 健康检查支持
```

## 关键依赖与配置

### 环境变量定义
```bash
# 服务器配置
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:1420
LOG_LEVEL=info

# PostgreSQL配置（主数据库）
DATABASE_URL=postgresql://username:password@localhost:5432/qmx
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=2000
DB_IDLE_TIMEOUT=30000

# MongoDB配置（已废弃，仅用于历史数据迁移）
MONGODB_URI=mongodb://localhost:27017/qmx

# 安全配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# 速率限制配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# 分页配置
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100

# 请求配置
REQUEST_BODY_LIMIT=10mb
```

### 配置验证规则
```typescript
// 启动时配置验证
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

  // 生产环境安全检查
  if (config.server.nodeEnv === 'production' &&
      config.security.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
}
```

## PostgreSQL连接管理 - 企业级实现

**指数退避重连机制**：
```typescript
export const connectDatabase = async (): Promise<void> => {
  const baseDelay = 2000; // 基础延迟2秒
  const maxDelay = 30000; // 最大延迟30秒
  let attempt = 1;

  // 先尝试一次连接
  try {
    const success = await testPostgreSQLConnection();
    if (success) {
      logger.info('PostgreSQL 连接成功');
      return;
    }
  } catch (error) {
    logger.error('PostgreSQL 初始连接失败，将启动后台重试:', error);
  }

  // 后台持续重试 - 指数退避
  const retryConnection = async () => {
    while (true) {
      try {
        const success = await testPostgreSQLConnection();
        if (success) {
          logger.info('🎉 PostgreSQL 后台重连成功！');
          return;
        }
      } catch (error) {
        // 指数退避算法：delay = min(baseDelay * 2^(attempt-1), maxDelay)
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

        logger.error(`PostgreSQL 后台重连失败 (尝试 ${attempt}):`, error);
        logger.info(`⏳ ${Math.round(delay/1000)}秒后继续重试 (指数退避)...`);

        attempt++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // 启动后台重试，不阻塞主线程
  setTimeout(retryConnection, 1000);
};
```

**连接管理特性**：
- ✅ **指数退避算法** - 智能重试间隔（2s → 4s → 8s → 16s → 30s）
- ✅ **后台重试** - 不阻塞应用启动
- ✅ **连接池管理** - pg连接池，默认10个连接
- ✅ **超时控制** - 连接超时2秒，空闲超时30秒
- ✅ **优雅关闭** - 应用退出时正确关闭连接池

## 配置架构设计

### 分层配置
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

### 数据库架构（PostgreSQL）
```typescript
// PostgreSQL数据库架构
PostgreSQL 15+
  ↓
pg Connection Pool (连接池)
  ↓
Drizzle ORM (Type-safe SQL)
  ↓
Repository Pattern
  ↓
Services & Controllers
  ↓
API Responses
```

### 安全配置保护
```typescript
// 敏感信息保护
logger.info(`🔄 正在连接PostgreSQL: ${url.replace(/\/\/[^@]+@/, '//***:***@')}`);

// 生产环境强制检查
if (config.server.nodeEnv === 'production' && config.security.jwtSecret === 'default') {
  throw new Error('JWT_SECRET must be changed in production');
}

// 配置覆盖机制
const url = process.env.DATABASE_URL ||
            process.env.POSTGRES_URL ||
            process.env.postgresql_url;
```

## 测试与质量

### 配置测试
- **验证测试**: 配置验证规则测试
- **环境测试**: 不同环境配置测试
- **连接测试**: PostgreSQL连接测试

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
2. 在Config接口中添加类型定义
3. 在config对象中添加默认值
4. 在validateConfig中添加验证规则（如果必需）

**Q: 如何管理敏感配置？**
A:
1. 使用环境变量存储敏感信息
2. 不要在代码中硬编码敏感值
3. 使用加密存储生产环境密钥
4. 限制配置文件访问权限

**Q: PostgreSQL连接失败怎么办？**
A:
1. 检查DATABASE_URL是否正确
2. 确认PostgreSQL服务是否运行
3. 验证网络连接和防火墙设置
4. 查看详细的错误日志
5. 系统会自动后台重试连接

**Q: 如何在不同环境使用不同配置？**
A:
1. 使用NODE_ENV区分环境
2. 为每个环境创建.env文件
3. 使用环境变量覆盖配置
4. Docker部署时通过环境变量注入

## 配置使用示例

### 获取配置
```typescript
import { config } from '@/config';

// 在应用中使用配置
const server = app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
  console.log(`Environment: ${config.server.nodeEnv}`);
});

// PostgreSQL连接
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
import { testConnection } from '@/db';

// API健康检查端点
app.get('/health/db', async (req, res) => {
  try {
    const isHealthy = await testConnection();
    res.json({
      success: true,
      data: {
        database_type: 'postgresql',
        connection_status: isHealthy ? 'connected' : 'disconnected',
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
├── index.ts              # 主配置入口（PostgreSQL配置）
└── database.ts           # PostgreSQL连接管理
```

## 配置架构图

```
┌─────────────────────────────────────────┐
│        Environment Variables            │
│  (DATABASE_URL, JWT_SECRET, NODE_ENV...)│
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
│         (Required Fields Check)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Final Config Object           │
│  ┌─────────────┬─────────────────────┐  │
│  │   Server    │    PostgreSQL       │  │
│  │  Config     │      Config         │  │
│  └─────────────┴─────────────────────┘  │
│  ┌─────────────┬─────────────────────┐  │
│  │  Security   │      Logging        │  │
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

## 迁移检查清单
- [x] 移除MongoDB连接管理代码
- [x] 添加PostgreSQL连接配置
- [x] 实现指数退避重连机制
- [x] 更新环境变量为DATABASE_URL
- [x] 保留MongoDB URI仅用于历史数据迁移
- [x] 更新配置验证逻辑
- [x] 添加连接池配置
- [x] 实现优雅关闭机制

---

**最后更新**: 2026-01-09
**迁移状态**: PostgreSQL迁移完成
**维护者**: H-Chris233
