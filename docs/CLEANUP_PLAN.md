# 文档清理计划

本文档记录文档整理过程和清理计划。

## 📊 整理概况

### 文档重组统计
- **总文档数**: 67个markdown文件
- **已整理**: 主要文档已整合到docs目录
- **新建文档**: 8个索引和概览文档
- **待清理**: 根目录散落文档

## 📁 新文档结构

### docs目录结构
```
docs/
├── README.md                      # ✨ 新建 - 文档中心首页
├── GETTING_STARTED.md             # ✨ 新建 - 快速上手指南
├── architecture/                  # 📁 架构文档
│   └── README.md                  # 📋 待创建
├── api/                           # 📁 API文档
│   └── specification.md           # ✅ 已整理 (backend/docs/API_SPECIFICATION.md)
├── development/                   # 📁 开发指南
│   └── README.md                  # 📋 待创建
├── testing/                       # 📁 测试文档
│   ├── README.md                  # ✨ 新建
│   ├── frontend-testing.md        # ✅ 保留 (TESTING.md)
│   └── backend-testing.md         # 📋 待创建
├── ci-cd/                         # 📁 CI/CD文档
│   ├── README.md                  # ✨ 新建
│   ├── quick-reference.md         # ✅ 已移动 (CI_QUICK_REFERENCE.md)
│   ├── github-actions.md          # ✅ 已复制 (GITHUB_ACTIONS_SETUP.md)
│   ├── coverage.md                # ✅ 已复制 (COVERAGE_IMPLEMENTATION.md)
│   ├── CI_COMPLETION_SUMMARY.md   # ✅ 已复制
│   ├── CI_IMPLEMENTATION_CHECKLIST.md # ✅ 已复制
│   └── CI_IMPROVEMENTS.md         # ✅ 已复制
├── maintenance/                   # 📁 维护记录
│   ├── README.md                  # ✨ 新建
│   ├── fixes/                     # 📁 修复记录
│   │   ├── DATE_MONEY_CONSISTENCY_FIX.md          # ✅ 已复制
│   │   ├── QUERY_FILTER_FIX_SUMMARY.md            # ✅ 已复制
│   │   ├── QUERY_FILTER_ANALYSIS.md               # ✅ 已复制
│   │   └── PORT_CONFLICT_FIX.md                   # ✅ 已复制
│   └── audits/                    # 📁 审计报告
│       ├── test-errors/           # ✅ 已复制 (backend/docs/test-errors/*)
│       ├── HARDCODED_VALUES_SUMMARY.md        # ✅ 保留
│       ├── BACKEND_HARDCODED_VALUES.md        # ✅ 保留
│       └── FRONTEND_HARDCODED_VALUES.md       # ✅ 保留
├── WORKSPACE.md                   # ✅ 保留
└── manual-e2e-checklist.md        # ✅ 保留
```

## 🗑️ 可删除的根目录文档

### 已整合到docs的文档（可删除）
| 文件名 | 新位置 | 状态 |
|--------|--------|------|
| `CI_QUICK_REFERENCE.md` | `docs/ci-cd/quick-reference.md` | ✅ 可删除 |
| `GITHUB_ACTIONS_SETUP.md` | `docs/ci-cd/github-actions.md` | ✅ 可删除 |
| `CI_COMPLETION_SUMMARY.md` | `docs/ci-cd/CI_COMPLETION_SUMMARY.md` | ✅ 可删除 |
| `CI_IMPLEMENTATION_CHECKLIST.md` | `docs/ci-cd/CI_IMPLEMENTATION_CHECKLIST.md` | ✅ 可删除 |
| `CI_IMPROVEMENTS.md` | `docs/ci-cd/CI_IMPROVEMENTS.md` | ✅ 可删除 |
| `COVERAGE_IMPLEMENTATION.md` | `docs/ci-cd/coverage.md` | ✅ 可删除 |
| `DATE_MONEY_CONSISTENCY_FIX.md` | `docs/maintenance/fixes/` | ✅ 可删除 |
| `BACKEND_TEST_REVIEW_SUMMARY.md` | 内容已整合 | ✅ 可删除 |

### 已废弃/过时的文档（可删除）
| 文件名 | 原因 |
|--------|------|
| `COVERAGE.md` | 内容已整合到ci-cd/coverage.md |
| `PR_SUMMARY.md` | 临时文档，已过期 |

### 保留在根目录的文档
| 文件名 | 原因 |
|--------|------|
| `CLAUDE.md` | **主文档，保留** - 包含完整的项目信息和AI指引 |
| `README.md` | **项目首页，保留** - GitHub入口文档 |
| `AGENTS.md` | 保留 - 特殊用途文档 |

## 🔄 Backend目录文档

### backend/docs/ (已整理到docs/)
- `API_SPECIFICATION.md` → `docs/api/specification.md` ✅
- `QUERY_FILTER_FIX_SUMMARY.md` → `docs/maintenance/fixes/` ✅
- `QUERY_FILTER_ANALYSIS.md` → `docs/maintenance/fixes/` ✅
- `test-errors/*` → `docs/maintenance/audits/test-errors/` ✅

