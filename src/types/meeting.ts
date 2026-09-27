export type MeetingCategory = '会议纪要' | '方法论' | '待办' | '感悟';
export type MeetingSource = 'feishu' | 'manual';

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  source: MeetingSource;
  category: MeetingCategory;
  author: string;
  customer?: string;
  content: string;
  tags: string[];
  todos: string[];
  insights: string[];
  aiComment?: string;          // AI 对会议的整体点评
  completed: boolean;
  url?: string;              // 飞书妙记原文链接
}
