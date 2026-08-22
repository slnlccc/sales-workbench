import { useState } from 'react';
import {
  FileText, Calendar, Plane, Sparkles, Mic, Download, Copy,
  Plus, Trash2, MapPin, CheckCircle2, X, ChevronRight, FileCheck,
  Upload, Wand2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';

type ReportType = 'weekly' | 'trip' | null;

const reportTypes: { key: 'weekly' | 'trip'; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'weekly', label: '周工作周报', desc: '自动汇总本周工作记录，可编辑修改', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
  { key: 'trip', label: '出差报告', desc: '上传模板识别 · 语音填写 · 一键生成', icon: Plane, color: 'from-emerald-500 to-teal-500' },
];

interface CustomerInfo {
  customerName: string;
  contactName: string;
  contactTitle: string;
  contactInfo: string;
  relationLevel: string;
  influence: string;
  customerBackground: string;
  otherRelation: string;
}

interface TripForm {
  reportDate: string;
  traveler: string;
  travelDate: string;
  destination: string;
  purposeGetOpportunity: boolean;
  purposeNegotiateOrder: boolean;
  purposeMaintainRelation: boolean;
  purposeTechExchange: boolean;
  purposePayment: boolean;
  purposeHandleIssue: boolean;
  purposeOther: boolean;
  purposeOtherText: string;
  customers: CustomerInfo[];
  planAchievement: string;
  ownerCommunication: string;
  otherCommunication: string;
  otherGains: string;
  risks: string;
  helpNeeded: string;
  nextAction: string;
}

const initialTripForm: TripForm = {
  reportDate: '',
  traveler: '',
  travelDate: '',
  destination: '',
  purposeGetOpportunity: false,
  purposeNegotiateOrder: false,
  purposeMaintainRelation: false,
  purposeTechExchange: false,
  purposePayment: false,
  purposeHandleIssue: false,
  purposeOther: false,
  purposeOtherText: '',
  customers: [{ customerName: '', contactName: '', contactTitle: '', contactInfo: '', relationLevel: '', influence: '', customerBackground: '', otherRelation: '' }],
  planAchievement: '',
  ownerCommunication: '',
  otherCommunication: '',
  otherGains: '',
  risks: '',
  helpNeeded: '',
  nextAction: '',
};

const voiceSamples = {
  trip: {
    traveler: '之欧',
    destination: '北京',
    customers: '中国航发、航天科工',
    purpose: '推进GH4169机匣项目交付节点，沟通TC4钛合金技术方案',
    customer_itinerary: '中国航发项目组',
    content_itinerary: '确认GH4169机匣8月底交付节点，沟通热处理工艺细节',
    customer_visit: '中国航发',
    visitor_visit: '张总、李工',
    points_visit: 'GH4169机匣交付节点确认为8月底，客户对锻造工艺能力表示认可，希望加强热处理工艺沟通',
    feedback_visit: '客户反馈良好，对整体方案满意，期待后续合作',
    achievements: '获得2个项目阶段性进展，确认GH4169交付节点，TC4钛合金进入技术交流阶段',
    todos: '本周内提交TC4报价单；准备GH4169热处理工艺方案；安排下次技术交流',
  },
};

function formatDateForFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function downloadReport(type: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${formatDateForFilename()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ReportPage() {
  const { records, user } = useWorkbenchStore();
  const [activeType, setActiveType] = useState<ReportType>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{ type: string; content: string; date: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [tripForm, setTripForm] = useState<TripForm>(initialTripForm);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const [weeklyData, setWeeklyData] = useState({
    orderCount: 0,
    visitCount: 0,
    quoteCount: 0,
    callCount: 0,
    highlights: '1. 中国航发GH4169机匣锻件项目按计划推进，技术方案已确认\n2. 航天科工TC4钛合金项目进入技术交流阶段\n3. 润和机械增订2吨订单已排产',
    nextPlan: '1. 跟进中国航发商务报价\n2. 准备珠海航展资料\n3. 提交航天科工TC4报价单',
    support: '1. 请技术部协助出具GH4169热处理工艺方案\n2. 请商务组跟进航天科工框架协议',
  });

  const thisWeek = records.filter((r) => {
    const recordDate = new Date(r.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });

  const today = new Date().toLocaleDateString('zh-CN');

  const generateWeekly = () => {
    setGenerating(true);
    setTimeout(() => {
      const content = `【本周工作周报】
报告人：之欧（加入派克${Math.floor((new Date().getTime() - new Date(user?.joinDate || '2026-04-28').getTime()) / (1000 * 60 * 60 * 24))}天）
生成日期：${today}

一、本周概况
本周共完成 ${thisWeek.length} 条工作记录：
  · 订单 ${weeklyData.orderCount} 笔（合计 35.0万）
  · 客户拜访 ${weeklyData.visitCount} 次
  · 报价 ${weeklyData.quoteCount} 次
  · 电话跟进 ${weeklyData.callCount} 次

二、重点进展
${weeklyData.highlights}

三、下周计划
${weeklyData.nextPlan}

四、需支持事项
${weeklyData.support}`;
      setGeneratedReport({ type: '周工作周报', content, date: today });
      setGenerating(false);
    }, 1200);
  };

  const generateTrip = () => {
    setGenerating(true);
    setTimeout(() => {
      const reportDate = tripForm.reportDate || today;

      // 主要目的复选框
      const purposes: string[] = [];
      if (tripForm.purposeGetOpportunity) purposes.push('☑获取商机'); else purposes.push('☐获取商机');
      if (tripForm.purposeNegotiateOrder) purposes.push('☑洽谈订单'); else purposes.push('☐洽谈订单');
      if (tripForm.purposeMaintainRelation) purposes.push('☑维护关系'); else purposes.push('☐维护关系');
      if (tripForm.purposeTechExchange) purposes.push('☑技术交流'); else purposes.push('☐技术交流');
      if (tripForm.purposePayment) purposes.push('☑收款'); else purposes.push('☐收款');
      if (tripForm.purposeHandleIssue) purposes.push('☑处理问题'); else purposes.push('☐处理问题');
      if (tripForm.purposeOther) purposes.push('☑其它'); else purposes.push('☐其它');
      if (tripForm.purposeOther && tripForm.purposeOtherText) purposes.push(tripForm.purposeOtherText);

      // 多客户循环生成
      const customerSections = tripForm.customers
        .filter((c) => c.customerName || c.contactName)
        .map((c, i) => {
          return `客户单位名称：${c.customerName || '无'}
拜访客户姓名：${c.contactName || '无'}
客户职位：${c.contactTitle || '无'}
联系方式：${c.contactInfo || '无'}
关系层级：${c.relationLevel || '无'}
客户影响力：${c.influence || '无'}
客户背景：${c.customerBackground || '无'}
其它客户关系情况说明：${c.otherRelation || '无'}`;
        })
        .join('\n\n');

      const content = `出差报告
日报时间：${reportDate}

一、基本信息
出差人：${tripForm.traveler || '无'}
出差时间：${tripForm.travelDate || '无'}
出差地点：${tripForm.destination || '无'}

二、出差计划和目标
主要目的（可勾选）：${purposes.join(' ')}

三、出差对象（多客户循环生成，一个客户一组）
${customerSections || '客户单位名称：无\n拜访客户姓名：无\n客户职位：无\n联系方式：无\n关系层级：无\n客户影响力：无\n客户背景：无\n其它客户关系情况说明：无'}

四、出差日报总结（当天）
（一）计划事项达成情况
${tripForm.planAchievement || '无'}

大小业主交流记录（如项目启动、资金到位情况、项目设计进展等）：${tripForm.ownerCommunication || '无'}

其他人员交流记录：${tripForm.otherCommunication || '无'}

（二）其他收获（其他有价值信息，选填）
${tripForm.otherGains || '无'}

（三）风险（如业务风险、客户风险、技术风险、交付质量风险等，选填）
${tripForm.risks || '无'}

（四）求助（需要协调的资源，如高层出面、技术支持、内部资源协调等，选填）
${tripForm.helpNeeded || '无'}

（五）下一步行动计划（明确接下来需要推进的具体事项）
${tripForm.nextAction || '无'}`;

      setGeneratedReport({ type: '出差报告', content, date: reportDate });
      setGenerating(false);
    }, 1200);
  };

  const handleVoiceInput = () => {
    if (isVoiceRecording) {
      setVoiceText('明天去北京出差，拜访中国航发和航天科工，主要推进GH4169机匣项目交付，顺便沟通TC4钛合金技术方案');
      setIsVoiceRecording(false);
      if (activeType === 'trip') {
        setTripForm({
          ...initialTripForm,
          traveler: '之欧',
          destination: '北京',
          travelDate: '2026-07-15 至 2026-07-16',
          purposeGetOpportunity: true,
          purposeTechExchange: true,
          customers: [
            { customerName: '中国航发', contactName: '张总', contactTitle: '项目经理', contactInfo: '13800138000', relationLevel: '关键决策人', influence: '高', customerBackground: '航空发动机龙头央企，GH4169机匣锻件主要客户', otherRelation: '长期战略合作关系' },
            { customerName: '航天科工', contactName: '李工', contactTitle: '技术主管', contactInfo: '13900139000', relationLevel: '技术对接人', influence: '中', customerBackground: '航天科工集团，TC4钛合金项目潜在客户', otherRelation: '技术交流阶段' },
          ],
          planAchievement: '1. 中国航发GH4169机匣锻件8月底交付节点已确认，客户对热处理工艺改进表示认可\n2. 航天科工TC4钛合金进入技术交流阶段，对方提出希望提供更多样件测试数据',
          ownerCommunication: '中国航发项目组确认项目资金已到位，设计进展顺利，8月底交付节点无变动',
          otherCommunication: '与航天科工采购部王经理交流，了解下半年采购计划',
          otherGains: '行业信息：核电锻件市场需求增长，竞品报价偏低5%-8%',
          risks: '交付质量风险：GH4169热处理工艺需加强质量控制',
          helpNeeded: '需要技术部协助出具GH4169热处理工艺方案',
          nextAction: '1. 本周内提交TC4钛合金报价单（商机跟进）\n2. 推进GH4169交付合同确认（合同推进）\n3. 安排下次技术交流（客户回访）',
        });
      }
    } else {
      setIsVoiceRecording(true);
    }
  };

  const handleCopy = async () => {
    if (!generatedReport) return;
    const ok = await copyToClipboard(generatedReport.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleExport = () => {
    if (!generatedReport) return;
    downloadReport(generatedReport.type, generatedReport.content);
  };

  const resetGenerator = () => {
    setGeneratedReport(null);
    setActiveType(null);
    setTripForm(initialTripForm);
    setVoiceText('');
  };

  const updateField = <K extends keyof TripForm>(key: K, value: TripForm[K]) => {
    setTripForm((prev) => ({ ...prev, [key]: value }));
  };
  const updateCustomer = (idx: number, key: keyof CustomerInfo, value: string) => {
    setTripForm((prev) => ({
      ...prev,
      customers: prev.customers.map((c, i) => (i === idx ? { ...c, [key]: value } : c)),
    }));
  };

  const inputClass = 'flex-1 px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300';

  return (
    <Layout>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coffee-600 to-caramel flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-coffee-900 font-display">报告生成</h1>
                <p className="text-xs text-coffee-500">一键生成各类报告</p>
              </div>
            </div>
            {activeType && (
              <button
                onClick={resetGenerator}
                className="px-3 py-2 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-200 hover:bg-coffee-50 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span>返回选择</span>
              </button>
            )}
          </div>

          {generatedReport ? (
            <div className="bg-white rounded-3xl p-8 shadow-soft animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-coffee-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-coffee-900">{generatedReport.type}</h3>
                    <p className="text-xs text-coffee-500">{generatedReport.date} 自动生成</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                      copied ? 'bg-emerald-100 text-emerald-700' : 'text-coffee-600 hover:bg-coffee-50'
                    )}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '已复制' : '复制'}</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-coffee-600 to-caramel text-white rounded-lg hover:opacity-90"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出</span>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-coffee-50 to-cream border border-coffee-200 rounded-2xl p-6 font-mono text-sm text-coffee-800 whitespace-pre-line leading-relaxed">
                {generatedReport.content}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-coffee-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>本报告由 AI 自动生成，可复制使用或导出为文本文件</span>
              </div>
            </div>
          ) : !activeType ? (
            <>
              <div
                onClick={() => setShowTypePicker(true)}
                className="bg-white rounded-3xl p-10 shadow-soft flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-coffee-500 to-caramel flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-md">
                  <FileCheck className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-coffee-900 mb-2">选择报告类型开始生成</h3>
                <p className="text-sm text-coffee-500 mb-5">周工作周报、出差报告 · AI 自动汇总 · 一键导出</p>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coffee-600 to-caramel text-white rounded-full text-sm font-medium shadow-sm group-hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4" />
                  <span>点击开始生成</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {reportTypes.map((rt) => {
                  const Icon = rt.icon;
                  return (
                    <button
                      key={rt.key}
                      onClick={() => setActiveType(rt.key)}
                      className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all text-left group"
                    >
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', rt.color)}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-base font-semibold text-coffee-900 mb-1">{rt.label}</h4>
                      <p className="text-xs text-coffee-500 mb-3">{rt.desc}</p>
                      <div className="flex items-center gap-1 text-xs text-caramel font-medium">
                        <span>立即生成</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : activeType === 'weekly' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-coffee-900">周工作周报</h3>
                    <p className="text-xs text-coffee-500">数据由日程日历、工作记录、数据统计自动汇总，可修改</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-cream rounded-xl p-3 text-center">
                    <p className="text-xs text-coffee-500 mb-1">订单</p>
                    <input
                      type="number"
                      value={weeklyData.orderCount}
                      onChange={(e) => setWeeklyData({ ...weeklyData, orderCount: parseInt(e.target.value) || 0 })}
                      className="w-full text-center text-lg font-bold text-coffee-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-xs font-normal text-coffee-500">笔</span>
                  </div>
                  <div className="bg-cream rounded-xl p-3 text-center">
                    <p className="text-xs text-coffee-500 mb-1">拜访</p>
                    <input
                      type="number"
                      value={weeklyData.visitCount}
                      onChange={(e) => setWeeklyData({ ...weeklyData, visitCount: parseInt(e.target.value) || 0 })}
                      className="w-full text-center text-lg font-bold text-coffee-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-xs font-normal text-coffee-500">次</span>
                  </div>
                  <div className="bg-cream rounded-xl p-3 text-center">
                    <p className="text-xs text-coffee-500 mb-1">报价</p>
                    <input
                      type="number"
                      value={weeklyData.quoteCount}
                      onChange={(e) => setWeeklyData({ ...weeklyData, quoteCount: parseInt(e.target.value) || 0 })}
                      className="w-full text-center text-lg font-bold text-coffee-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-xs font-normal text-coffee-500">次</span>
                  </div>
                  <div className="bg-cream rounded-xl p-3 text-center">
                    <p className="text-xs text-coffee-500 mb-1">电话</p>
                    <input
                      type="number"
                      value={weeklyData.callCount}
                      onChange={(e) => setWeeklyData({ ...weeklyData, callCount: parseInt(e.target.value) || 0 })}
                      className="w-full text-center text-lg font-bold text-coffee-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-xs font-normal text-coffee-500">次</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">重点进展</label>
                    <textarea
                      value={weeklyData.highlights}
                      onChange={(e) => setWeeklyData({ ...weeklyData, highlights: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">下周计划</label>
                    <textarea
                      value={weeklyData.nextPlan}
                      onChange={(e) => setWeeklyData({ ...weeklyData, nextPlan: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">需支持事项</label>
                    <textarea
                      value={weeklyData.support}
                      onChange={(e) => setWeeklyData({ ...weeklyData, support: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={generateWeekly}
                disabled={generating}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>正在生成...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>一键生成周报</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    isVoiceRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                  )}>
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-coffee-900">语音输入出差信息</h3>
                    <p className="text-xs text-coffee-500">点击麦克风开始说话，AI自动识别并填充到模板</p>
                  </div>
                  <button
                    onClick={handleVoiceInput}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      isVoiceRecording
                        ? 'bg-red-500 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    )}
                  >
                    {isVoiceRecording ? '停止录音' : '开始语音输入'}
                  </button>
                </div>
                {voiceText && (
                  <div className="bg-white/60 rounded-xl p-3 text-sm text-coffee-700">
                    <span className="text-xs text-emerald-600 font-medium mr-2">识别结果：</span>
                    {voiceText}
                  </div>
                )}
              </div>

              {/* 一、基本信息 */}
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-coffee-900">一、基本信息</h3>
                    <p className="text-xs text-coffee-500">出差人、时间、地点</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">日报时间</label>
                    <input type="date" value={tripForm.reportDate} onChange={(e) => updateField('reportDate', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">出差人</label>
                    <input value={tripForm.traveler} onChange={(e) => updateField('traveler', e.target.value)} placeholder="请输入出差人" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">出差时间</label>
                    <input value={tripForm.travelDate} onChange={(e) => updateField('travelDate', e.target.value)} placeholder="如 2026-07-15 至 2026-07-16" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">出差地点</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cream">
                      <MapPin className="w-4 h-4 text-coffee-400 flex-shrink-0" />
                      <input value={tripForm.destination} onChange={(e) => updateField('destination', e.target.value)} placeholder="请输入出差地点" className="flex-1 bg-transparent text-sm text-coffee-800 focus:outline-none placeholder:text-coffee-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 二、出差计划和目标 */}
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  二、出差计划和目标 — 主要目的（可勾选）
                </h4>
                <div className="flex flex-wrap gap-3">
                  {([
                    { key: 'purposeGetOpportunity', label: '获取商机' },
                    { key: 'purposeNegotiateOrder', label: '洽谈订单' },
                    { key: 'purposeMaintainRelation', label: '维护关系' },
                    { key: 'purposeTechExchange', label: '技术交流' },
                    { key: 'purposePayment', label: '收款' },
                    { key: 'purposeHandleIssue', label: '处理问题' },
                    { key: 'purposeOther', label: '其它' },
                  ] as const).map((item) => (
                    <label key={item.key} className="flex items-center gap-1.5 px-3 py-2 bg-cream rounded-xl cursor-pointer hover:bg-coffee-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={tripForm[item.key]}
                        onChange={(e) => updateField(item.key, e.target.checked as any)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span className="text-sm text-coffee-700">{item.label}</span>
                    </label>
                  ))}
                </div>
                {tripForm.purposeOther && (
                  <input
                    value={tripForm.purposeOtherText}
                    onChange={(e) => updateField('purposeOtherText', e.target.value)}
                    placeholder="请输入其它目的说明"
                    className="w-full mt-3 px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300"
                  />
                )}
              </div>

              {/* 三、出差对象 */}
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-coffee-900 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-amber-500" />
                    三、出差对象（多客户循环生成）
                  </h4>
                  <button
                    onClick={() => updateField('customers', [...tripForm.customers, { customerName: '', contactName: '', contactTitle: '', contactInfo: '', relationLevel: '', influence: '', customerBackground: '', otherRelation: '' }])}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加客户</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {tripForm.customers.map((c, idx) => (
                    <div key={idx} className="p-3 bg-cream rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-coffee-600">客户 {idx + 1}</span>
                        {tripForm.customers.length > 1 && (
                          <button
                            onClick={() => updateField('customers', tripForm.customers.filter((_, i) => i !== idx))}
                            className="text-coffee-400 hover:text-alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={c.customerName} onChange={(e) => updateCustomer(idx, 'customerName', e.target.value)} placeholder="客户单位名称" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                        <input value={c.contactName} onChange={(e) => updateCustomer(idx, 'contactName', e.target.value)} placeholder="拜访客户姓名" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                        <input value={c.contactTitle} onChange={(e) => updateCustomer(idx, 'contactTitle', e.target.value)} placeholder="客户职位" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                        <input value={c.contactInfo} onChange={(e) => updateCustomer(idx, 'contactInfo', e.target.value)} placeholder="联系方式" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                        <input value={c.relationLevel} onChange={(e) => updateCustomer(idx, 'relationLevel', e.target.value)} placeholder="关系层级" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                        <input value={c.influence} onChange={(e) => updateCustomer(idx, 'influence', e.target.value)} placeholder="客户影响力" className="px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                      </div>
                      <input value={c.customerBackground} onChange={(e) => updateCustomer(idx, 'customerBackground', e.target.value)} placeholder="客户背景" className="w-full px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                      <input value={c.otherRelation} onChange={(e) => updateCustomer(idx, 'otherRelation', e.target.value)} placeholder="其它客户关系情况说明" className="w-full px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 四、出差日报总结 */}
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  四、出差日报总结（当天）
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">（一）计划事项达成情况</label>
                    <textarea value={tripForm.planAchievement} onChange={(e) => updateField('planAchievement', e.target.value)} placeholder="请输入计划达成详情" rows={3} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">大小业主交流记录（如项目启动、资金到位情况、项目设计进展等）</label>
                    <textarea value={tripForm.ownerCommunication} onChange={(e) => updateField('ownerCommunication', e.target.value)} placeholder="请输入业主交流记录" rows={2} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">其他人员交流记录</label>
                    <textarea value={tripForm.otherCommunication} onChange={(e) => updateField('otherCommunication', e.target.value)} placeholder="请输入其他人员交流记录" rows={2} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">（二）其他收获（其他有价值信息，选填）</label>
                    <textarea value={tripForm.otherGains} onChange={(e) => updateField('otherGains', e.target.value)} placeholder="包含行业、竞品、市场机会等信息" rows={2} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">（三）风险（选填）</label>
                    <textarea value={tripForm.risks} onChange={(e) => updateField('risks', e.target.value)} placeholder="如业务风险、客户风险、技术风险、交付质量风险等" rows={2} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">（四）求助（需要协调的资源，选填）</label>
                    <textarea value={tripForm.helpNeeded} onChange={(e) => updateField('helpNeeded', e.target.value)} placeholder="如高层出面、技术支持、内部资源协调等" rows={2} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">（五）下一步行动计划</label>
                    <textarea value={tripForm.nextAction} onChange={(e) => updateField('nextAction', e.target.value)} placeholder="明确接下来需要推进的具体事项，区分商机跟进、合同推进、回款、内部协同、客户回访节点" rows={3} className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTripForm(initialTripForm)}
                  className="flex-1 py-3 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-300 hover:bg-coffee-50"
                >
                  清空表单
                </button>
                <button
                  onClick={generateTrip}
                  disabled={generating}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>正在生成...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>一键生成出差报告</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
      {showTypePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTypePicker(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-coffee-100 text-center">
              <h3 className="text-xl font-semibold text-coffee-900 font-display mb-1">选择报告类型</h3>
              <p className="text-sm text-coffee-500">AI 智能生成，支持编辑与导出</p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {reportTypes.map((rt) => {
                const Icon = rt.icon;
                return (
                  <button
                    key={rt.key}
                    onClick={() => {
                      setActiveType(rt.key);
                      setShowTypePicker(false);
                    }}
                    className="bg-cream hover:bg-coffee-50 rounded-2xl p-6 transition-all text-left group hover:shadow-card hover:-translate-y-0.5 border border-transparent hover:border-coffee-200"
                  >
                    <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform', rt.color)}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="text-base font-semibold text-coffee-900 mb-1.5">{rt.label}</h4>
                    <p className="text-xs text-coffee-500 mb-3 leading-relaxed">{rt.desc}</p>
                    <div className="flex items-center gap-1 text-xs font-medium text-caramel">
                      <span>开始生成</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-coffee-100 flex justify-center">
              <button
                onClick={() => setShowTypePicker(false)}
                className="px-6 py-2 text-sm text-coffee-500 hover:text-coffee-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
