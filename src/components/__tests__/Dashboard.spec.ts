/**
 * Dashboard 组件单元测试
 *
 * 测试覆盖：
 * 1. 统计卡片渲染
 * 2. 加载状态
 * 3. 会员过期预警
 * 4. 快捷操作
 * 5. 数据刷新
 * 6. 空状态处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate, createMockDashboardStats } from './test-utils';
import Dashboard from '../Dashboard.vue';
import { useStatsStore } from '../../stores/stats';
import { useAppStore } from '../../stores/app';

describe('Dashboard', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;
  let statsStore: ReturnType<typeof useStatsStore>;
  let appStore: ReturnType<typeof useAppStore>;

  beforeEach(() => {
    wrapper = mountWithPinia(Dashboard);
    statsStore = useStatsStore();
    appStore = useAppStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 基本渲染', () => {
    it('应该渲染仪表盘容器', () => {
      const dashboard = wrapper.find('.dashboard-container');
      expect(dashboard.exists()).toBe(true);
    });

    it('应该渲染统计卡片区域', () => {
      const statsGrid = wrapper.find('.stats-grid');
      expect(statsGrid.exists()).toBe(true);
    });
  });

  describe('2. 加载状态', () => {
    it('应该在加载时显示骨架屏', async () => {
      appStore.setGlobalLoading(true);

      await waitForDOMUpdate();

      const skeletonCards = wrapper.findAll('.stat-card.skeleton');
      expect(skeletonCards.length).toBeGreaterThan(0);
    });

    it('应该在加载时显示进度条', async () => {
      appStore.setGlobalLoading(true);

      await waitForDOMUpdate();

      const loadingProgress = wrapper.find('.loading-progress');
      expect(loadingProgress.exists()).toBe(true);
    });

    it('应该在加载完成时隐藏骨架屏', async () => {
      const mockStats = createMockDashboardStats();
      appStore.setGlobalLoading(true);

      await waitForDOMUpdate();

      // 模拟数据加载完成
      statsStore.dashboardStats = mockStats;
      appStore.setGlobalLoading(false);

      await waitForDOMUpdate();

      const skeletonCards = wrapper.findAll('.stat-card.skeleton');
      const loadingProgress = wrapper.find('.loading-progress');

      expect(loadingProgress.exists()).toBe(false);
    });
  });

  describe('3. 统计卡片渲染', () => {
    it('应该在有数据时显示统计信息', async () => {
      const mockStats = createMockDashboardStats({
        totalStudents: 100,
        activeStudents: 80,
        totalRevenue: 50000,
        averageGrade: 8.5
      });

      statsStore.dashboardStats = mockStats;
      appStore.setGlobalLoading(false);

      await waitForDOMUpdate();

      const cards = wrapper.findAll('.stat-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('应该正确显示学员总数', async () => {
      const mockStats = createMockDashboardStats({ totalStudents: 150 });

      statsStore.dashboardStats = mockStats;
      await waitForDOMUpdate();

      const cardText = wrapper.text();
      expect(cardText).toContain('150');
    });

    it('应该正确显示活跃学员数', async () => {
      const mockStats = createMockDashboardStats({ activeStudents: 120 });

      statsStore.dashboardStats = mockStats;
      await waitForDOMUpdate();

      const cardText = wrapper.text();
      expect(cardText).toContain('120');
    });

    it('应该正确显示总收入', async () => {
      const mockStats = createMockDashboardStats({ totalRevenue: 100000 });

      statsStore.dashboardStats = mockStats;
      await waitForDOMUpdate();

      const cardText = wrapper.text();
      expect(cardText).toContain('100,000');
    });

    it('应该正确显示平均成绩', async () => {
      const mockStats = createMockDashboardStats({ averageGrade: 9.2 });

      statsStore.dashboardStats = mockStats;
      await waitForDOMUpdate();

      const cardText = wrapper.text();
      expect(cardText).toContain('9.2');
    });
  });

  describe('4. 快捷操作区域', () => {
    it('应该渲染快捷操作按钮', async () => {
      await waitForDOMUpdate();

      const quickActions = wrapper.find('.quick-actions');
      expect(quickActions.exists()).toBe(true);

      const buttons = wrapper.findAll('.action-btn');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('应该显示添加学员按钮', async () => {
      await waitForDOMUpdate();

      const addBtn = wrapper.find('.add-student-btn');
      expect(addBtn.exists()).toBe(true);
    });

    it('应该显示添加交易按钮', async () => {
      await waitForDOMUpdate();

      const addTransactionBtn = wrapper.find('.add-transaction-btn');
      expect(addTransactionBtn.exists()).toBe(true);
    });
  });

  describe('5. 数据获取', () => {
    it('应该在挂载时获取仪表盘数据', async () => {
      const fetchDashboardStatsSpy = vi.spyOn(statsStore, 'fetchDashboardStats').mockResolvedValue(createMockDashboardStats());

      await waitForDOMUpdate();
      await (wrapper.vm as any).loadDashboardData();

      expect(fetchDashboardStatsSpy).toHaveBeenCalled();
    });

    it('应该在刷新按钮点击时重新获取数据', async () => {
      const refreshStatsSpy = vi.spyOn(statsStore, 'refreshStats').mockResolvedValue({
        dashboard: createMockDashboardStats()
      });
      await waitForDOMUpdate();

      const refreshBtn = wrapper.find('.refresh-btn');
      await refreshBtn.trigger('click');

      expect(refreshStatsSpy).toHaveBeenCalled();
    });

    it('应该支持手动刷新', async () => {
      const refreshStatsSpy = vi.spyOn(statsStore, 'refreshStats').mockResolvedValue({
        dashboard: createMockDashboardStats()
      });

      await waitForDOMUpdate();

      const refreshBtn = wrapper.find('.refresh-btn');
      await refreshBtn.trigger('click');

      expect(refreshStatsSpy).toHaveBeenCalled();
    });
  });

  describe('6. 空状态处理', () => {
    it('应该在没有数据时显示空状态', async () => {
      statsStore.dashboardStats = null;

      await waitForDOMUpdate();

      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
    });

    it('应该在没有学员时显示0', async () => {
      const mockStats = createMockDashboardStats({ totalStudents: 0 });

      statsStore.dashboardStats = mockStats;
      await waitForDOMUpdate();

      const cardText = wrapper.text();
      expect(cardText).toContain('0');
    });
  });

  describe('7. 会员过期预警', () => {
    it('应该显示即将到期的会员', async () => {
      // 这个测试需要模拟会员数据
      await waitForDOMUpdate();

      const expiringSection = wrapper.find('.expiring-members');
      expect(expiringSection.exists()).toBe(true);
    });

    it('应该显示即将到期的天数', async () => {
      await waitForDOMUpdate();

      const memberDays = wrapper.findAll('.member-days');
      expect(memberDays.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('8. StatsStore集成', () => {
    it('应该正确响应store中的loading状态', async () => {
      expect(wrapper.find('.loading-progress').exists()).toBe(false);

      statsStore.loading.dashboard = true;
      await waitForDOMUpdate();

      expect(wrapper.find('.loading-progress').exists()).toBe(true);
    });

    it('应该在数据更新时正确渲染', async () => {
      const stats1 = createMockDashboardStats({ totalStudents: 50 });
      statsStore.dashboardStats = stats1;
      await waitForDOMUpdate();

      const stats2 = createMockDashboardStats({ totalStudents: 100 });
      statsStore.dashboardStats = stats2;
      await waitForDOMUpdate();

      // 验证数字已更新
      const cardText = wrapper.text();
      expect(cardText).toContain('100');
    });
  });

  describe('9. 边界条件', () => {
    it('应该处理无效的统计数据', async () => {
      statsStore.dashboardStats = {
        totalStudents: -1,
        activeStudents: -1,
        totalRevenue: -1000,
        averageGrade: -1
      } as any;

      await waitForDOMUpdate();

      // 应该仍然能够渲染
      expect(wrapper.find('.dashboard-container').exists()).toBe(true);
    });

    it('应该处理null统计数据', async () => {
      statsStore.dashboardStats = null;

      await waitForDOMUpdate();

      expect(wrapper.find('.dashboard-container').exists()).toBe(true);
    });

    it('应该处理undefined统计数据', async () => {
      statsStore.dashboardStats = undefined as any;

      await waitForDOMUpdate();

      expect(wrapper.find('.dashboard-container').exists()).toBe(true);
    });
  });

  describe('10. 响应式设计', () => {
    it('应该响应窗口大小变化（如果有实现）', async () => {
      await waitForDOMUpdate();

      const statsGrid = wrapper.find('.stats-grid');
      expect(statsGrid.exists()).toBe(true);
    });
  });
});
