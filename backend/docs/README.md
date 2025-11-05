# QMX Backend Documentation

This directory contains technical documentation for the QMX backend system.

## 📚 Available Documents

### [migration-parity.md](./migration-parity.md)
**迁移差异分析文档** - Comprehensive comparison between Rust version (qmx_backend_lib) and TypeScript/MongoDB version.

**Contents:**
- Executive summary of key differences
- Module-by-module comparison matrix (Student, Cash, Installment, Stats, Database, Error Handling)
- Data structure mapping tables (Rust JSON ↔ MongoDB Schema)
- API endpoint comparison (Tauri Commands ↔ REST API)
- Missing component checklist (Counter, CashMongo, InstallmentMongo, InstallmentPlanMongo)
- Risk assessment (High/Medium/Low priority items)
- 4-phase migration recommendations
- Task references for follow-up work

**Use Cases:**
- Understanding architectural differences between versions
- Planning migration or refactoring work
- Identifying missing implementations
- Prioritizing development tasks

### [../docs/api-adaptation.md](../../docs/api-adaptation.md)
**API 接口适配文档** - Detailed API adaptation guide for frontend-backend integration.

**Contents (中文):**
- 完整的接口对照表（8个业务模块）
  - 学生管理、成绩管理、交易记录、分期付款、会员管理、统计分析、适配器、认证健康检查
- 请求/响应结构详细说明
- 数据结构适配指南（字段命名、金额、日期、ID、枚举）
- 错误处理对照（AppError 系统 vs Rust Result）
- 认证授权现状与待办事项
- 统一规范建议（命名、响应格式、分页、日期时间）
- 前后端联调注意事项与检查清单
- 快速参考表与故障排查指南

**Use Cases:**
- Frontend API integration reference
- Understanding request/response structures
- Data transformation guidelines (amount, date, ID conversion)
- Error handling implementation
- Frontend-backend collaboration during development

---

## 📝 Document Conventions

- **Version Control**: All documents include version number and update history
- **Priority Markers**: 🔴 High, 🟡 Medium, 🟢 Low
- **Status Markers**: ✅ Implemented, ❌ Missing, ⚠️ Partial/Issues
- **Code Samples**: Included where applicable for recommended implementations

## 🔄 Contributing

When updating documentation:
1. Update the version number and date
2. Add entry to update history
3. Maintain consistent formatting with existing docs
4. Include practical examples where helpful

## 📞 Contact

For questions or suggestions about documentation, please open an issue or contact the development team.