### backend/ 根目录
- `README.md` - **保留** - 后端说明文档
- `TEST_MIGRATION_SUMMARY.md` - 可移动到 `docs/testing/backend-testing.md`

### backend/test/
- `PORT_CONFLICT_FIX.md` → `docs/maintenance/fixes/` ✅
- `TESTING_GUIDE.md` - 可整合到测试文档

## 📋 清理执行计划

### 阶段1: 确认整理完成 ✅
- [x] 创建新的docs目录结构
- [x] 创建文档索引和导航
- [x] 复制重要文档到新位置
- [x] 创建新的概览和指南文档

### 阶段2: 删除冗余文档 (建议手动执行)
```bash
# 进入项目根目录
cd /data/data/com.termux/files/home/QMX

# 删除已整合的文档
rm -f CI_QUICK_REFERENCE.md
rm -f GITHUB_ACTIONS_SETUP.md
rm -f CI_COMPLETION_SUMMARY.md
rm -f CI_IMPLEMENTATION_CHECKLIST.md
rm -f CI_IMPROVEMENTS.md
rm -f COVERAGE_IMPLEMENTATION.md
rm -f DATE_MONEY_CONSISTENCY_FIX.md
rm -f BACKEND_TEST_REVIEW_SUMMARY.md

# 删除过时文档
rm -f COVERAGE.md
rm -f PR_SUMMARY.md

# 后端文档清理（可选）
rm -f backend/docs/QUERY_FILTER_FIX_SUMMARY.md
rm -f backend/docs/QUERY_FILTER_ANALYSIS.md
rm -f backend/test/PORT_CONFLICT_FIX.md
```

### 阶段3: 更新引用链接 (重要)
需要更新以下位置的文档链接：
- [ ] `CLAUDE.md` - 更新内部链接指向新位置
- [ ] `backend/README.md` - 更新API文档链接
- [ ] GitHub仓库README.md - 更新文档链接

### 阶段4: 验证和测试
- [ ] 检查所有文档链接是否正确
- [ ] 确认文档内容完整性
- [ ] 测试文档导航
- [ ] 提交Git更改

## 📝 建议的清理脚本

```bash
#!/bin/bash
# cleanup-docs.sh - 文档清理脚本

echo "开始清理文档..."

# 备份根目录文档（安全起见）
echo "创建备份..."
mkdir -p .doc-backup
cp *.md .doc-backup/ 2>/dev/null

# 删除已整合的文档
echo "删除已整合的文档..."
rm -f CI_QUICK_REFERENCE.md
rm -f GITHUB_ACTIONS_SETUP.md
rm -f CI_COMPLETION_SUMMARY.md
rm -f CI_IMPLEMENTATION_CHECKLIST.md
rm -f CI_IMPROVEMENTS.md
rm -f COVERAGE_IMPLEMENTATION.md
rm -f DATE_MONEY_CONSISTENCY_FIX.md
rm -f BACKEND_TEST_REVIEW_SUMMARY.md
rm -f COVERAGE.md
rm -f PR_SUMMARY.md

echo "根目录文档清理完成！"
echo ""
echo "保留的根目录文档:"
ls -1 *.md 2>/dev/null
echo ""
echo "备份位置: .doc-backup/"
echo "如需恢复，请从备份目录复制文件"
```

## ⚠️ 注意事项

### 清理前检查
1. **确认备份** - 重要文档已复制到docs目录
2. **验证内容** - 新文档包含所有重要信息
3. **检查链接** - 更新所有引用这些文档的链接
4. **Git提交** - 在删除前提交更改

### 不要删除
- ❌ `CLAUDE.md` - 主文档，包含完整项目信息
- ❌ 根目录`README.md` - 项目首页
- ❌ `AGENTS.md` - 特殊用途
- ❌ backend/README.md - 后端说明

### 模块CLAUDE.md文档
**保留所有模块级CLAUDE.md**:
- `src/*/CLAUDE.md` - 前端模块文档
- `backend/src/*/CLAUDE.md` - 后端模块文档
- 这些文档为AI提供模块级上下文，不应删除

## 🎯 最终目标

### 文档组织目标
- ✅ 所有文档在docs目录下按类别组织
- ✅ 清晰的文档索引和导航
- ✅ 根目录保持整洁，只有必要文档
- ✅ 模块级文档保持原位置
- ✅ 文档内容精炼，无冗余

### 完成标志
- [ ] docs目录结构完整
- [ ] 所有链接更新正确
- [ ] 根目录文档清理完成
- [ ] Git提交记录清晰
- [ ] 文档访问测试通过

---

**创建日期**: 2025-01-06
**执行状态**: 📋 计划完成，待执行清理
**下一步**: 更新CLAUDE.md中的文档链接
