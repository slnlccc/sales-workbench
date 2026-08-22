import { useState } from 'react';
import { FileText, Sparkles, Calendar, User, CheckCircle2, Download, Mic, Square, ArrowLeft, X, Copy, MapPin, Users, Briefcase } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

type View = 'menu' | 'trip-form' | 'report';

interface TripFormState {
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
  customerName: string;
  contactName: string;
  contactTitle: string;
  contactInfo: string;
  relationLevel: string;
  influence: string;
  customerBackground: string;
  otherRelation: string;
  planAchievement: string;
  ownerCommunication: string;
  otherCommunication: string;
  otherGains: string;
  risks: string;
  helpNeeded: string;
  nextAction: string;
}

const emptyTripForm: TripFormState = {
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
  customerName: '',
  contactName: '',
  contactTitle: '',
  contactInfo: '',
  relationLevel: '',
  influence: '',
  customerBackground: '',
  otherRelation: '',
  planAchievement: '',
  ownerCommunication: '',
  otherCommunication: '',
  otherGains: '',
  risks: '',
  helpNeeded: '',
  nextAction: '',
};

// 模拟语音填写后的样例数据
const mockVoiceTripData: TripFormState = {
  ...emptyTripForm,
  traveler: '之欧',
  travelDate: '2026-07-15 至 2026-07-16',
  destination: '北京',
  purposeGetOpportunity: true,
  purposeTechExchange: true,
  customerName: '中国航发',
  contactName: '张总',
  contactTitle: '项目经理',
  contactInfo: '13800138000',
  relationLevel: '关键决策人',
  influence: '高',
  customerBackground: '航空发动机龙头央企，GH4169机匣锻件主要客户',
  otherRelation: '长期战略合作关系',
  planAchievement: '1. 中国航发GH4169机匣锻件8月底交付节点已确认\n2. 航天科工TC4钛合金进入技术交流阶段',
  ownerCommunication: '项目资金已到位，设计进展顺利',
  otherCommunication: '与采购部王经理交流了解下半年采购计划',
  otherGains: '核电锻件市场需求增长，竞品报价偏低5%-8%',
  risks: 'GH4169热处理工艺需加强质量控制',
  helpNeeded: '需要技术部协助出具热处理工艺方案',
  nextAction: '1. 提交TC4报价单\n2. 推进交付合同确认\n3. 安排下次技术交流',
};

const tripFields: { key: keyof TripFormState; label: string; placeholder: string; multiline?: boolean; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'reportDate', label: '日报时间', placeholder: '如 2026-07-16', icon: Calendar },
  { key: 'traveler', label: '出差人', placeholder: '请输入出差人姓名', icon: User },
  { key: 'travelDate', label: '出差时间', placeholder: '如 2026-07-15 至 2026-07-16', icon: Calendar },
  { key: 'destination', label: '出差地点', placeholder: '请输入出差地点', icon: MapPin },
  { key: 'customerName', label: '客户单位名称', placeholder: '请输入客户单位名称', icon: Users },
  { key: 'contactName', label: '拜访客户姓名', placeholder: '请输入拜访客户姓名', icon: User },
  { key: 'contactTitle', label: '客户职位', placeholder: '请输入客户职位', icon: Briefcase },
  { key: 'contactInfo', label: '联系方式', placeholder: '请输入联系方式', icon: FileText },
  { key: 'relationLevel', label: '关系层级', placeholder: '如 关键决策人/技术对接人', icon: Users },
  { key: 'influence', label: '客户影响力', placeholder: '如 高/中/低', icon: CheckCircle2 },
  { key: 'customerBackground', label: '客户背景', placeholder: '请输入客户背景', multiline: true, icon: FileText },
  { key: 'otherRelation', label: '其它客户关系情况说明', placeholder: '请输入其它客户关系情况', multiline: true, icon: FileText },
  { key: 'planAchievement', label: '计划事项达成情况', placeholder: '请输入计划达成详情', multiline: true, icon: CheckCircle2 },
  { key: 'ownerCommunication', label: '大小业主交流记录', placeholder: '如项目启动、资金到位情况、项目设计进展等', multiline: true, icon: FileText },
  { key: 'otherCommunication', label: '其他人员交流记录', placeholder: '请输入其他人员交流记录', multiline: true, icon: FileText },
  { key: 'otherGains', label: '其他收获（选填）', placeholder: '包含行业、竞品、市场机会等信息', multiline: true, icon: FileText },
  { key: 'risks', label: '风险（选填）', placeholder: '如业务风险、客户风险、技术风险等', multiline: true, icon: FileText },
  { key: 'helpNeeded', label: '求助（选填）', placeholder: '如高层出面、技术支持、内部资源协调等', multiline: true, icon: FileText },
  { key: 'nextAction', label: '下一步行动计划', placeholder: '区分商机跟进、合同推进、回款、内部协同、客户回访节点', multiline: true, icon: CheckCircle2 },
];

