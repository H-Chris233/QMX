# Codecov 集成设置指南

## 什么是 Codecov？

Codecov 是一个代码覆盖率报告服务，可以：
- 📊 可视化覆盖率趋势
- 💬 在 PR 中自动添加覆盖率注释
- 📈 跟踪覆盖率历史变化
- 🎯 设置覆盖率门槛和目标

## 设置步骤

### 1. 注册 Codecov

1. 访问 [Codecov.io](https://codecov.io/)
2. 使用 GitHub 账号登录
3. 授权 Codecov 访问你的仓库

### 2. 获取 Codecov Token

1. 在 Codecov 中找到你的仓库
2. 进入 Settings > General
3. 复制 Repository Upload Token

### 3. 添加 GitHub Secret

1. 进入 GitHub 仓库的 Settings
2. 选择 Secrets and variables > Actions
3. 点击 New repository secret
4. 添加以下 secret：

```
Name: CODECOV_TOKEN
Value: <your-codecov-token>
```

### 4. 验证集成

创建一个 Pull Request，你应该能看到：
1. CI 工作流成功运行覆盖率测试
2. Codecov bot 在 PR 中添加覆盖率注释
3. 覆盖率报告上传成功

## 配置文件

项目根目录的 `codecov.yml` 配置了：
- 覆盖率阈值和门槛
- PR 注释格式
- 忽略路径
- 组件管理（前端/后端）

## 查看覆盖率报告

### 在 Codecov Dashboard
1. 访问 [app.codecov.io](https://app.codecov.io/)
2. 找到你的仓库
3. 查看覆盖率趋势、文件树和详细报告

### 在 Pull Request
Codecov bot 会自动在 PR 中添加注释，显示：
- 覆盖率变化（增加/减少）
- 每个组件的覆盖率
- 未覆盖的文件列表

### 在本地
```bash
# 前端覆盖率报告
open coverage/index.html

# 后端覆盖率报告
open backend/coverage/index.html
```

## 故障排查

### Token 未生效
- 检查 GitHub Secret 名称是否为 `CODECOV_TOKEN`
- 确保 Token 复制完整，没有多余空格
- 重新触发 CI 工作流

### 覆盖率未上传
- 检查 CI 日志中 "Upload coverage to Codecov" 步骤
- 确保 lcov.info 文件生成成功
- 检查文件路径是否正确

### PR 注释未出现
- Codecov bot 需要仓库访问权限
- 等待几分钟，Codecov 处理需要时间
- 检查 Codecov 网站的处理状态

## 高级配置

### 调整覆盖率门槛
编辑 `codecov.yml` 中的 `coverage.status` 部分：

```yaml
coverage:
  status:
    project:
      default:
        target: auto
        threshold: 1%  # 允许覆盖率下降的百分比
```

### 自定义 PR 注释
编辑 `codecov.yml` 中的 `comment` 部分：

```yaml
comment:
  layout: "header, diff, flags, components"
  behavior: default
```

## 参考资源

- [Codecov 官方文档](https://docs.codecov.com/)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [codecov.yml 配置参考](https://docs.codecov.com/docs/codecov-yaml)

## 技术支持

如有问题，请：
1. 查阅项目 [COVERAGE.md](../COVERAGE.md)
2. 查看 Codecov 社区论坛
3. 联系开发团队
