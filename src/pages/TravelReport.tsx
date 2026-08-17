import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, FileText, Copy, Download, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { aiApi } from '@/services/api';

const PURPOSE_OPTIONS = [
  '获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他'
];

const buildLocalReport = (form: any) => {
  const date = form.travelDate || new Date().toISOString().split('T')[0];
  const p = (v: any) => (v && String(v).trim() ? v : '/');
  const lines: string[] = [];

  lines.push('# 出差报告');
  lines.push(`**日报时间**：${date}`);
  lines.push('');
  lines.push('## 一、基本信息');
  lines.push(`- **出差人**：${p(form.travelers)}`);
  lines.push(`- **出差时间**：${date}`);
  lines.push(`- **出差地点**：${p(form.location)}`);
  lines.push('');
  lines.push('## 二、出差计划和目标');
  lines.push(`主要目的：${p(form.purpose)}`);
  lines.push('');
  lines.push('## 三、出差对象');
  lines.push(`- **客户单位名称**：${p(form.clients)}`);
  lines.push(`- **客户背景**：${p(form.customerBackground)}`);
  lines.push(`- **其它客户关系情况说明**：${p(form.customerRelations)}`);
  lines.push('');
  lines.push('## 四、出差日报总结');
  lines.push('');
  lines.push('### （一）计划事项达成情况');
  lines.push(p(form.planAchievement));
  lines.push('');
  lines.push('#### 一、行业核心变量');
  lines.push(p(form.industryCore || form.industryVariable));
  lines.push('**关键影响：**');
  lines.push(`- **标准切换**：${p(form.standardChange)}`);
  lines.push(`- **时间节点**：${p(form.timeline)}`);
  lines.push(`- **采购模式**：${p(form.procurementMode)}`);
  lines.push(`- **远期增量**：${p(form.longTermOpportunity)}`);
  lines.push('');
  lines.push('#### 二、锻件市场');
  lines.push(`- **标杆落地**：${p(form.benchmark)}`);
  lines.push(`- **准入门槛**：${p(form.entryBarrier)}`);
  lines.push(`- **细分品类**：${p(form.segmentCategory)}`);
  lines.push('');
  lines.push('#### 三、板材市场');
  lines.push(`- **行业标杆**：${p(form.industryBenchmark)}`);
  lines.push(`- **竞品梯队**：${p(form.competitorTiers)}`);
  lines.push(`- **我方切入路径**：${p(form.entryPath)}`);
  lines.push('');
  lines.push('#### 四、其他客户单位情况');
  lines.push(p(form.otherClients));
  lines.push('');
  lines.push(`##### 大小业主交流记录：${p(form.ownerComm)}`);
  lines.push(`##### 其他人员交流记录：${p(form.otherComm)}`);
  lines.push('');
  lines.push('### （二）其他收获');
  lines.push(p(form.otherHarvest));
  lines.push(`1、**行业盈利格局判断**：${p(form.profitPattern)}`);
  lines.push('');
  lines.push('### （三）风险');
  lines.push(p(form.risks));
  lines.push('');
  lines.push('### （四）求助');
  lines.push(p(form.helpNeeded));
  lines.push('');
  lines.push('### （五）下一步行动计划');
  lines.push(p(form.nextSteps));
  lines.push('');
  lines.push('---');
  lines.push('*本报告由系统根据您填写的信息自动整理生成*');

  return lines.join('\n');
};

interface FormState {
  travelers: string;
  travelDate: string;
  location: string;
  purpose: string;
  clients: string;
  customerBackground: string;
  customerRelations: string;
  planAchievement: string;
  industryCore: string;
  standardChange: string;
  timeline: string;
  procurementMode: string;
  longTermOpportunity: string;
  benchmark: string;
  entryBarrier: string;
  segmentCategory: string;
  industryBenchmark: string;
  competitorTiers: string;
  entryPath: string;
  otherClients: string;
  ownerComm: string;
  otherComm: string;
  industryInfo: string;
  marketInfo: string;
  otherHarvest: string;
  profitPattern: string;
  risks: string;
  helpNeeded: string;
  nextSteps: string;
}

const DEFAULT_FORM: FormState = {
  travelers: '',
  travelDate: new Date().toISOString().split('T')[0],
  location: '',
  purpose: '',
  clients: '',
  customerBackground: '',
  customerRelations: '',
  planAchievement: '',
  industryCore: '',
  standardChange: '',
  timeline: '',
  procurementMode: '',
  longTermOpportunity: '',
  benchmark: '',
  entryBarrier: '',
  segmentCategory: '',
  industryBenchmark: '',
  competitorTiers: '',
  entryPath: '',
  otherClients: '',
  ownerComm: '',
  otherComm: '',
  industryInfo: '',
  marketInfo: '',
  otherHarvest: '',
  profitPattern: '',
  risks: '',
  helpNeeded: '',
  nextSteps: '',
};

