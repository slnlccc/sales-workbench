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
  // OAuth user token（拉取用户私有妙记所必需，飞书妙记是用户级数据）
  userAccessToken?: string;
  userRefreshToken?: string;
  userExpiresAt?: number;  // 毫秒时间戳
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

// 单独更新 user token（避免每次授权后要重新填整个 config）
export function saveUserToken(token: {
  userAccessToken: string;
  userRefreshToken?: string;
  userExpiresAt?: number;
}) {
  const cfg = getFeishuConfig();
  saveFeishuConfig({
    ...cfg,
    userAccessToken: token.userAccessToken,
    userRefreshToken: token.userRefreshToken || cfg.userRefreshToken,
    userExpiresAt: token.userExpiresAt,
  });
}

export function clearUserToken() {
  const cfg = getFeishuConfig();
  saveFeishuConfig({
    ...cfg,
    userAccessToken: undefined,
    userRefreshToken: undefined,
    userExpiresAt: undefined,
  });
}

// 是否已授权（有可用的 user token）
export function isUserAuthorized(): boolean {
  const cfg = getFeishuConfig();
  return !!(cfg.userAccessToken);
}

// 触发 OAuth 授权流程：打开子窗口跳转 /api/feishu/login
// 子窗口回调后通过 postMessage 把 code 传回，由 listener 处理
export function startUserAuth(onSuccess?: () => void, onError?: (msg: string) => void) {
  const cfg = getFeishuConfig();
  if (!cfg.appId) {
    onError?.('请先在飞书配置中填入 App ID');
    return;
  }

  const url = `/api/feishu/login?app_id=${encodeURIComponent(cfg.appId)}&state=sw`;
  const popup = window.open(url, 'feishu_auth', 'width=600,height=700');

  const onMessage = (e: MessageEvent) => {
    if (e.data?.type !== 'feishu:auth-code') return;
    window.removeEventListener('message', onMessage);
    const code = e.data.code as string;
    if (!code) {
      onError?.('未收到授权 code');
      return;
    }
    // 用 code 换 user token
    exchangeUserToken(cfg, code)
      .then((ok) => {
        if (ok) onSuccess?.();
        else onError?.('换取 user token 失败');
      })
      .catch((err) => onError?.(err.message || '换取 user token 失败'));
  };
  window.addEventListener('message', onMessage);

  // 30 秒后自动清理 listener，避免内存泄漏
  setTimeout(() => {
    window.removeEventListener('message', onMessage);
    if (popup && !popup.closed) popup.close();
  }, 5 * 60 * 1000);
}

// 用 OAuth code 换 user_access_token（调后端 /api/feishu/exchange-user-token）
async function exchangeUserToken(cfg: FeishuConfig, code: string): Promise<boolean> {
  try {
    const res = await fetch('/api/feishu/exchange-user-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: cfg.appId,
        appSecret: cfg.appSecret,
        code,
        redirectUri: cfg.redirectUri || `${window.location.origin}/api/feishu/callback`,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Feishu] exchangeUserToken:', data.message);
      return false;
    }
    saveUserToken({
      userAccessToken: data.accessToken,
      userRefreshToken: data.refreshToken,
      userExpiresAt: data.expiresAt,
    });
    return true;
  } catch (err) {
    console.error('[Feishu] exchangeUserToken error:', err);
    return false;
  }
}

export function clearFeishuConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// 飞书返回的妙记原始结构（节选）
interface FeishuChapter {
  start_ms?: string;
  stop_ms?: string;
  summary_content?: string;
  title?: string;
}

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
  chapters?: FeishuChapter[]; // AI 智能章节
  keywords?: string[];        // AI 关键词
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
  // 把 summary + chapters + keywords 拼成完整会议内容
  // chapters 是飞书 AI 自动分章节总结，keywords 是关键词条目
  const parts: string[] = [];

  if (m.summary) {
    parts.push('【AI 总结】');
    parts.push(m.summary);
    parts.push('');
  }

  if (m.chapters && m.chapters.length > 0) {
    parts.push('【智能章节】');
    m.chapters.forEach((ch, idx) => {
      const title = ch.title || `章节 ${idx + 1}`;
      const content = ch.summary_content || '';
      parts.push(`${idx + 1}. ${title}`);
      if (content) parts.push(content);
    });
    parts.push('');
  }

  if (m.keywords && m.keywords.length > 0) {
    parts.push('【关键词】');
    parts.push(m.keywords.join('、'));
    parts.push('');
  }

  if (m.transcript) {
    parts.push('【转写原文】');
    parts.push(m.transcript);
  }

  const content = parts.join('\n');

  // create_time 可能是：0（拉详情失败 fallback）、数字秒、数字毫秒、ISO 字符串、或无效值
  // 用 try-catch 兜底，任何异常都 fallback 用今天日期
  let dateStr: string;
  try {
    const ct = m.create_time as any;
    let dateMs: number = Date.now(); // 默认用今天

    if (typeof ct === 'number' && ct > 0) {
      // 数字：判断是秒还是毫秒
      dateMs = ct < 1e12 ? ct * 1000 : ct;
    } else if (typeof ct === 'string' && ct) {
      // 字符串：可能是 ISO 或 unix 字符串
      const parsed = Date.parse(ct);
      if (!isNaN(parsed)) dateMs = parsed;
      else {
        // 尝试作为 unix 时间戳解析
        const n = Number(ct);
        if (!isNaN(n) && n > 0) dateMs = n < 1e12 ? n * 1000 : n;
      }
    }
    // dateMs 一定是有效毫秒数
    dateStr = new Date(dateMs).toISOString().slice(0, 10);
  } catch (e) {
    // 任何异常都用今天日期兜底
    dateStr = new Date().toISOString().slice(0, 10);
  }

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
    url: m.url,
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

