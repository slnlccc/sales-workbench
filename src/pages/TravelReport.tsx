import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, FileText, Copy, Download, Loader2, AlertCircle } from 'lucide-react';
import { aiApi } from '@/services/api';

const PURPOSE_OPTIONS = [
  '获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他'
];

const buildLocalReport = (form: any) => {
  const date = form.travelDate || new Date().toISOString().split('T')[0];
  const lines: string[] = [];
  
  lines.push(`# 出差报告`);
  lines.push(`**日报时间**：${date}`);
  lines.push('');
  lines.push(`## 一、基本信息`);
  lines.push(`- **出差人**：${form.travelers || '/'}`);
  lines.push(`- **出差时间**：${date}`);
  lines.push(`- **出差地点**：${form.location || '/'}`);
  lines.push('');
  lines.push(`## 二、出差计划和目标`);
  lines.push(`主要目的：${form.purpose || '/'}`);
  lines.push('');
  lines.push(`## 三、出差对象`);
  lines.push(`- **客户信息**：${form.clients || '/'}`);
  lines.push('');
  lines.push(`## 四、出差日报总结`);
  lines.push('');
  lines.push(`### （一）计划事项达成情况`);
  lines.push(form.planAchievement || '/');
  lines.push('');
  lines.push(`### （二）其他收获`);
  lines.push(form.otherHarvest || '/');
  lines.push('');
  lines.push(`### （三）行业/市场信息`);
  lines.push(form.industryInfo || form.marketInfo || '/');
  lines.push('');
  lines.push(`### （四）风险`);
  lines.push(form.risks || '/');
  lines.push('');
  lines.push(`### （五）求助`);
  lines.push(form.helpNeeded || '/');
  lines.push('');
  lines.push(`### （六）下一步行动计划`);
  lines.push(form.nextSteps || '/');
  lines.push('');
  lines.push('---');
  lines.push('*本报告由系统根据您填写的信息自动整理生成*');
  
  return lines.join('\n');
};

export default function TravelReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const [form, setForm] = useState({
    travelers: '',
    travelDate: new Date().toISOString().split('T')[0],
    location: '',
    purpose: '',
    clients: '',
    planAchievement: '',
    industryInfo: '',
    marketInfo: '',
    otherHarvest: '',
    risks: '',
    helpNeeded: '',
    nextSteps: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!form.travelers.trim() || !form.location.trim()) {
      setErrorMsg('请填写出差人和出差地点');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setGeneratedContent('');
    setIsLocalFallback(false);
    
    try {
      const res = await aiApi.travelReport(form);
      setGeneratedContent(res.content || '生成失败，请重试');
      if (res.fallback) {
        setIsLocalFallback(true);
        setErrorMsg(res.warning || 'AI 服务暂不可用，已使用本地模板生成报告。您可以在报告基础上修改完善。');
      }
    } catch (err: any) {
      console.warn('[TravelReport] AI 生成失败，使用本地模板:', err?.message);
      const localReport = buildLocalReport(form);
      setGeneratedContent(localReport);
      setIsLocalFallback(true);
      setErrorMsg('AI 服务暂时不可用，已使用本地模板生成报告。您可以在报告基础上修改完善。');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedContent]);

  const handleDownload = useCallback(() => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `出差报告_${form.travelDate || new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [generatedContent, form.travelDate]);

  const handleBack = useCallback(() => {
    navigate('/voice-workbench');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
      {/* Header */}
      <header className="bg-white border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-cream-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-coffee-900 font-display">出差报告</h1>
            <p className="text-xs text-coffee-500">填写出差信息，AI 一键生成专业报告</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {generatedContent && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-sm font-medium text-cream-700 bg-cream-100 hover:bg-cream-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cream-700 to-cream-500 hover:opacity-90 rounded-lg transition-opacity flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              {errorMsg}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5">
              <h2 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cream-600"></span>
                基本信息
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">出差人 *</label>
                  <input
                    type="text"
                    name="travelers"
                    value={form.travelers}
                    onChange={handleChange}
                    placeholder="例如：单璟僖/马奕泓"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">出差日期</label>
                  <input
                    type="date"
                    name="travelDate"
                    value={form.travelDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">出差地点 *</label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="例如：上海"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">主要目的</label>
                  <select
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent bg-white"
                  >
                    <option value="">请选择出差目的</option>
                    {PURPOSE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">客户信息</label>
                  <textarea
                    name="clients"
                    value={form.clients}
                    onChange={handleChange}
                    placeholder="客户单位、姓名、职位等，例如：上海一机床厂 - 于耀华 (总经理)"
                    rows={2}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Detailed Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5">
              <h2 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cream-600"></span>
                详细情况
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">计划事项达成情况</label>
                  <textarea
                    name="planAchievement"
                    value={form.planAchievement}
                    onChange={handleChange}
                    placeholder="客户沟通记录、项目进展、关键信息等..."
                    rows={4}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">行业/市场信息</label>
                    <textarea
                      name="industryInfo"
                      value={form.industryInfo}
                      onChange={handleChange}
                      placeholder="行业动态、竞争对手情况等..."
                      rows={3}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">其他收获</label>
                    <textarea
                      name="otherHarvest"
                      value={form.otherHarvest}
                      onChange={handleChange}
                      placeholder="其他有价值的信息..."
                      rows={3}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">风险</label>
                    <textarea
                      name="risks"
                      value={form.risks}
                      onChange={handleChange}
                      placeholder="业务风险、客户风险等..."
                      rows={2}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">求助/需协调资源</label>
                    <textarea
                      name="helpNeeded"
                      value={form.helpNeeded}
                      onChange={handleChange}
                      placeholder="需要总经理出面、技术支持等..."
                      rows={2}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">下一步行动计划</label>
                  <textarea
                    name="nextSteps"
                    value={form.nextSteps}
                    onChange={handleChange}
                    placeholder="明确具体事项和责任人，例如：1. 提交试制资料 - 赵涛"
                    rows={3}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cream-700 to-cream-500 text-white rounded-xl font-semibold shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 正在生成报告...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  一键生成出差报告
                </>
              )}
            </button>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 h-full min-h-[600px]">
              {generatedContent ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-coffee-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cream-600" />
                      报告预览
                      {isLocalFallback && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          本地模板 · 可编辑
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="prose prose-sm max-w-none text-coffee-800 whitespace-pre-wrap leading-relaxed">
                    {generatedContent}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-cream-400" />
                  </div>
                  <h3 className="text-lg font-medium text-coffee-700 mb-2">报告预览区</h3>
                  <p className="text-sm text-coffee-500 max-w-xs">
                    请在左侧填写出差信息，点击"一键生成出差报告"，AI 将在此处生成结构化的专业报告。
                    <br /><br />
                    <span className="text-coffee-400">即使 AI 服务暂不可用，也会使用本地模板生成报告，保证您随时能用。</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