const purposeCheckboxes: { key: keyof TripFormState; label: string }[] = [
  { key: 'purposeGetOpportunity', label: '获取商机' },
  { key: 'purposeNegotiateOrder', label: '洽谈订单' },
  { key: 'purposeMaintainRelation', label: '维护关系' },
  { key: 'purposeTechExchange', label: '技术交流' },
  { key: 'purposePayment', label: '收款' },
  { key: 'purposeHandleIssue', label: '处理问题' },
  { key: 'purposeOther', label: '其它' },
];

export default function ReportGenerator() {
  const { records, user } = useWorkbenchStore();
  const [view, setView] = useState<View>('menu');
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<{ type: string; content: string; date: string } | null>(null);
  const [tripForm, setTripForm] = useState<TripFormState>(emptyTripForm);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const thisWeek = records.filter((r) => {
    const recordDate = new Date(r.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });

  const generateWeekly = () => {
    setGeneratingType('weekly');
    setTimeout(() => {
      const today = new Date().toLocaleDateString('zh-CN');
      const orderCount = records.filter((r) => r.type === 'order').length;
      const visitCount = records.filter((r) => r.type === 'visit').length;
      const quoteCount = records.filter((r) => r.type === 'quote').length;
      const callCount = records.filter((r) => r.type === 'call').length;

      const content = `【本周工作周报】
报告人：之欧（加入派克${Math.floor((new Date().getTime() - new Date(user.joinDate || '2026-04-28').getTime()) / (1000 * 60 * 60 * 24))}天）
生成日期：${today}

一、本周概况
本周共完成 ${thisWeek.length} 条工作记录：
  · 订单 ${orderCount} 笔（合计 35.0万）
  · 客户拜访 ${visitCount} 次
  · 报价 ${quoteCount} 次
  · 电话跟进 ${callCount} 次

二、重点进展
  1. 中国航发GH4169机匣锻件项目按计划推进，技术方案已确认
  2. 航天科工TC4钛合金项目进入技术交流阶段
  3. 润和机械增订2吨订单已排产

三、下周计划
  1. 跟进中国航发商务报价（7月10日截止）
  2. 准备珠海航展资料
  3. 提交航天科工TC4报价单`;

      setGeneratedReport({ type: '周工作周报', content, date: today });
      setGeneratingType(null);
      setView('report');
    }, 1200);
  };

  const generateTrip = () => {
    setGeneratingType('trip');
    setTimeout(() => {
      const today = new Date().toLocaleDateString('zh-CN');
      const reportDate = tripForm.reportDate || today;

      const purposes: string[] = [];
      if (tripForm.purposeGetOpportunity) purposes.push('☑获取商机'); else purposes.push('☐获取商机');
      if (tripForm.purposeNegotiateOrder) purposes.push('☑洽谈订单'); else purposes.push('☐洽谈订单');
      if (tripForm.purposeMaintainRelation) purposes.push('☑维护关系'); else purposes.push('☐维护关系');
      if (tripForm.purposeTechExchange) purposes.push('☑技术交流'); else purposes.push('☐技术交流');
      if (tripForm.purposePayment) purposes.push('☑收款'); else purposes.push('☐收款');
      if (tripForm.purposeHandleIssue) purposes.push('☑处理问题'); else purposes.push('☐处理问题');
      if (tripForm.purposeOther) purposes.push('☑其它'); else purposes.push('☐其它');
      if (tripForm.purposeOther && tripForm.purposeOtherText) purposes.push(tripForm.purposeOtherText);

      const content = `出差报告
日报时间：${reportDate}

一、基本信息
出差人：${tripForm.traveler || '无'}
出差时间：${tripForm.travelDate || '无'}
出差地点：${tripForm.destination || '无'}

二、出差计划和目标
主要目的（可勾选）：${purposes.join(' ')}

三、出差对象（多客户循环生成，一个客户一组）
客户单位名称：${tripForm.customerName || '无'}
拜访客户姓名：${tripForm.contactName || '无'}
客户职位：${tripForm.contactTitle || '无'}
联系方式：${tripForm.contactInfo || '无'}
关系层级：${tripForm.relationLevel || '无'}
客户影响力：${tripForm.influence || '无'}
客户背景：${tripForm.customerBackground || '无'}
其它客户关系情况说明：${tripForm.otherRelation || '无'}

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
      setGeneratingType(null);
      setView('report');
    }, 1000);
  };

  const handleVoiceFill = () => {
    if (isVoiceRecording) {
      // 停止录音，模拟语音识别结果自动填入字段
      setTripForm(mockVoiceTripData);
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
    }
  };

  const handleExport = () => {
    setShowExport(true);
    setCopyStatus('idle');
  };

  const handleCopy = async () => {
    if (!generatedReport) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedReport.content);
      } else {
        // 兜底方案
        const textarea = document.createElement('textarea');
        textarea.value = generatedReport.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('idle');
    }
  };

  const handleBackToMenu = () => {
    setView('menu');
    setGeneratedReport(null);
    setTripForm(emptyTripForm);
    setIsVoiceRecording(false);
  };

  // 报告预览视图
  if (view === 'report' && generatedReport) {
    return (
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
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-coffee-700 bg-coffee-50 hover:bg-coffee-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
            <button
              onClick={handleBackToMenu}
              className="px-3 py-1.5 text-sm text-coffee-600 hover:bg-coffee-50 rounded-lg"
            >
              返回
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-coffee-50 to-cream border border-coffee-200 rounded-2xl p-6 font-mono text-sm text-coffee-800 whitespace-pre-line leading-relaxed">
          {generatedReport.content}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-coffee-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>本报告由 AI 基于本周 {thisWeek.length} 条工作记录自动生成</span>
        </div>

        {/* 导出弹窗 */}
        {showExport && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-float">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-coffee-700" />
                  <h3 className="text-base font-semibold text-coffee-900">导出报告</h3>
                </div>
                <button
                  onClick={() => setShowExport(false)}
                  className="p-1 text-coffee-400 hover:text-coffee-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-coffee-500 mb-3">
                以下为报告的文本内容，可点击「复制全部」后粘贴到任意位置：
              </p>
              <textarea
                readOnly
                value={generatedReport.content}
                className="w-full h-72 p-4 rounded-2xl bg-coffee-50 border border-coffee-100 text-sm font-mono text-coffee-800 resize-none focus:outline-none leading-relaxed"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowExport(false)}
                  className="px-4 py-2 text-sm text-coffee-600 hover:bg-coffee-50 rounded-xl"
                >
                  关闭
                </button>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors',
                    copyStatus === 'copied'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-coffee-600 text-white hover:bg-coffee-700'
                  )}
                >
                  <Copy className="w-4 h-4" />
                  <span>{copyStatus === 'copied' ? '已复制' : '复制全部'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 出差报告表单视图
  if (view === 'trip-form') {
    const isFormFilled = (Object.values(tripForm) as string[]).some((v) => v.trim());
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToMenu}
                className="p-1.5 hover:bg-coffee-50 rounded-lg text-coffee-600"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="text-base font-semibold text-coffee-900">出差报告</h3>
              </div>
            </div>
            <button
              onClick={handleVoiceFill}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                isVoiceRecording
                  ? 'bg-alert text-white animate-pulse'
                  : 'bg-caramel/20 text-coffee-700 hover:bg-caramel/30'
              )}
            >
              {isVoiceRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止录音</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>语音填写</span>
                </>
              )}
            </button>
          </div>

          {isVoiceRecording && (
            <div className="mb-4 p-3 bg-alert/5 border border-alert/20 rounded-xl flex items-center gap-2 text-sm text-alert">
              <span className="inline-block w-2 h-2 rounded-full bg-alert animate-pulse" />
              <span>正在聆听，请口述出差信息…停止后将自动填入下方字段</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tripFields.map((field) => {
              const Icon = field.icon;
              return (
                <div
                  key={field.key}
                  className={cn(field.multiline && 'md:col-span-2')}
                >
                  <label className="flex items-center gap-1.5 text-xs font-medium text-coffee-700 mb-1.5">
                    <Icon className="w-3 h-3 text-coffee-500" />
                    <span>{field.label}</span>
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={tripForm[field.key] as string}
                      onChange={(e) => setTripForm({ ...tripForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 resize-none focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
                    />
                  ) : (
                    <input
                      type="text"
                      value={tripForm[field.key] as string}
                      onChange={(e) => setTripForm({ ...tripForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 主要目的复选框 */}
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-coffee-700 mb-2">
              <CheckCircle2 className="w-3 h-3 text-coffee-500" />
              <span>二、出差计划和目标 — 主要目的（可勾选）</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {purposeCheckboxes.map((item) => (
                <label key={item.key} className="flex items-center gap-1.5 px-3 py-2 bg-coffee-50 rounded-xl cursor-pointer hover:bg-coffee-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={tripForm[item.key] as boolean}
                    onChange={(e) => setTripForm({ ...tripForm, [item.key]: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-coffee-700">{item.label}</span>
                </label>
              ))}
            </div>
            {tripForm.purposeOther && (
              <input
                type="text"
                value={tripForm.purposeOtherText}
                onChange={(e) => setTripForm({ ...tripForm, purposeOtherText: e.target.value })}
                placeholder="请输入其它目的说明"
                className="w-full mt-2 px-3 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
              />
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-coffee-400">
              {isFormFilled ? '信息已填写，可一键生成报告' : '可手动填写或使用语音填写自动填入'}
            </p>
            <button
              onClick={generateTrip}
              disabled={generatingType !== null}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                generatingType === 'trip'
                  ? 'bg-emerald-200 text-emerald-700'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
            >
              {generatingType === 'trip' ? (
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
      </div>
    );
  }

  // 菜单视图
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-coffee text-white rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold font-display">一键生成各种报告</h3>
        </div>
        <p className="text-coffee-100 text-sm">周报、出差报告、客户拜访报告...自动汇总数据，直接复制就能用！</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={generateWeekly}
          disabled={generatingType !== null}
          className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all text-left group disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-coffee-900">周工作周报</h4>
              <p className="text-xs text-coffee-500">自动汇总本周所有工作记录</p>
            </div>
          </div>
          <div className={cn(
            'w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
            generatingType === 'weekly' ? 'bg-blue-200 text-blue-700' : 'bg-blue-500 text-white group-hover:bg-blue-600'
          )}>
            {generatingType === 'weekly' ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>正在生成...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>生成周报</span>
              </>
            )}
          </div>
        </button>

        <button
          onClick={() => setView('trip-form')}
          disabled={generatingType !== null}
          className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all text-left group disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-coffee-900">出差报告</h4>
              <p className="text-xs text-coffee-500">支持语音填写，一键生成完整报告</p>
            </div>
          </div>
          <div className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 bg-emerald-500 text-white group-hover:bg-emerald-600">
            <>
              <Mic className="w-4 h-4" />
              <span>填写并生成</span>
            </>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-12 shadow-soft flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-coffee-400" />
        </div>
        <h3 className="text-base font-semibold text-coffee-900 mb-2">点击上方按钮生成报告</h3>
        <p className="text-sm text-coffee-500">AI 会自动汇总你的所有工作记录，生成结构化的报告</p>
      </div>
    </div>
  );
}
