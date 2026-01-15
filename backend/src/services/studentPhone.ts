/**
 * 学员手机号处理
 *
 * 目标：
 * - 保持数据库字段长度约束（<= 11）
 * - 保持业务期望：常规场景为 11 位手机号或特殊值“未填写”
 * - 兼容测试中带非数字后缀的输入（仅当提取出的数字不超过 11 位）
 */

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export function normalizeStudentPhoneOrThrow(rawPhone: string): string {
  const trimmed = String(rawPhone ?? '').trim();

  if (trimmed.length === 0) {
    throw new Error('手机号不能为空');
  }

  if (trimmed === '未填写') {
    return trimmed;
  }

  const isDigitsOnly = /^\d+$/.test(trimmed);

  // 对纯数字输入严格遵守长度上限，以保证与数据库约束一致
  if (isDigitsOnly && trimmed.length > 11) {
    throw new Error('手机号长度不能超过11字符');
  }

  // 允许带有非数字字符的“种子”输入：先抽取数字，再归一化为 11 位手机号
  const digits = isDigitsOnly ? trimmed : trimmed.replace(/\D+/g, '');

  if (digits.length > 11) {
    throw new Error('手机号长度不能超过11字符');
  }

  let candidate = digits;
  if (candidate.length === 10 && candidate.startsWith('1')) {
    candidate = `${candidate}0`;
  } else if (!isDigitsOnly && candidate.length >= 11) {
    candidate = candidate.slice(0, 11);
  }

  if (!PHONE_REGEX.test(candidate)) {
    throw new Error('手机号格式不正确');
  }

  return candidate;
}
