import { useState } from 'react';
import { FileText, Sparkles, Calendar, User, CheckCircle2, Download, Mic, Square, ArrowLeft, X, Copy, MapPin, Users, Briefcase } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

type View = 'menu' | 'trip-form' | 'report';

interface TripFormState {
  traveler: string;
  travelDate: string;
  destination: string;
  visitedCustomers: string;
  itinerary: string;
  meetingNotes: string;
  achievements: string;
}

const emptyTripForm: TripFormState = {
  traveler: '',
  travelDate: '',
  destination: '',
  visitedCustomers: '',
  itinerary: '',
  meetingNotes: '',
  achievements: '',
};

// 模拟语音填写后的样例数据
const mockVoiceTripData: TripFormState = {
  traveler: '之欧',
  travelDate: '2026-07-15 至 2026-07-16',
  destination: '北京',
  visitedCustomers: '中国航发、航天科工',
  itinerary: '7月15日上午拜访中国航发项目组，下午参观航天科工展厅并技术交流；7月16日上午商务洽谈，下午返回。',
  meetingNotes: '1. 中国航发：明确GH4169机匣锻件8月底交付节点，对方对热处理工艺改进表示认可。\n2. 航天科工：TC4钛合金进入技术交流阶段，对方提出希望提供更多样件测试数据。',
  achievements: '成果：获得中国航发项目阶段性确认与航天科工技术交流机会；\n待办：本周内提交TC4钛合金报价单，并安排样件交付。',
};

const tripFields: { key: keyof TripFormState; label: string; placeholder: string; multiline?: boolean; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'traveler', label: '出差人', placeholder: '请输入出差人姓名', icon: User },
  { key: 'travelDate', label: '出差时间', placeholder: '如 2026-07-15 至 2026-07-16', icon: Calendar },
  { key: 'destination', label: '目的地', placeholder: '请输入目的地', icon: MapPin },
  { key: 'visitedCustomers', label: '拜访客户', placeholder: '多个客户用顿号分隔', icon: Users },
  { key: 'itinerary', label: '行程安排', placeholder: '请输入行程安排', multiline: true, icon: Briefcase },
  { key: 'meetingNotes', label: '客户拜访纪要', placeholder: '请输入客户拜访纪要', multiline: true, icon: FileText },
  { key: 'achievements', label: '成果与待办', placeholder: '请输入成果与待办事项', multiline: true, icon: CheckCircle2 },
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
      const content = `【出差报告】
出差人：${tripForm.traveler || '—'}
生成日期：${today}

一、出差行程
  目的地：${tripForm.destination || '—'}
  时间：${tripForm.travelDate || '—'}
  拜访客户：${tripForm.visitedCustomers || '—'}

二、行程安排
${tripForm.itinerary ? '  ' + tripForm.itinerary.replace(/\n/g, '\n  ') : '  —'}

三、客户拜访纪要
${tripForm.meetingNotes ? '  ' + tripForm.meetingNotes.replace(/\n/g, '\n  ') : '  —'}

四、成果与待办
${tripForm.achievements ? '  ' + tripForm.achievements.replace(/\n/g, '\n  ') : '  —'}`;

      setGeneratedReport({ type: '出差报告', content, date: today });
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
                      value={tripForm[field.key]}
                      onChange={(e) => setTripForm({ ...tripForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 resize-none focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
                    />
                  ) : (
                    <input
                      type="text"
                      value={tripForm[field.key]}
                      onChange={(e) => setTripForm({ ...tripForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
                    />
                  )}
                </div>
              );
            })}
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
