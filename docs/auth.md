# 认证系统

QMX 系统采用简化的密码认证机制保护系统访问安全。

## 概述

- **首次访问**：设置站点访问密码
- **后续访问**：输入密码验证
- **管理员模式**：通过环境变量配置特殊密码
- **密码存储**：bcrypt 哈希（不可逆）

## 工作流程

### 首次访问

```
1. 用户访问系统
2. 前端调用 GET /auth/status
3. 后端返回 { isFirstVisit: true }
4. 用户设置密码
5. 前端调用 POST /auth/setup
6. 后端 bcrypt 哈希密码并存储
7. 登录成功，自动进入系统
```

### 后续访问

```
1. 用户访问系统
2. 前端调用 GET /auth/status
3. 后端返回 { hasPassword: true }
4. 用户输入密码
5. 前端调用 POST /auth/verify
6. 后端 bcrypt.compare() 验证
7. 验证成功返回 { success: true }
8. 进入系统
```

### 管理员登录

```
1. 用户访问系统
2. 前端检测到管理员密码环境变量
3. 用户输入管理员密码
4. 前端调用 POST /auth/verify
5. 后端优先验证管理员哈希
6. 验证成功返回 { success: true, data: { isAdmin: true } }
7. 进入系统（标记为管理员）
```

## 环境变量配置

### 后端配置

在 `backend/.env` 文件中：

```bash
# 管理员密码（必须是 bcrypt 哈希）
QMX_ADMIN_PASSWORD_HASH="$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 前端配置

在 `.env` 文件中：

```bash
# 管理员密码哈希（与后端相同）
VITE_ADMIN_PASSWORD_HASH="$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 生成 bcrypt 哈希

### 方法一：使用 Node.js

```bash
# 生成 bcrypt 哈希
cd backend && node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your_password', 10));"

# 输出示例
$2a$10$rBV2JJ6XXXGXYVXQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
```

### 方法二：使用 htpasswd

```bash
# 安装 apache2-utils（Debian/Ubuntu）
sudo apt install apache2-utils

# 生成哈希
htpasswd -nbB your_password

# 输出示例
your_password:$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 方法三：使用 Python

```bash
# Python 3
python3 -c "import bcrypt; print(bcrypt.hashpw(b'your_password', bcrypt.gensalt()).decode())"
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/auth/status` | 获取密码状态 |
| POST | `/api/v1/auth/setup` | 设置密码（首次） |
| POST | `/api/v1/auth/verify` | 验证密码 |
| POST | `/api/v1/auth/change` | 更改密码 |

### 状态响应

```json
{
  "success": true,
  "data": {
    "hasPassword": true,
    "isFirstVisit": false,
    "adminConfigured": true
  }
}
```

### 验证响应

```json
{
  "success": true,
  "data": {
    "isAdmin": true
  }
}
```

## 安全措施

| 措施 | 说明 |
|------|------|
| 密码哈希 | bcrypt (cost=10)，不可逆存储 |
| 强制后端验证 | 所有认证必须经过后端 API |
| 无前端密码存储 | 不在 localStorage 中存储密码 |
| HTTPS 传输 | 生产环境必须启用 HTTPS |

## 安全注意事项

### 必须配置 HTTPS

在生产环境中，**必须使用 HTTPS** 传输认证凭据。HTTP 明文传输容易被中间人攻击截获密码。

### 环境变量密码必须是哈希

**禁止**在环境变量中存储明文密码：

```bash
# ❌ 错误 - 明文密码
QMX_ADMIN_PASSWORD_HASH="my_password"

# ✅ 正确 - bcrypt 哈希
QMX_ADMIN_PASSWORD_HASH="$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 后端不可用时无法登录

如果后端服务不可用，用户将无法登录系统。这是预期的安全行为，防止离线绕过认证。

### 密码最小长度

系统强制要求密码最小长度为 4 个字符。前端和后端都有验证。

## 退出登录

用户可以在设置页面点击"退出登录"按钮清除认证状态。

```vue
<!-- 设置页面中的退出按钮 -->
<button class="logout-btn" @click="handleLogout">
  <LogOut :size="18" />
  <span>退出登录</span>
</button>
```

退出后：
- 清除前端认证状态
- 用户需要重新输入密码才能访问

## 文件结构

```
src/
├── stores/
│   └── auth.ts          # 认证状态管理
├── api/
│   └── authApi.ts       # 认证 API 客户端
└── components/
    ├── Login.vue        # 登录组件
    └── Settings.vue     # 设置页面（含退出功能）

backend/src/
└── routes/
    └── authRoutes.ts    # 后端认证路由
```

## 故障排除

### 问题：后端返回 "网络错误"

**可能原因**：
1. 后端服务未启动
2. 网络连接问题
3. CORS 配置问题

**解决方案**：
- 检查后端服务是否运行：`curl http://localhost:3001/api/v1/auth/status`
- 检查浏览器控制台 Network 面板

### 问题：密码验证总是失败

**可能原因**：
1. 环境变量未正确加载
2. bcrypt 哈希格式错误
3. 前后端哈希不一致

**解决方案**：
- 验证环境变量是否正确设置
- 确认哈希格式以 `$2a$10$` 开头
- 确保前后端使用相同的哈希值

### 问题：首次访问无法设置密码

**可能原因**：
1. 数据库连接问题
2. system_configs 表不存在

**解决方案**：
- 检查数据库迁移是否执行
- 检查数据库连接配置