export default function TravelReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

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
      const res: any = await aiApi.travelReport(form);
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

  const markdownToHtml = (md: string): string => {
    const escapeHtml = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c] || c);
    let lines = md.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let inList = false;
    let inTable = false;
    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 表格检测
      if (inTable) {
        if (/^\s*\|.*\|\s*$/.test(line) && /---/.test(line)) continue;
        if (/^\s*\|.*\|\s*$/.test(line)) {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          html.push(`<tr>${cells.map(c => `<td style="border:1px solid #ccc;padding:6px 10px;">${escapeHtml(c)}</td>`).join('')}</tr>`);
          continue;
        } else {
          html.push('</tbody></table>');
          inTable = false;
        }
      }
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /---/.test(lines[i + 1])) {
        const header = line.split('|').slice(1, -1).map(c => c.trim());
        html.push(`<table style="border-collapse:collapse;width:100%;margin:12px 0;"><thead><tr style="background:#f5f1ea;">${header.map(c => `<th style="border:1px solid #ccc;padding:6px 10px;text-align:left;">${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>`);
        inTable = true;
        continue;
      }

      // 标题
      let m;
      if ((m = line.match(/^######\s+(.*)$/))) { closeList(); html.push(`<h6 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h6>`); continue; }
      if ((m = line.match(/^#####\s+(.*)$/)))  { closeList(); html.push(`<h5 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h5>`); continue; }
      if ((m = line.match(/^####\s+(.*)$/)))   { closeList(); html.push(`<h4 style="margin:16px 0 8px;color:#6b5845;font-size:1.05em;">${escapeHtml(m[1])}</h4>`); continue; }
      if ((m = line.match(/^###\s+(.*)$/)))    { closeList(); html.push(`<h3 style="margin:18px 0 10px;color:#5c4a3a;font-size:1.15em;">${escapeHtml(m[1])}</h3>`); continue; }
      if ((m = line.match(/^##\s+(.*)$/)))     { closeList(); html.push(`<h2 style="margin:22px 0 12px;color:#5c4a3a;border-bottom:2px solid #e6dccb;padding-bottom:6px;font-size:1.3em;">${escapeHtml(m[1])}</h2>`); continue; }
      if ((m = line.match(/^#\s+(.*)$/)))      { closeList(); html.push(`<h1 style="margin:24px 0 14px;color:#4a3a2a;border-bottom:3px solid #8c7153;padding-bottom:8px;font-size:1.6em;">${escapeHtml(m[1])}</h1>`); continue; }

      // 无序列表
      if ((m = line.match(/^(\s*)[-*]\s+(.*)$/))) {
        if (!inList) { html.push('<ul style="margin:8px 0;padding-left:24px;line-height:1.8;">'); inList = true; }
        let item = m[2];
        // 粗体 **x** -> <strong>
        item = item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html.push(`<li style="margin:4px 0;">${escapeHtml(item).replace(/&lt;strong&gt;([^&]+)&lt;\/strong&gt;/g, '<strong>$1</strong>')}</li>`);
        continue;
      }

      // 分隔线
      if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr style="border:none;border-top:1px dashed #c9bfa3;margin:18px 0;">'); continue; }

      // 空行
      if (/^\s*$/.test(line)) { closeList(); if (html[html.length - 1] !== '<p></p>') html.push('<p style="margin:0;line-height:0.6;">&nbsp;</p>'); continue; }

      // 普通段落
      closeList();
      let p = escapeHtml(line);
      p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html.push(`<p style="margin:6px 0;line-height:1.8;text-indent:0;">${p}</p>`);
    }
    if (inList) html.push('</ul>');
    if (inTable) html.push('</tbody></table>');
    return html.join('\n');
  };

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

  const handleDownloadWord = useCallback(() => {
    if (!generatedContent) return;
    const date = form.travelDate || new Date().toISOString().split('T')[0];
    const html = markdownToHtml(generatedContent);
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:w="urn:schemas-microsoft-com:office:word"
       xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<title>出差报告_${date}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
@page { size: A4; margin: 2cm 2.2cm; }
body { font-family: "SimSun","宋体","Microsoft YaHei",sans-serif; font-size: 12pt; color:#2b2b2b; line-height:1.7; }
h1,h2,h3,h4,h5,h6 { font-family: "Microsoft YaHei","黑体",sans-serif; color:#4a3a2a; }
strong { font-weight:bold; }
</style>
</head>
<body>
${html}
</body></html>`;
    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出差报告_${date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedContent, form.travelDate]);

  const handleBack = useCallback(() => {
    navigate('/voice-workbench');
  }, [navigate]);

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5 mb-4">
      <h2 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cream-600"></span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Field = ({
    label, name, value, rows = 2, placeholder = '',
  }: { label: string; name: string; value: string; rows?: number; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-coffee-600 mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-none"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
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
            <p className="text-xs text-coffee-500">填写出差信息，AI 一键生成专业报告 · 含关键影响/标准切换/竞品梯队等细分项</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
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
                  className="px-4 py-2 text-sm font-medium text-cream-700 bg-cream-50 border border-cream-300 hover:bg-cream-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载MD
                </button>
                <button
                  onClick={handleDownloadWord}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:opacity-90 rounded-lg transition-opacity flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  下载Word
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
            <div className="text-sm text-amber-800">{errorMsg}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧表单 */}
          <div className="lg:col-span-2">
            <SectionCard title="一、基本信息">
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">出差人 *</label>
                <input
                  type="text" name="travelers" value={form.travelers} onChange={handleChange}
                  placeholder="例如：单璟僖/马奕泓/赵涛"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">出差日期</label>
                <input
                  type="date" name="travelDate" value={form.travelDate} onChange={handleChange}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">出差地点 *</label>
                <input
                  type="text" name="location" value={form.location} onChange={handleChange}
                  placeholder="例如：上海一机床厂（临港新片区倚天路185号）"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cream-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">主要目的</label>
                <select name="purpose" value={form.purpose} onChange={handleChange}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cream-500">
                  <option value="">请选择出差目的</option>
                  {PURPOSE_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </div>
            </SectionCard>

            <SectionCard title="二、出差对象（多人可复制格式）">
              <Field label="客户单位名称 / 拜访客户姓名 / 职位" name="clients" value={form.clients}
                placeholder="例如：上海一机床厂（于耀华-总经理、楼杭飞-书记）；上海辅机厂（杭建斌-采购部长）" />
              <Field label="客户背景（行业地位/主营业务等）" name="customerBackground" value={form.customerBackground}
                placeholder="例如：上海电气核电核心制造主体，堆内构件、控制棒驱动机构核心供应商，配套华龙一号全系列机组" />
              <Field label="其它客户关系情况说明（关系层级/影响力/联系方式等）" name="customerRelations" value={form.customerRelations}
                placeholder="例如：关系层级-支持；客户影响力-决策评估者；联系方式-微信" rows={2} />
            </SectionCard>

            <SectionCard title="三、计划事项达成情况">
              <Field label="客户沟通记录、项目进展等总述" name="planAchievement" value={form.planAchievement}
                placeholder="例如：完成上海一机床厂+上海辅机厂拜访，达成初步合作意向..." rows={4} />
            </SectionCard>

            <SectionCard title="四、行业核心变量（关键影响4项）">
              <Field label="行业核心变量主题（如 中核+中广核华龙一号2.0融合）" name="industryCore" value={form.industryCore} rows={2} />
              <div className="p-3 bg-cream-50 rounded-lg border border-cream-200 space-y-3">
                <div className="text-xs font-semibold text-cream-700">⬇ 关键影响（4 小点）</div>
                <Field label="① 标准切换（评定体系/资质/标准变更）" name="standardChange" value={form.standardChange}
                  placeholder="例如：评定体系由欧洲RCCM切换国产NB标准，所有供应商须重新完成全套材料评定" rows={2} />
                <Field label="② 时间节点（招标/开工/交付等）" name="timeline" value={form.timeline}
                  placeholder="例如：2.0机组材料交付锁定2030年，堆内构件核心制造开工2028年中，锻件预计2027年一季度启动" rows={2} />
                <Field label="③ 采购模式（招标方/渠道/双供方等）" name="procurementMode" value={form.procurementMode}
                  placeholder="例如：一机床板材统一通过上海国贸招标；业主强制推行双供方托底，单台机组至少两家合格供应商" rows={2} />
                <Field label="④ 远期增量（新材料/多机组叠加等）" name="longTermOpportunity" value={form.longTermOpportunity}
                  placeholder="例如：聚变辐照材料CN1515/CN1520单价接近黄金（仅抚钢+久立供货），多机组叠加后规模可观" rows={2} />
              </div>
            </SectionCard>

            <SectionCard title="五、锻件市场（标杆/准入/品类）">
              <Field label="标杆落地（标杆项目/业绩/质量管控认可）" name="benchmark" value={form.benchmark}
                placeholder="例如：华能武核华龙1.5机组堆内构件全套锻件备选托底供应商——整套上下支撑板大锻件7月底完成动力院评定，8月全部大断面锻件完成发运" rows={3} />
              <Field label="准入门槛（资质/鉴定/认证等）" name="entryBarrier" value={form.entryBarrier}
                placeholder="例如：2.0以后面临是否要重新鉴定的问题" />
              <Field label="细分品类（各品类壁垒/竞争格局）" name="segmentCategory" value={form.segmentCategory}
                placeholder="例如：贯穿件（2.0无一体式需求）、690合金套管（动力院专项评定壁垒高）、304金属套管（竞争厂家超10家）" rows={3} />
            </SectionCard>

            <SectionCard title="六、板材市场（标杆/竞品/切入路径）">
              <Field label="行业标杆（核心供方/补产周期/工艺/价格策略）" name="industryBenchmark" value={form.industryBenchmark}
                placeholder="例如：标杆太钢——核心板材供货方，报废后25天补产，50mm+厚板全电渣重熔，新供应商入场后太钢会主动降价" rows={3} />
              <div className="p-3 bg-cream-50 rounded-lg border border-cream-200 space-y-3">
                <Field label="准入门槛（规格覆盖/头部供方）" name="entryBarrier" value={form.entryBarrier} rows={2} />
                <Field label="竞品梯队（分梯队列出）" name="competitorTiers" value={form.competitorTiers}
                  placeholder="宝武（第一，品牌+稳定性最强）→ 舞洋/久立特钢（第二，备选名额）→ 酒钢（第三，部分规格，短期难入集采）" rows={2} />
                <Field label="我方切入路径（步骤/优势/短板）" name="entryPath" value={form.entryPath}
                  placeholder="先签0元示范试制合同→全规格板材+NB标准验证达标→与上海国贸签批量正式供货价。短板：暂无完整华龙板材业绩，7mm薄规格短期难超太钢" rows={3} />
              </div>
            </SectionCard>

            <SectionCard title="七、其他客户/业主交流记录">
              <Field label="其他客户单位情况（如辅机厂等合作/质量/交付情况）" name="otherClients" value={form.otherClients}
                placeholder="例如：上海辅机厂我们已经签订框架协议，目前因为质量和交付问题客户暂停下单..." rows={3} />
              <Field label="大小业主交流记录（项目启动/资金/设计）" name="ownerComm" value={form.ownerComm} rows={2} />
              <Field label="其他人员交流记录" name="otherComm" value={form.otherComm} rows={2} />
            </SectionCard>

            <SectionCard title="八、其他收获 / 行业盈利格局 / 风险 / 求助 / 下一步">
              <Field label="其他收获" name="otherHarvest" value={form.otherHarvest} rows={2} />
              <Field label="1. 行业盈利格局判断" name="profitPattern" value={form.profitPattern} rows={2} />
              <Field label="风险（业务/客户/技术/交付/质量/竞争）" name="risks" value={form.risks} rows={3} />
              <Field label="求助（需要协调的资源：总经理出面/技术支持等）" name="helpNeeded" value={form.helpNeeded} rows={2} />
              <Field label="下一步行动计划（含事项/责任人/时间）" name="nextSteps" value={form.nextSteps}
                placeholder="例如：1. 武核锻件发运后提交试制资料及检测数据 - 赵涛\n2. 提交华龙2.0 NB标准供方资质转证申请 - 赵涛\n3. 对接金七门、太平岭2.0示范项目锻件集采需求 - 赵涛\n4. 邀请一机床团队赴无锡厂区参观一体化产线 - 单总/马总" rows={4} />
            </SectionCard>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cream-700 to-cream-500 text-white rounded-xl font-semibold shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />AI 正在生成报告...</>
              ) : (
                <><Sparkles className="w-5 h-5" />一键生成出差报告</>
              )}
            </button>
          </div>

          {/* 右侧预览 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 h-full min-h-[800px] sticky top-24">
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
                  <p className="text-sm text-coffee-500 max-w-md">
                    请在左侧填写出差信息（含<strong>关键影响/标准切换/时间节点/采购模式/远期增量/标杆落地/准入门槛/细分品类/行业标杆/竞品梯队/我方切入路径</strong>等细分项），点击「一键生成出差报告」，AI 将在此处生成完整结构化报告。
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
