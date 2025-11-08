import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Student, studentModel } from '@/models/mongo';
import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { StudentQuery } from '@/services/studentQuery';
import { presentStudent } from '@/services/studentPresenter';
import { ClassType, SubjectType } from '@/types';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory 
} from '../../test/setupBackend';

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
    updater.membership({ startDate: start, endDate: end });
    const updated = await updater.commit();

    expect(updated.hasMembership(new Date(start))).toBe(true);
    expect(updated.getMembershipDaysRemaining(new Date(start))).toBeGreaterThan(0);

    const cleared = await StudentUpdater.fromDocument(updated).membership(null).commit();
    expect(cleared.hasMembership()).toBe(false);
    expect(cleared.membershipStartDate).toBeNull();
    expect(cleared.membershipEndDate).toBeNull();
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

    const reloaded = await Student.findByUid(student.uid);
    expect(reloaded?.rings).toEqual([9, 7.5]);

    const updateUpdater = StudentUpdater.fromDocument(reloaded!);
    updateUpdater.updateRingAt(1, 8.5);
    await updateUpdater.commit();

    const afterUpdate = await Student.findByUid(student.uid);
    expect(afterUpdate?.rings).toEqual([9, 8.5]);
    expect(afterUpdate?.getAverageScore()).toBeCloseTo(8.8, 1);

    const removeUpdater = StudentUpdater.fromDocument(afterUpdate!);
    removeUpdater.removeRingAt(0);
    await removeUpdater.commit();

    const afterRemove = await Student.findByUid(student.uid);
    expect(afterRemove?.rings).toEqual([8.5]);

    expect(() => StudentUpdater.fromDocument(afterRemove!).updateRingAt(5, 9)).toThrow(/InvalidInput/);
  });

  it('builds search pipelines with score and membership filters', async () => {
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
    activeUpdater.addRing(9).addRing(8.5).membership({ startDate: activeStart, endDate: activeEnd });
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
    futureUpdater.membership({ startDate: futureStart, endDate: futureEnd }).addRing(8);
    await futureUpdater.commit();

    const { pipeline } = StudentQuery.create()
      .hasMembership(true)
      .membershipActiveAt(new Date())
      .scoreRange(8, 10)
      .build();

    const results = await Student.aggregate(pipeline).exec();
    expect(results).toHaveLength(1);
    expect(results[0].uid).toBe(activeStudent.uid);

    const presented = presentStudent(results[0]);
    expect(presented.isMembershipActive).toBe(true);
    expect(presented.membership_status).toBe('Active');
    expect(presented.membershipStatus).toBe('Active');
  });
});
