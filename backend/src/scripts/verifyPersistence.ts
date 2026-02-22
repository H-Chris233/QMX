import request from 'supertest';
import app from '@/app';
import { closeDatabase, db } from '@/db';
import {
  students,
  cashTransactions,
  installmentPlans,
  installments,
} from '@/db/schema';
import {
  and,
  asc,
  eq,
  inArray,
  like,
  or,
  sql,
} from 'drizzle-orm';
import { ClassType, SubjectType } from '@/types';

type ApiError = {
  message?: string;
  details?: unknown;
};

type ApiResponse<T = unknown> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
};

type StepResult = {
  name: string;
  passed: boolean;
  detail?: string;
};

const runId = `PERSIST_${Date.now()}`;
const testStudentName = `${runId}_Student`;
const testPhone = '';

const state = {
  studentUid: null as number | null,
  normalCashUid: null as number | null,
  installmentPlanUid: null as number | null,
  installmentFirstCashUid: null as number | null,
  cancelledInstallmentUid: null as number | null,
};

const results: StepResult[] = [];

const formatBody = (body: unknown): string => {
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
};

const assertCondition = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const pushResult = (name: string, passed: boolean, detail?: string): void => {
  results.push({ name, passed, detail });
  if (passed) {
    console.log(`✅ ${name}`);
    return;
  }
  console.log(`❌ ${name}${detail ? ` | ${detail}` : ''}`);
};

const assertApiSuccess = (
  response: request.Response,
  expectedStatus: number,
  action: string,
): ApiResponse => {
  const body = response.body as ApiResponse;
  if (response.status !== expectedStatus) {
    throw new Error(
      `${action} 状态码异常: ${response.status}, 预期 ${expectedStatus}, body=${formatBody(body)}`,
    );
  }
  if (body?.success !== true) {
    throw new Error(`${action} 返回 success=false: body=${formatBody(body)}`);
  }
  return body;
};

const getStudentRow = async (uid: number) => {
  const [row] = await db
    .select()
    .from(students)
    .where(eq(students.uid, uid))
    .limit(1);
  return row;
};

const getPlanRow = async (uid: number) => {
  const [row] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.uid, uid))
    .limit(1);
  return row;
};

const getInstallmentsByPlan = async (planUid: number) => {
  return db
    .select()
    .from(installments)
    .where(eq(installments.planId, planUid))
    .orderBy(asc(installments.installmentNumber));
};

const getCashRow = async (uid: number) => {
  const [row] = await db
    .select()
    .from(cashTransactions)
    .where(eq(cashTransactions.uid, uid))
    .limit(1);
  return row;
};

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value.split('T')[0] ?? value;
  const parsed = new Date(value as Date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0] ?? null;
};

const sumInstallmentAmount = (
  rows: Array<{ installmentAmount: number }>,
): number => rows.reduce((sum, row) => sum + Number(row.installmentAmount || 0), 0);

const runStep = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    pushResult(name, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushResult(name, false, message);
    throw error;
  }
};

