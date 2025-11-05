# 成绩模块适配新 API - 变更摘要

## 概述
本次更新将 `GradeManagement.vue` 组件完全适配到新的 API 架构，确保所有成绩操作通过 ApiService 统一调用，并正确处理响应包装。

## 主要变更

### 1. API 响应处理修复
**文件**: `src/components/GradeManagement.vue`

修复了 `loadData()` 函数中对 API 响应的处理：
- **之前**: 假设 `ApiService.getAllStudents()` 返回学员数组
- **现在**: 正确解析响应包装 `{ students, pagination }`
```typescript
const response = await ApiService.getAllStudents();
const data = response.students || [];
```

### 2. 批量添加成绩功能
新增批量添加成绩对话框和功能：

#### 新增的响应式变量：
- `showBatchAdd`: 控制批量添加对话框显示
- `batchScoresText`: 存储批量输入的成绩文本

#### 新增的函数：
- `showBatchAddDialog()`: 打开批量添加对话框
- `closeBatchAddDialog()`: 关闭对话框
- `batchAddScores()`: 处理批量添加逻辑
  - 解析文本输入（每行一个成绩）
  - 使用 `validateScoreInput()` 验证每个成绩
  - 使用 `parseFloat(score.toFixed(1))` 格式化为一位小数
  - 逐个调用 `ApiService.addScore()` 添加成绩
  - 显示成功/错误消息

#### UI 组件：
- 在批量操作区添加"➕ 批量添加"按钮
- 添加批量添加模态框，包含：
  - 多行文本框用于输入成绩
  - 帮助文本说明输入格式
  - 取消和添加按钮

### 3. 清空所有成绩功能
新增清空学员所有成绩的功能：

#### 新增的函数：
- `clearAllScores()`: 清空当前选中学员的所有成绩
  - 使用确认对话框（danger 类型）
  - 调用 `ApiService.updateScoresBatch(uid, [])` 清空成绩
  - 显示成功/错误消息

#### UI 组件：
- 在批量操作区添加"🗑️ 清空成绩"按钮（危险操作样式）

### 4. 成绩输入验证增强
改进了成绩输入的验证和格式化：

#### `addQuickScore()` 更新：
```typescript
// 使用 safeParseNumber 安全解析并格式化
const parsedScore = safeParseNumber(quickScore.value, 0, { 
  min: 0, 
  max: 1000, 
  decimals: 1 
});

// 验证成绩
const validation = validateScoreInput(parsedScore);
```

#### `editScore()` 更新：
```typescript
// 使用 safeParseNumber 处理用户输入
const parsedScore = safeParseNumber(newScoreInput, 0, { 
  min: 0, 
  max: 1000, 
  decimals: 1 
});
```

### 5. 导入更新
添加必要的工具函数导入：
```typescript
import { validateScoreInput, safeParseNumber } from '../utils/dataTransformers';
```

### 6. CSS 样式新增
添加了批量操作的样式：

```css
/* 危险操作按钮样式 */
.batch-btn.danger {
  background-color: #f44336;
}

.batch-btn.danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

/* 帮助文本样式 */
.help-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

## 验收标准检查

### ✅ 已完成的功能：

1. **API 统一调用**
   - ✅ `ApiService.getAllStudents()` 获取学员列表
   - ✅ `ApiService.getStudentScores()` 获取成绩
   - ✅ `ApiService.addScore()` 添加成绩
   - ✅ `ApiService.updateStudentScore()` 更新成绩
   - ✅ `ApiService.deleteStudentScore()` 删除成绩
   - ✅ `ApiService.updateScoresBatch()` 批量更新/清空成绩

2. **数据源适配**
   - ✅ 所有成绩数据使用 `student.rings` 而非 `student.scores`
   - ✅ 平均分、最高分、最低分计算基于 `rings` 数组

3. **前端验证**
   - ✅ 使用 `validateScoreInput()` 验证所有成绩输入
   - ✅ 使用 `safeParseNumber()` 安全解析数字
   - ✅ 所有成绩保留一位小数（0-1000 范围）

4. **新功能实现**
   - ✅ 批量添加成绩功能
   - ✅ 清空所有成绩功能
   - ✅ 完整的错误处理和用户反馈

5. **错误处理**
   - ✅ 捕获 API 错误并显示在全局错误提示中
   - ✅ 验证错误使用 `handleValidationError()`
   - ✅ 操作成功显示 `showSuccess()` 提示

## API 请求格式

所有成绩操作使用正确的请求体格式：

- **添加成绩**: `POST /api/v1/students/:uid/scores`
  ```json
  { "score": 8.5 }
  ```

- **更新成绩**: `PATCH /api/v1/students/:uid/scores/:index`
  ```json
  { "score": 9.0 }
  ```

- **删除成绩**: `DELETE /api/v1/students/:uid/scores/:index`

- **批量更新**: `PUT /api/v1/students/:uid/scores/batch`
  ```json
  { "scores": [8.5, 9.0, 7.8] }
  ```

## 构建状态

- ✅ TypeScript 编译无新增错误
- ✅ 所有现有功能保持兼容
- ✅ 遵循现有代码规范和样式

## 测试建议

建议进行以下测试：

1. **单个成绩操作**
   - 添加成绩（快速添加和模态框添加）
   - 编辑成绩
   - 删除成绩

2. **批量操作**
   - 批量添加多个有效成绩
   - 批量添加包含无效成绩的数据
   - 清空所有成绩

3. **边界情况**
   - 输入超出范围的成绩
   - 输入非数字字符
   - 网络错误处理
   - 未选择学员时的操作

4. **UI/UX**
   - 加载状态显示
   - 成功/错误提示
   - 确认对话框
   - 数据实时更新

## 注意事项

1. **成绩范围**: 当前系统支持多种评分系统：
   - 射击 (Shooting): 0-654
   - 射箭 (Archery): 0-600
   - 其他 (Others): 0-100
   - 数据验证范围设置为 0-1000 以兼容所有类型

2. **小数精度**: 所有成绩统一保留一位小数

3. **向后兼容**: 保持了对现有功能的完全兼容

4. **错误处理**: 所有异步操作都包含完整的错误处理和用户反馈
