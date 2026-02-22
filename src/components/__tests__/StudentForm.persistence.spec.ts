import { describe, it, expect } from 'vitest';
import { mountWithPinia } from '../../../tests/helpers/mount';
import StudentForm from '../StudentForm.vue';
import type { Student } from '../../types/api';

const createStudent = (overrides: Partial<Student> = {}): Student => ({
  uid: 1001,
  name: '测试学员',
  age: 13,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  rings: [],
  score_details: [],
  note: '原备注',
  lesson_left: 8,
  membership_start_date: '2026-02-01T00:00:00.000Z',
  membership_end_date: '2026-03-03T00:00:00.000Z',
  is_membership_active: true,
  membership_days_remaining: 10,
  membership_status: 'Active' as any,
  ...overrides,
});

describe('StudentForm persistence payload', () => {
  it('非会员课程提交应显式清空会员日期', async () => {
    const wrapper = mountWithPinia(StudentForm, {
      props: {
        modelValue: createStudent(),
      },
    });

    await wrapper.find('#class').setValue('Others');
    await wrapper.find('form').trigger('submit');

    const saveEvent = wrapper.emitted('save');
    expect(saveEvent).toBeTruthy();
    const payload = saveEvent?.[0]?.[0] as Record<string, unknown>;

    expect(payload.class).toBe('Others');
    expect(payload.membership_start_date).toBeNull();
    expect(payload.membership_end_date).toBeNull();
  });

  it('月卡/年卡提交应显式清空剩余课时', async () => {
    const wrapper = mountWithPinia(StudentForm);

    await wrapper.find('#name').setValue('新学员');
    await wrapper.find('#class').setValue('Month');
    await wrapper.find('form').trigger('submit');

    const saveEvent = wrapper.emitted('save');
    expect(saveEvent).toBeTruthy();
    const payload = saveEvent?.[0]?.[0] as Record<string, unknown>;

    expect(payload.class).toBe('Month');
    expect(payload.lesson_left).toBeNull();
  });

  it('清空备注后应提交空字符串而不是 undefined', async () => {
    const wrapper = mountWithPinia(StudentForm, {
      props: {
        modelValue: createStudent({ note: '会被清空', class: 'TenTry' }),
      },
    });

    await wrapper.find('#note').setValue('   ');
    await wrapper.find('form').trigger('submit');

    const saveEvent = wrapper.emitted('save');
    expect(saveEvent).toBeTruthy();
    const payload = saveEvent?.[0]?.[0] as Record<string, unknown>;

    expect(payload.note).toBe('');
  });
});
