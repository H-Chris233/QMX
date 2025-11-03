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