const cleanup = async (): Promise<void> => {
  const studentUid = state.studentUid;
  const planUid = state.installmentPlanUid;

  try {
    if (planUid) {
      await db.delete(installments).where(eq(installments.planId, planUid));
      await db.delete(installmentPlans).where(eq(installmentPlans.uid, planUid));
      await db
        .delete(cashTransactions)
        .where(sql`${cashTransactions.installmentSnapshot} ->> 'plan_uid' = ${String(planUid)}`);
    }

    const directCashIds = [
      state.normalCashUid,
      state.installmentFirstCashUid,
    ]
      .filter((id): id is number => Number.isInteger(id) && Number(id) > 0);

    if (directCashIds.length > 0) {
      await db.delete(cashTransactions).where(inArray(cashTransactions.uid, directCashIds));
    }

    if (studentUid) {
      await db
        .delete(cashTransactions)
        .where(
          or(
            eq(cashTransactions.studentId, studentUid),
            like(cashTransactions.note, `%${runId}%`),
          ),
        );
      await db.delete(installments).where(eq(installments.studentId, studentUid));
      await db.delete(installmentPlans).where(eq(installmentPlans.studentId, studentUid));
      await db.delete(students).where(eq(students.uid, studentUid));
    } else {
      const [matchedStudent] = await db
        .select({ uid: students.uid })
        .from(students)
        .where(and(
          eq(students.name, testStudentName),
          eq(students.phone, testPhone),
        ))
        .limit(1);

      if (matchedStudent?.uid) {
        await db.delete(students).where(eq(students.uid, matchedStudent.uid));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ 清理测试数据失败: ${message}`);
  }
};

const main = async () => {
  const agent = request(app);
  console.log(`\n[verify:persistence] 开始实库验收，RUN_ID=${runId}`);

  try {
    await runStep('创建学员并校验基础字段落库', async () => {
      const createPayload = {
        name: testStudentName,
        age: 12,
        phone: testPhone,
        class: ClassType.TEN_TRY,
        subject: SubjectType.SHOOTING_ARCHERY,
        note: `${runId} student-create`,
        lesson_left: 10,
        membership_start_date: null,
        membership_end_date: null,
      };

      const response = await agent
        .post('/api/v1/students')
        .send(createPayload);

      const body = assertApiSuccess(response, 201, '创建学员');
      const uid = Number((body.data as any)?.uid);
      assertCondition(Number.isInteger(uid) && uid > 0, '创建学员未返回有效 uid');
      state.studentUid = uid;

      const row = await getStudentRow(uid);
      assertCondition(Boolean(row), '数据库未找到新建学员');
      assertCondition(row?.name === createPayload.name, 'name 未正确落库');
      assertCondition(row?.age === createPayload.age, 'age 未正确落库');
      assertCondition(row?.phone === createPayload.phone, 'phone 未正确落库');
      assertCondition(row?.classType === createPayload.class, 'class_type 未正确落库');
      assertCondition(row?.subject === createPayload.subject, 'subject 未正确落库');
      assertCondition(row?.note === createPayload.note, 'note 未正确落库');
      assertCondition(row?.lessonLeft === createPayload.lesson_left, 'lesson_left 未正确落库');
      assertCondition(row?.membershipStartDate === null, 'membership_start_date 应为 null');
      assertCondition(row?.membershipEndDate === null, 'membership_end_date 应为 null');
    });

    await runStep('编辑学员：月卡/年卡字段（会员日期+课时清空）落库', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');
      const membershipStart = '2026-02-20';
      const membershipEnd = '2027-02-20';

      const response = await agent
        .put(`/api/v1/students/${state.studentUid}`)
        .send({
          class: ClassType.YEAR,
          lesson_left: null,
          membership_start_date: membershipStart,
          membership_end_date: membershipEnd,
          note: '',
        });

      assertApiSuccess(response, 200, '更新学员(会员)');

      const row = await getStudentRow(state.studentUid!);
      assertCondition(row?.classType === ClassType.YEAR, 'class_type 未更新为 YEAR');
      assertCondition(row?.lessonLeft === null, 'YEAR 学员 lesson_left 应为 null');
      assertCondition(toIsoDate(row?.membershipStartDate) === membershipStart, 'membership_start_date 未正确落库');
      assertCondition(toIsoDate(row?.membershipEndDate) === membershipEnd, 'membership_end_date 未正确落库');
      assertCondition(row?.note === '', '空备注未正确落库');
    });

    await runStep('编辑学员：非会员字段（会员日期清空+课时保留）落库', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');
      const response = await agent
        .put(`/api/v1/students/${state.studentUid}`)
        .send({
          class: ClassType.OTHERS,
          lesson_left: 5,
          membership_start_date: null,
          membership_end_date: null,
          note: `${runId} student-updated`,
        });

      assertApiSuccess(response, 200, '更新学员(非会员)');

      const row = await getStudentRow(state.studentUid!);
      assertCondition(row?.classType === ClassType.OTHERS, 'class_type 未更新为 OTHERS');
      assertCondition(row?.lessonLeft === 5, 'lesson_left 未更新为 5');
      assertCondition(row?.membershipStartDate === null, 'membership_start_date 应为 null');
      assertCondition(row?.membershipEndDate === null, 'membership_end_date 应为 null');
      assertCondition(row?.note === `${runId} student-updated`, 'note 未更新');
    });

    await runStep('添加成绩并校验 score_details 的分数/科目/录入时间/备注落库', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');
      const scorePayload1 = {
        score: 123,
        subject: SubjectType.SHOOTING,
        recorded_at: '2026-02-21T01:02:03.000Z',
        note: `${runId} score-shooting`,
      };
      const scorePayload2 = {
        score: 456,
        subject: SubjectType.ARCHERY,
        recorded_at: '2026-02-21T04:05:06.000Z',
        note: `${runId} score-archery`,
      };

      const response1 = await agent
        .post(`/api/v1/students/${state.studentUid}/scores`)
        .send(scorePayload1);
      assertApiSuccess(response1, 201, '添加成绩1');

      const response2 = await agent
        .post(`/api/v1/students/${state.studentUid}/scores`)
        .send(scorePayload2);
      assertApiSuccess(response2, 201, '添加成绩2');

      const row = await getStudentRow(state.studentUid!);
      const details = Array.isArray(row?.scoreDetails) ? row?.scoreDetails : [];
      assertCondition(details.length >= 2, 'score_details 条数不足');
      assertCondition(details[0]?.score === 123, 'score_details[0].score 不正确');
      assertCondition(details[0]?.subject === SubjectType.SHOOTING, 'score_details[0].subject 不正确');
      assertCondition(details[0]?.note === scorePayload1.note, 'score_details[0].note 不正确');
      assertCondition(details[1]?.score === 456, 'score_details[1].score 不正确');
      assertCondition(details[1]?.subject === SubjectType.ARCHERY, 'score_details[1].subject 不正确');
      assertCondition(details[1]?.note === scorePayload2.note, 'score_details[1].note 不正确');
    });

    await runStep('编辑成绩并校验 score_details 更新不丢失', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');

      const response = await agent
        .put(`/api/v1/students/${state.studentUid}/scores/1`)
        .send({
          newScore: 432.1,
          subject: SubjectType.ARCHERY,
          recorded_at: '2026-02-22T08:15:00.000Z',
          note: `${runId} score-edited`,
        });
      assertApiSuccess(response, 200, '编辑成绩');

      const row = await getStudentRow(state.studentUid!);
      const details = Array.isArray(row?.scoreDetails) ? row?.scoreDetails : [];
      assertCondition(details[1]?.score === 432.1, '编辑后 score_details[1].score 不正确');
      assertCondition(details[1]?.subject === SubjectType.ARCHERY, '编辑后 score_details[1].subject 不正确');
      assertCondition(details[1]?.note === `${runId} score-edited`, '编辑后 score_details[1].note 不正确');
    });

    await runStep('新增普通收支并校验 amount/note/student_id 落库', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');

      const response = await agent
        .post('/api/v1/transactions')
        .send({
          student_id: state.studentUid,
          amount: 123.45,
          note: `${runId} normal-income`,
        });
      const body = assertApiSuccess(response, 201, '新增普通收支');
      const uid = Number((body.data as any)?.uid);
      assertCondition(Number.isInteger(uid) && uid > 0, '新增交易未返回有效 uid');
      state.normalCashUid = uid;

      const row = await getCashRow(uid);
      assertCondition(Boolean(row), '数据库未找到新增交易');
      assertCondition(row?.studentId === state.studentUid, '交易 student_id 未正确落库');
      assertCondition(row?.amount === 12345, '交易 amount(分) 未正确落库');
      assertCondition(row?.note === `${runId} normal-income`, '交易 note 未正确落库');
    });

    await runStep('编辑普通收支并校验负数金额(支出)落库', async () => {
      assertCondition(state.normalCashUid, '缺少 normalCashUid');

      const response = await agent
        .put(`/api/v1/transactions/${state.normalCashUid}`)
        .send({
          amount: -45.67,
          note: `${runId} normal-expense`,
        });
      assertApiSuccess(response, 200, '编辑普通收支');

      const row = await getCashRow(state.normalCashUid!);
      assertCondition(row?.amount === -4567, '编辑后 amount(分) 未正确落库');
      assertCondition(row?.note === `${runId} normal-expense`, '编辑后 note 未正确落库');
    });

    await runStep('创建分期付款并校验 plan/installments/installment_snapshot 落库', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');
      const today = new Date().toISOString().split('T')[0];
      const response = await agent
        .post('/api/v1/transactions/installment')
        .send({
          student_id: state.studentUid,
          total_amount: 500,
          note: `${runId} installment-create`,
          total_installments: 4,
          frequency: 'CUSTOM',
          custom_days: 15,
          start_date: today,
          due_date: today,
        });

      const body = assertApiSuccess(response, 201, '创建分期付款');
      const planUid = Number((body.data as any)?.plan?.uid);
      assertCondition(Number.isInteger(planUid) && planUid > 0, '分期计划 uid 无效');
      state.installmentPlanUid = planUid;

      const planRow = await getPlanRow(planUid);
      assertCondition(Boolean(planRow), '数据库未找到分期计划');
      assertCondition(planRow?.studentId === state.studentUid, 'plan.student_id 未正确落库');
      assertCondition(planRow?.totalAmount === 50000, 'plan.total_amount(分) 未正确落库');
      assertCondition(planRow?.totalInstallments === 4, 'plan.total_installments 未正确落库');
      assertCondition(planRow?.frequency === 'CUSTOM', 'plan.frequency 未正确落库');
      assertCondition(planRow?.customDays === 15, 'plan.custom_days 未正确落库');
      assertCondition(planRow?.note === `${runId} installment-create`, 'plan.note 未正确落库');

      const terms = await getInstallmentsByPlan(planUid);
      assertCondition(terms.length === 4, 'installments 期数不正确');
      assertCondition(terms[0]?.installmentNumber === 1, '第1期编号不正确');
      assertCondition(terms[0]?.status === 'PAID', '首期应为 PAID');
      assertCondition(Number(terms[0]?.cashUid) > 0, '首期 cash_uid 应存在');
      assertCondition(terms[1]?.status === 'PENDING', '第2期应为 PENDING');

      const firstCashUid = Number(terms[0]?.cashUid || 0);
      state.installmentFirstCashUid = firstCashUid > 0 ? firstCashUid : null;
      if (state.installmentFirstCashUid) {
        const cashRow = await getCashRow(state.installmentFirstCashUid);
        assertCondition(Boolean(cashRow), '数据库未找到首期分期现金记录');
        assertCondition(cashRow?.amount === Number(terms[0].installmentAmount), '首期现金金额与分期金额不一致');
        const snapshot = (cashRow?.installmentSnapshot ?? null) as unknown as {
          plan_uid?: unknown;
          installment_uid?: unknown;
          installment_number?: unknown;
        } | null;
        assertCondition(Boolean(snapshot), '首期现金 installment_snapshot 为空');
        assertCondition(Number(snapshot?.plan_uid) === planUid, 'snapshot.plan_uid 不正确');
        assertCondition(Number(snapshot?.installment_uid) === Number(terms[0].uid), 'snapshot.installment_uid 不正确');
        assertCondition(Number(snapshot?.installment_number) === 1, 'snapshot.installment_number 不正确');
      }
    });

    await runStep('编辑分期计划（总金额/总期数/备注）并校验重算结果落库', async () => {
      assertCondition(state.installmentPlanUid, '缺少 installmentPlanUid');
      const response = await agent
        .put(`/api/v1/installments/${state.installmentPlanUid}`)
        .send({
          total_amount: 620,
          total_installments: 5,
          status: 'ACTIVE',
          note: `${runId} installment-updated`,
        });
      assertApiSuccess(response, 200, '编辑分期计划');

      const planRow = await getPlanRow(state.installmentPlanUid!);
      assertCondition(Boolean(planRow), '编辑后未找到分期计划');
      assertCondition(planRow?.totalAmount === 62000, '编辑后 total_amount(分) 不正确');
      assertCondition(planRow?.totalInstallments === 5, '编辑后 total_installments 不正确');
      assertCondition(planRow?.note === `${runId} installment-updated`, '编辑后 note 不正确');

      const terms = await getInstallmentsByPlan(state.installmentPlanUid!);
      assertCondition(terms.length === 5, '编辑后分期期数不正确');

      const paidTerms = terms.filter((term) => term.status === 'PAID');
      const mutableTerms = terms.filter(
        (term) => term.status !== 'PAID' && term.status !== 'CANCELLED',
      );
      const paidAmountTotal = paidTerms.reduce((sum, term) => (
        sum + Number(term.paidAmount ?? term.installmentAmount ?? 0)
      ), 0);
      const mutableAmountTotal = sumInstallmentAmount(mutableTerms);
      assertCondition(
        paidAmountTotal + mutableAmountTotal === 62000,
        '编辑后剩余期金额未按总金额重算',
      );
    });

    await runStep('将某一期改为已取消并校验剩余期重算落库', async () => {
      assertCondition(state.installmentPlanUid, '缺少 installmentPlanUid');
      const termsBefore = await getInstallmentsByPlan(state.installmentPlanUid!);
      const pendingTerm = termsBefore.find((term) => term.status === 'PENDING');
      assertCondition(Boolean(pendingTerm), '未找到可取消的待支付分期');
      state.cancelledInstallmentUid = Number(pendingTerm!.uid);

      const response = await agent
        .put(`/api/v1/installments/${state.cancelledInstallmentUid}/payment`)
        .send({ status: 'CANCELLED' });
      assertApiSuccess(response, 200, '更新分期状态为 CANCELLED');

      const termsAfter = await getInstallmentsByPlan(state.installmentPlanUid!);
      const cancelled = termsAfter.find((term) => term.uid === state.cancelledInstallmentUid);
      assertCondition(cancelled?.status === 'CANCELLED', '分期状态未更新为 CANCELLED');

      const planRow = await getPlanRow(state.installmentPlanUid!);
      assertCondition(Boolean(planRow), '未找到分期计划');

      const paidTerms = termsAfter.filter((term) => term.status === 'PAID');
      const mutableTerms = termsAfter.filter(
        (term) => term.status !== 'PAID' && term.status !== 'CANCELLED',
      );
      const paidAmountTotal = paidTerms.reduce((sum, term) => (
        sum + Number(term.paidAmount ?? term.installmentAmount ?? 0)
      ), 0);
      const mutableAmountTotal = sumInstallmentAmount(mutableTerms);

      assertCondition(
        paidAmountTotal + mutableAmountTotal === Number(planRow?.totalAmount),
        '取消后剩余期金额未按规则重算',
      );
    });

    await runStep('回查最近交易列表，确认普通收支与分期记录均可读出', async () => {
      assertCondition(state.studentUid, '缺少 studentUid');
      const response = await agent
        .get('/api/v1/transactions')
        .query({
          student_id: state.studentUid,
          page: 1,
          limit: 50,
          sort_order: 'DESC',
        });

      const body = assertApiSuccess(response, 200, '查询交易列表');
      const records = Array.isArray(body.data) ? body.data : [];
      assertCondition(records.length > 0, '交易列表为空');

      const normalRecord = records.find((item: any) => Number(item.uid) === state.normalCashUid);
      assertCondition(Boolean(normalRecord), '未在交易列表中找到普通收支记录');
      assertCondition(
        String(normalRecord.note || '').includes(`${runId} normal-expense`),
        '普通收支记录备注不匹配',
      );

      const installmentRecord = records.find((item: any) => {
        const planUid = Number(item?.installment?.plan_uid);
        return Number.isInteger(planUid) && planUid === state.installmentPlanUid;
      });
      assertCondition(Boolean(installmentRecord), '未在交易列表中找到分期记录');
    });

    console.log('\n🎉 verify:persistence 全部断言通过');
  } finally {
    await cleanup();
    await closeDatabase();
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ verify:persistence 失败: ${message}`);
    const passed = results.filter((item) => item.passed).length;
    const failed = results.length - passed;
    console.error(`已执行步骤: ${results.length}, 通过: ${passed}, 失败: ${failed}`);
    process.exit(1);
  });
