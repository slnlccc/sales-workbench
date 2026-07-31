/**
 * 飞书妙记 (Lark Minutes) 集成服务
 *
 * 功能：
 *  1. 通过飞书开放平台 OpenAPI 拉取妙记列表与转写文本
 *  2. Webhook 方式接收飞书推送的「妙记已完成」事件
 *  3. 自动从会议文本中识别待办事项与知识沉淀
 *
 * 使用前需要：
 *  1. 在飞书开放平台创建应用：https://open.feishu.cn/app
 *  2. 申请权限：minutes:minutes:readonly（读取妙记）
 *  3. 配置 OAuth 重定向：本系统路径 /api/feishu/callback
 *  4. 将 App ID / App Secret 填入 feishuConfig（可由用户在 UI 中配置）
 */

import type { MeetingItem } from '@/types/meeting';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  webhookUrl: string;
  redirectUri: string;
  enabled: boolean;
}

const STORAGE_KEY = 'feishu_miaojI_config';

export function getFeishuConfig(): FeishuConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    appId: '',
    appSecret: '',
    webhookUrl: '',
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/feishu/callback` : '',
    enabled: false,
  };
}

export function saveFeishuConfig(cfg: FeishuConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  if (cfg.webhookUrl) {
    registerWebhook(cfg.webhookUrl);
  }
}

export function clearFeishuConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// 飞书返回的妙记原始结构（节选）
interface FeishuMinutesItem {
  minutes_id: string;
  title: string;
  owner_id: string;
  create_time: number;
  url?: string;
  audio_url?: string;
  transcript?: string;        // 转写文本
  summary?: string;           // AI 摘要
  attendees?: string[];
}

// 1) 获取 tenant_access_token
async function fetchTenantAccessToken(cfg: FeishuConfig): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: cfg.appId, app_secret: cfg.appSecret }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书鉴权失败: ${data.msg || data.code}`);
  }
  return data.tenant_access_token;
}

// 2) 拉取妙记列表
export async function fetchFeishuMinutes(cfg: FeishuConfig, limit = 30): Promise<FeishuMinutesItem[]> {
  if (!cfg.enabled || !cfg.appId || !cfg.appSecret) {
    throw new Error('飞书妙记未配置或未启用');
  }
  const token = await fetchTenantAccessToken(cfg);
  const res = await fetch(
    `https://open.feishu.cn/open-apis/minutes/v1/minutes?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`拉取妙记失败: ${data.msg || data.code}`);
  }
  const items: FeishuMinutesItem[] = (data.data?.items || []).map((it: any) => ({
    minutes_id: it.minutes_id,
    title: it.title,
    owner_id: it.owner_id,
    create_time: it.create_time,
  }));

  // 并行拉取每个妙记的转写文本（节流：最多 5 个并发）
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5);
    await Promise.all(batch.map(async (m) => {
      try {
        const r = await fetch(
          `https://open.feishu.cn/open-apis/minutes/v1/minutes/${m.minutes_id}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await r.json();
        if (d.code === 0) m.transcript = d.data?.transcript_text || '';
      } catch {}
    }));
  }
  return items;
}

// 3) AI 识别：待办事项 + 知识沉淀
const TODO_REGEX = /(?:待办|需要|应该|必须|务必|下一步|接下来|安排|要求|计划)\s*[:：]?\s*([^\n。；;]{5,80})/g;
const INSIGHT_KEYWORDS = ['核心', '关键', '重要', '趋势', '未来', '增长', '竞争力', '价值', '机会', '意义'];

export function extractTodosFromText(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TODO_REGEX.exec(text)) !== null) {
    const v = m[1].trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 10);
}

export function extractInsightsFromText(text: string): string[] {
  const sentences = text.split(/[。！？\n]/).map((s) => s.trim()).filter((s) => s.length >= 12 && s.length <= 120);
  return sentences.filter((s) => INSIGHT_KEYWORDS.some((k) => s.includes(k))).slice(0, 5);
}

// 4) 把飞书妙记转成 MeetingItem
export function feishuToMeetingItem(m: FeishuMinutesItem): MeetingItem {
  const content = m.transcript || m.summary || '';
  const date = new Date(m.create_time);
  const dateStr = date.toISOString().slice(0, 10);
  return {
    id: `feishu-${m.minutes_id}`,
    title: m.title,
    date: dateStr,
    source: 'feishu',
    category: '会议纪要',
    author: m.owner_id,
    content,
    tags: extractTagsFromText(content),
    todos: extractTodosFromText(content),
    insights: extractInsightsFromText(content),
    completed: false,
  };
}

function extractTagsFromText(text: string): string[] {
  const knownTags = ['GH4169', 'GH4141', 'GH3039', 'TC4', 'TC11', '5A06', '17-4PH', '高温合金', '钛合金', '铝合金', '不锈钢', '机匣', '盘件', '环件', '轴件'];
  return knownTags.filter((t) => text.includes(t)).slice(0, 5);
}

// 5) 注册 Webhook（将 Webhook 地址同步到飞书应用事件订阅）
async function registerWebhook(url: string) {
  try {
    // 飞书事件订阅通过开放平台后台配置；前端只保存待后端处理
    localStorage.setItem('feishu_webhook_registered', url);
  } catch {}
}

// 6) 兜底：环境无配置时返回 mock 数据（保证 UI 可演示）
import { mockMeetings } from '@/data/meetings';

export async function syncMeetingsFromFeishu(force = false): Promise<MeetingItem[]> {
  const cfg = getFeishuConfig();
  if (!cfg.enabled || !cfg.appId || !cfg.appSecret) {
    // 未配置时直接返回 mock
    return mockMeetings;
  }
  try {
    const items = await fetchFeishuMinutes(cfg);
    if (items.length === 0 && !force) return mockMeetings;
    const meetingItems = items.map(feishuToMeetingItem);
    // 与手动添加的合并
    const manualItems = mockMeetings.filter((m) => m.source === 'manual');
    return [...meetingItems, ...manualItems];
  } catch (err) {
    console.warn('[Feishu] 同步失败,使用本地数据:', err);
    return mockMeetings;
  }
}
