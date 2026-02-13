import { swaggerSpec } from '@/config/swagger';

describe('Swagger Contract', () => {
  it('uses numeric id for student path parameters', () => {
    const studentByIdGet = (swaggerSpec as any).paths?.['/students/{id}']?.get;
    const studentByIdPut = (swaggerSpec as any).paths?.['/students/{id}']?.put;
    const studentByIdDelete = (swaggerSpec as any).paths?.['/students/{id}']?.delete;
    const statsStudentGet = (swaggerSpec as any).paths?.['/stats/students/{id}']?.get;

    const getParam = studentByIdGet?.parameters?.[0]?.schema;
    const putParam = studentByIdPut?.parameters?.[0]?.schema;
    const deleteParam = studentByIdDelete?.parameters?.[0]?.schema;
    const statsParam = statsStudentGet?.parameters?.[0]?.schema;

    expect(getParam).toMatchObject({ type: 'integer', minimum: 1 });
    expect(putParam).toMatchObject({ type: 'integer', minimum: 1 });
    expect(deleteParam).toMatchObject({ type: 'integer', minimum: 1 });
    expect(statsParam).toMatchObject({ type: 'integer', minimum: 1 });
  });

  it('defines sort_order parameter contract consistently', () => {
    const orderParam = (swaggerSpec as any).components?.parameters?.OrderParam;

    expect(orderParam?.name).toBe('sort_order');
    expect(orderParam?.schema?.enum).toEqual(['ASC', 'DESC']);
    expect(orderParam?.schema?.default).toBe('DESC');
  });

  it('keeps dashboard schema aligned with stats controller response', () => {
    const dashboardStats = (swaggerSpec as any).components?.schemas?.DashboardStats?.properties;

    expect(dashboardStats).toHaveProperty('total_students');
    expect(dashboardStats).toHaveProperty('total_revenue_cents');
    expect(dashboardStats).toHaveProperty('total_expense_cents');
    expect(dashboardStats).toHaveProperty('net_income_cents');
    expect(dashboardStats).toHaveProperty('average_score');
    expect(dashboardStats).toHaveProperty('max_score');
    expect(dashboardStats).toHaveProperty('active_courses');
    expect(dashboardStats).toHaveProperty('active_members');
    expect(dashboardStats).toHaveProperty('active_installment_plans');
    expect(dashboardStats).toHaveProperty('overdue_installment_count');
  });

  it('defines student uid as positive integer', () => {
    const studentUid = (swaggerSpec as any).components?.schemas?.Student?.properties?.uid;

    expect(studentUid).toMatchObject({ type: 'integer', minimum: 1 });
  });
});
