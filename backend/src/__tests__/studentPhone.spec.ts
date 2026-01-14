/**
 * 学员手机号处理服务测试
 *
 * 测试覆盖：
 * 1. 正常手机号验证
 * 2. 特殊值处理（"未填写"）
 * 3. 边界条件处理
 * 4. 无效输入错误处理
 */

import { normalizeStudentPhoneOrThrow } from '@/services/studentPhone';

describe('studentPhone', () => {
  describe('1. 正常手机号验证', () => {
    it('应该接受有效的中国移动手机号', () => {
      expect(normalizeStudentPhoneOrThrow('13800138000')).toBe('13800138000');
    });

    it('应该接受有效的中国联通手机号', () => {
      expect(normalizeStudentPhoneOrThrow('18600186000')).toBe('18600186000');
    });

    it('应该接受有效的中国电信手机号', () => {
      expect(normalizeStudentPhoneOrThrow('18900189000')).toBe('18900189000');
    });

    it('应该接受带空格格式化的手机号', () => {
      expect(normalizeStudentPhoneOrThrow('138 0013 8000')).toBe('13800138000');
    });

    it('应该接受带连字符格式化的手机号', () => {
      expect(normalizeStudentPhoneOrThrow('138-0013-8000')).toBe('13800138000');
    });

    it('应该接受带括号格式化的手机号', () => {
      expect(normalizeStudentPhoneOrThrow('138(0013)8000')).toBe('13800138000');
    });
  });

  describe('2. 特殊值处理', () => {
    it('应该接受"未填写"作为特殊值', () => {
      expect(normalizeStudentPhoneOrThrow('未填写')).toBe('未填写');
    });

    it('应该接受带空格的"未填写"', () => {
      expect(normalizeStudentPhoneOrThrow('  未填写  ')).toBe('未填写');
    });
  });

  describe('3. 边界条件处理', () => {
    it('应该处理10位手机号（自动补0）', () => {
      expect(normalizeStudentPhoneOrThrow('1380013800')).toBe('13800138000');
    });

    it('应该截取超过11位的数字', () => {
      expect(normalizeStudentPhoneOrThrow('138001380001')).toBe('13800138000');
    });

    it('应该接受11位纯数字', () => {
      expect(normalizeStudentPhoneOrThrow('13800138000')).toBe('13800138000');
    });

    it('应该处理12位带种子字符的数字输入', () => {
      // 测试数据中常见的种子格式：手机号+时间戳后缀
      expect(normalizeStudentPhoneOrThrow('13800138000123')).toBe('13800138000');
    });
  });

  describe('4. 错误处理 - 空值', () => {
    it('空字符串应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('')).toThrow('手机号不能为空');
    });

    it('只包含空格的字符串应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('   ')).toThrow('手机号不能为空');
    });

    it('null 应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow(null as any)).toThrow('手机号不能为空');
    });

    it('undefined 应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow(undefined as any)).toThrow('手机号不能为空');
    });
  });

  describe('5. 错误处理 - 无效手机号格式', () => {
    it('无效前缀应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('12800138000')).toThrow('手机号格式不正确');
    });

    it('过短的手机号应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('13800')).toThrow('手机号格式不正确');
    });

    it('全字母输入应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('abcdefghijk')).toThrow('手机号格式不正确');
    });

    it('混合字符输入应该归一化为手机号', () => {
      // 如果能提取出有效手机号，就接受
      expect(normalizeStudentPhoneOrThrow('测试13800138000测试')).toBe('13800138000');
    });

    it('无法提取有效手机号应该抛出错误', () => {
      expect(() => normalizeStudentPhoneOrThrow('测试abc测试')).toThrow('手机号格式不正确');
    });
  });

  describe('6. 长度限制', () => {
    it('超过20字符的纯数字应该抛出错误', () => {
      const longPhone = '1' + '0'.repeat(20);
      expect(() => normalizeStudentPhoneOrThrow(longPhone)).toThrow('手机号长度不能超过20字符');
    });

    it('20字符纯数字应该接受', () => {
      const phone20 = '1' + '0'.repeat(19);
      const result = normalizeStudentPhoneOrThrow(phone20);
      expect(result.length).toBe(11); // 会被归一化为11位
    });
  });

  describe('7. 边界手机号测试', () => {
    it('以1开头后面是2的手机号无效', () => {
      expect(() => normalizeStudentPhoneOrThrow('12800000000')).toThrow('手机号格式不正确');
    });

    it('以1开头后面是0-2的手机号都应该是3开头', () => {
      expect(normalizeStudentPhoneOrThrow('13000130000')).toBe('13000130000');
      expect(normalizeStudentPhoneOrThrow('13100131000')).toBe('13100131000');
      expect(normalizeStudentPhoneOrThrow('13200132000')).toBe('13200132000');
      expect(normalizeStudentPhoneOrThrow('13300133000')).toBe('13300133000');
      expect(normalizeStudentPhoneOrThrow('13400134000')).toBe('13400134000');
      expect(normalizeStudentPhoneOrThrow('13500135000')).toBe('13500135000');
      expect(normalizeStudentPhoneOrThrow('13600136000')).toBe('13600136000');
      expect(normalizeStudentPhoneOrThrow('13700137000')).toBe('13700137000');
      expect(normalizeStudentPhoneOrThrow('13800138000')).toBe('13800138000');
      expect(normalizeStudentPhoneOrThrow('13900139000')).toBe('13900139000');
    });

    it('19号段手机号有效', () => {
      expect(normalizeStudentPhoneOrThrow('19800198000')).toBe('19800198000');
      expect(normalizeStudentPhoneOrThrow('19900199000')).toBe('19900199000');
    });
  });

  describe('8. 测试数据兼容性', () => {
    it('应该处理测试生成的手机号格式', () => {
      // 常见测试格式：时间戳后缀
      expect(normalizeStudentPhoneOrThrow('138001380001703456789')).toBe('13800138000');
    });

    it('应该处理枚举后缀格式', () => {
      // 常见测试格式：手机号 + _ + 序号
      expect(normalizeStudentPhoneOrThrow('13800138000_1')).toBe('13800138000');
      expect(normalizeStudentPhoneOrThrow('13800138000_test')).toBe('13800138000');
    });
  });
});
