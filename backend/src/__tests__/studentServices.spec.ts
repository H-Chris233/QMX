import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { StudentQuery } from '@/services/studentQuery';
import { presentStudent } from '@/services/studentPresenter';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { ClassType, SubjectType } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
} from './helpers/testSetup';
import { addDays, addMonths } from './helpers/testSetup';

jest.setTimeout(30000);

describe('Student services integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('automatically assigns lesson defaults for TenTry class', async () => {
    const tenTryStudent = await StudentBuilder.create()
      .name('TenTry Student')
      .class(ClassType.TEN_TRY)
      .subject(SubjectType.SHOOTING)
      .phone('13800000000')
      .build();

    const otherStudent = await StudentBuilder.create()
      .name('Other Student')
      .class(ClassType.MONTH)
      .subject(SubjectType.ARCHERY)
      .phone('13800000001')
      .build();

    expect(tenTryStudent.lessonLeft).toBe(10);
    expect(otherStudent.lessonLeft).toBeNull();
  });

  it('manages membership lifecycle via updater', async () => {
    const student = await StudentBuilder.create()
      .name('Membership Student')
      .class(ClassType.MONTH)
      .subject(SubjectType.SHOOTING)
      .phone('13800000002')
      .build();

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    const updater = StudentUpdater.fromDocument(student);
    updater.membership(start, end);
    const updated = await updater.commit();

    expect(updated.membershipStartDate).not.toBeNull();
    expect(updated.membershipEndDate).not.toBeNull();

    const cleared = StudentUpdater.fromDocument(updated).membership(null, null);
    const clearedResult = await cleared.commit();
    expect(clearedResult.membershipStartDate).toBeNull();
    expect(clearedResult.membershipEndDate).toBeNull();
  });

  it('supports comprehensive score operations', async () => {
    const student = await StudentBuilder.create()
      .name('Score Student')
      .class(ClassType.MONTH)
      .subject(SubjectType.SHOOTING)
      .phone('13800000003')
      .build();

    const addUpdater = StudentUpdater.fromDocument(student);
    addUpdater.addRing(9).addRing(7.5);
    await addUpdater.commit();

    const reloaded = await StudentRepository.findByUid(student.uid);
    expect(reloaded?.rings).toEqual([9, 7.5]);

    const updateUpdater = StudentUpdater.fromDocument(reloaded!);
    updateUpdater.ringAt(1, 8.5);
    await updateUpdater.commit();

    const afterUpdate = await StudentRepository.findByUid(student.uid);
    expect(afterUpdate?.rings).toEqual([9, 8.5]);

    const removeUpdater = StudentUpdater.fromDocument(afterUpdate!);
    removeUpdater.removeRing(0);
    await removeUpdater.commit();

    const afterRemove = await StudentRepository.findByUid(student.uid);
    expect(afterRemove?.rings).toEqual([8.5]);

    expect(() => {
      StudentUpdater.fromDocument(afterRemove!).removeRingAt(5);
    }).toThrow(/成绩索引超出范围/);
  });

  it('builds search queries with score and membership filters', async () => {
    const activeStudent = await StudentBuilder.create()
      .name('Alice Active')
      .class(ClassType.MONTH)
      .subject(SubjectType.SHOOTING)
      .phone('13800000004')
      .build();

    const activeStart = new Date();
    activeStart.setDate(activeStart.getDate() - 2);
    const activeEnd = new Date();
    activeEnd.setDate(activeEnd.getDate() + 5);

    const activeUpdater = StudentUpdater.fromDocument(activeStudent);
    activeUpdater.addRing(9).addRing(8.5).membership(activeStart, activeEnd);
    await activeUpdater.commit();

    const inactiveStudent = await StudentBuilder.create()
      .name('Bob Inactive')
      .class(ClassType.MONTH)
      .subject(SubjectType.ARCHERY)
      .phone('13800000005')
      .build();

    const inactiveUpdater = StudentUpdater.fromDocument(inactiveStudent);
    inactiveUpdater.addRing(6.5);
    await inactiveUpdater.commit();

    const futureStudent = await StudentBuilder.create()
      .name('Charlie Future')
      .class(ClassType.MONTH)
      .subject(SubjectType.SHOOTING)
      .phone('13800000006')
      .build();

    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 10);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 20);

    const futureUpdater = StudentUpdater.fromDocument(futureStudent);
    futureUpdater.membership(futureStart, futureEnd).addRing(8);
    await futureUpdater.commit();

    // 测试查询构建器
    const query = StudentQuery.create()
      .hasMembership(true)
      .membershipActiveAt(new Date())
      .scoreRange(8, 10);

    const result = await query.execute();

    // 应该只找到 activeStudent（当前有会员且成绩在8-10之间）
    expect(result.data.length).toBe(1);
    expect(result.data[0].uid).toBe(activeStudent.uid);
  });
});
