import type { WorkbenchRecord, UserStats, NavGroup, TabKey } from '@/types';

export const mockUser: UserStats = {
  joinDate: '2026-04-28',
  lastUpdated: '刚刚',
};

export const mockRecords: WorkbenchRecord[] = [
  {
    id: 'rec-001',
    type: 'schedule',
    content: '提交工作报告',
    createdAt: '2026-07-16T09:00:00Z',
    customer: '润和机械',
    reminderAt: '2026-07-16T14:00:00Z',
    source: 'manual',
  },
  {
    id: 'rec-002',
    type: 'schedule',
    content: '拜访中国航发GH4169项目组',
    createdAt: '2026-07-16T09:00:00Z',
    customer: '中国航发',
    reminderAt: '2026-07-16T10:30:00Z',
    source: 'voice',
  },
  {
    id: 'rec-003',
    type: 'schedule',
    content: '航天科工TC4钛合金技术交流会',
    createdAt: '2026-07-16T09:00:00Z',
    customer: '航天科工',
    reminderAt: '2026-07-17T15:00:00Z',
    source: 'voice',
  },
  {
    id: 'rec-004',
    type: 'schedule',
    content: '跟进中航工业报价进展',
    createdAt: '2026-07-16T09:00:00Z',
    customer: '中航工业',
    reminderAt: '2026-07-18T09:00:00Z',
    source: 'manual',
  },
  {
    id: 'rec-005',
    type: 'order',
    content: '润和机械GH4169锻件订单',
    createdAt: '2024-11-04T09:30:00Z',
    customer: '润和机械',
  },
  {
    id: 'rec-006',
    type: 'visit',
    content: '拜访中国航发XX项目组',
    createdAt: '2024-11-05T14:00:00Z',
    customer: '中国航发',
  },
  {
    id: 'rec-007',
    type: 'quote',
    content: '航天科工TC4钛合金报价',
    createdAt: '2024-11-05T16:15:00Z',
    customer: '航天科工',
  },
  {
    id: 'rec-008',
    type: 'task',
    content: '准备珠海航展资料',
    createdAt: '2024-11-06T09:00:00Z',
  },
  {
    id: 'rec-009',
    type: 'call',
    content: '跟进中航工业报价进展',
    createdAt: '2024-11-06T16:45:00Z',
    customer: '中航工业',
  },
];

export const navGroups: NavGroup[] = [
  {
    title: '销售工具',
    items: [
      {
        id: 'voice-workbench',
        icon: 'Mic',
        label: '语音工作台',
        subLabel: '一句话搞定',
        path: '/voice-workbench',
      },
      {
        id: 'market-radar',
        icon: 'Newspaper',
        label: '市情雷达',
        subLabel: '行业情报抓取',
        path: '/market-radar',
      },
      {
        id: 'reports',
        icon: 'FileCheck',
        label: '报告生成',
        subLabel: '一键出报告',
        path: '/reports',
      },
      {
        id: 'travel-report',
        icon: 'FileText',
        label: '出差报告',
        subLabel: 'AI自动生成',
        path: '/travel-report',
      },
      {
        id: 'meeting-library',
        icon: 'BookOpen',
        label: '会议知识库',
        subLabel: '妙记自动沉淀',
        path: '/meeting-library',
      },
    ],
  },
  {
    title: '销售业务管理',
    items: [
      {
        id: 'proposal',
        icon: 'FileText',
        label: '方案报价',
        subLabel: '一键成单工具',
        path: '/proposal',
      },
      {
        id: 'customer-manager',
        icon: 'Heart',
        label: '客户管家',
        subLabel: '全周期管理',
        path: '/customer-manager',
      },
      {
        id: 'performance-review',
        icon: 'TrendingUp',
        label: '业绩复盘',
        subLabel: '数据驱动增长',
        path: '/performance-review',
      },
      {
        id: 'project-manager',
        icon: 'Kanban',
        label: '项目管家',
        subLabel: '全流程闭环管控',
        path: '/project-manager',
      },
    ],
  },
];

export const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
  { key: 'voice', label: '语音录入', icon: 'Mic' },
  { key: 'calendar', label: '日程日历', icon: 'CalendarDays', badge: 2 },
  { key: 'memo', label: '备忘录', icon: 'StickyNote' },
  { key: 'records', label: '工作记录', icon: 'FileClock', badge: 5 },
  { key: 'stats', label: '数据统计', icon: 'BarChart3' },
];

export const flowSteps = [
  '说一句话',
  'AI自动分类',
  '自动记录',
  '自动设置提醒',
  '自动生成报告',
];