// 调后端代理拉取真实妙记（后端用 axios 调飞书 API，绕过浏览器 CORS）
// 走统一 request 函数：401 时会自动 refresh token + 重试，避免直接抛"未授权"
import { request } from '@/services/api';

// user token 路径（owner_ids=me 能拉到用户私有的妙记）
async function fetchFromBackendAsUser(cfg: FeishuConfig): Promise<FeishuMinutesItem[]> {
  const data = await request('/feishu/sync-user', {
    method: 'POST',
    body: JSON.stringify({
      appId: cfg.appId,
      appSecret: cfg.appSecret,
      userAccessToken: cfg.userAccessToken,
      userRefreshToken: cfg.userRefreshToken,
      userExpiresAt: cfg.userExpiresAt,
    }),
  });
  // 若后端自动 refresh 了 token，更新到本地
  if (data.refreshedToken) {
    saveUserToken({
      userAccessToken: data.refreshedToken.accessToken,
      userRefreshToken: data.refreshedToken.refreshToken,
      userExpiresAt: data.refreshedToken.expiresAt,
    });
  }
  if (data.source !== 'real' || !Array.isArray(data.items) || data.items.length === 0) {
    // 把 user token 前缀附在错误信息里，方便定位 token 格式问题
    const tokenPrefix = cfg.userAccessToken
      ? `（token前缀: ${cfg.userAccessToken.substring(0, 15)}..., 长度: ${cfg.userAccessToken.length}）`
      : '（无 user token）';
    throw new Error((data?.message || '后端未返回真实妙记数据') + tokenPrefix);
  }
  return data.items as FeishuMinutesItem[];
}

// bot token 路径（tenant token，搜不到用户私有妙记，作为兜底）
async function fetchFromBackend(cfg: FeishuConfig): Promise<FeishuMinutesItem[]> {
  const data = await request('/feishu/sync', {
    method: 'POST',
    body: JSON.stringify({ appId: cfg.appId, appSecret: cfg.appSecret }),
  });
  if (data.source !== 'real' || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(data?.message || '后端未返回真实妙记数据');
  }
  return data.items as FeishuMinutesItem[];
}

// 调用后端 AI 接口，批量提取待办事项和知识沉淀
async function extractWithAI(meetings: MeetingItem[]): Promise<MeetingItem[]> {
  if (!meetings.length) return meetings;
  try {
    const payload = meetings.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
    }));
    const data = await request('/feishu/extract-ai', {
      method: 'POST',
      body: JSON.stringify({ meetings: payload }),
    });
    if (!data?.results || !Array.isArray(data.results)) return meetings;

    const resultMap = new Map(data.results.map((r: any) => [r.id, r]));
    return meetings.map((m) => {
      const r = resultMap.get(m.id);
      if (!r) return m;
      return {
        ...m,
        // AI 提取结果覆盖正则提取；若 AI 失败（error），保留原正则结果
        todos: r.todos && r.todos.length > 0 ? r.todos : m.todos,
        insights: r.insights && r.insights.length > 0 ? r.insights : m.insights,
      };
    });
  } catch (e: any) {
    // AI 提取失败不阻断同步，保留正则提取的结果
    console.warn('[extractWithAI] AI 提取失败，使用正则结果:', e?.message);
    return meetings;
  }
}

export async function syncMeetingsFromFeishu(force = false): Promise<MeetingItem[]> {
  const cfg = getFeishuConfig();
  if (!cfg.enabled || !cfg.appId || !cfg.appSecret) {
    // 未配置时直接返回 mock（初始演示态，合理）
    return mockMeetings;
  }
  // 优先用 user_access_token 拉用户私有妙记（飞书妙记是用户级数据）
  // 没授权就抛错，让 UI 引导用户点"飞书授权登录"
  if (cfg.userAccessToken) {
    const items = await fetchFromBackendAsUser(cfg);
    if (items.length === 0 && !force) return mockMeetings;
    let meetingItems = items.map(feishuToMeetingItem);
    const manualItems = mockMeetings.filter((m) => m.source === 'manual');
    const allItems = [...meetingItems, ...manualItems];
    // 用 AI 精准提取待办事项和知识沉淀（失败则保留正则结果）
    return await extractWithAI(allItems);
  }
  // 没授权 → 提示用户去授权（而不是默默用 bot token 搜不到）
  throw new Error('请先点击"飞书授权登录"完成 OAuth 授权，飞书妙记是用户私有数据，必须用 user token 才能拉取');
}
