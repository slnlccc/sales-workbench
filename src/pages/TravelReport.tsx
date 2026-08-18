import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, FileText, Copy, Download, FileDown,
  Loader2, AlertCircle, Lightbulb, Wand2
} from 'lucide-react';
import { aiApi } from '@/services/api';

const PURPOSE_OPTIONS = [
  '获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他'
];

const today = () => new Date().toISOString().split('T')[0];

const buildLocalReport = (rawText: string, basic: any) => {
  const date = basic.travelDate || today();
  const p = (v: any) => (v && String(v).trim() ? v : '/');
  const lines: string[] = [];

  lines.push('# 出差报告');
  lines.push(`**日报时间**：${date}`);
  lines.push('');
  lines.push('## 一、基本信息');
  lines.push(`- **出差人**：${p(basic.travelers)}`);
  lines.push(`- **出差时间**：${date}`);
  lines.push(`- **出差地点**：${p(basic.location)}`);
  lines.push('');
  lines.push('## 二、出差计划和目标');
  lines.push(`主要目的：${p(basic.purpose)}`);
  lines.push('');
  lines.push('## 三、出差对象（多人可复制该格式）');
  lines.push(`- **客户单位名称**：${p(basic.clients)}`);
  lines.push(`- **客户背景**：${p(basic.customerBackground)}`);
  lines.push(`- **其它客户关系情况说明**：${p(basic.customerRelations)}`);
  lines.push('');
  lines.push('## 四、出差日报总结（当天）');
  lines.push('');
  lines.push('### （一）计划事项达成情况');
  if (rawText && rawText.trim()) {
    lines.push(rawText.trim());
  } else {
    lines.push('/');
  }
  lines.push('');
  lines.push('#### 一、行业核心变量');
  lines.push('/');
  lines.push('**关键影响：**');
  lines.push('- **标准切换**：/');
  lines.push('- **时间节点**：/');
  lines.push('- **采购模式**：/');
  lines.push('- **远期增量**：/');
  lines.push('');
  lines.push('#### 二、锻件市场');
  lines.push(`- **标杆落地**：/`);
  lines.push(`- **准入门槛**：/`);
  lines.push(`- **细分品类**：/`);
  lines.push('');
  lines.push('#### 三、板材市场');
  lines.push(`- **行业标杆**：/`);
  lines.push(`- **竞品梯队**：/`);
  lines.push(`- **我方切入路径**：/`);
  lines.push('');
  lines.push('#### 四、其他客户单位情况：/');
  lines.push('');
  lines.push(`##### 大小业主交流记录：/`);
  lines.push(`##### 其他人员交流记录：/`);
  lines.push('');
  lines.push('### （二）其他收获');
  lines.push('/');
  lines.push(`1、**行业盈利格局判断**：/`);
  lines.push('');
  lines.push('### （三）风险：/');
  lines.push('');
  lines.push('### （四）求助：/');
  lines.push('');
  lines.push('### （五）下一步行动计划：/');
  lines.push('');
  lines.push('---');
  lines.push('*AI 服务暂不可用 · 本地生成的骨架，请复制后手动补充*');
  return lines.join('\n');
};

const SAMPLE_TEXT = `示例（可删除直接替换为您的真实记录）：
2026年8月13日，单璟僖/马奕泓/赵涛/张振昭到上海出差。

拜访了上海第一机床厂（临港新片区倚天路185号），对接于耀华总经理、楼杭飞书记、郭宝超超精装备事业部总经理、吕建波采购部长；另外还去了上海辅机厂，见采购部长杭建斌、采购执行代培研、策略采购王杰、供应商管控祥易，联系方式都是微信，关系层级支持，客户影响力是决策评估者。

主要目的：获取商机、洽谈订单、技术交流。

一机床是上海电气核电核心制造主体，堆内构件、控制棒驱动机构核心供应商，配套华龙一号全系列机组。
行业核心变量：中核+中广核华龙一号2.0融合，两大集团技术整合推出融合方案（金七门二期、太平岭三期示范），2025年暂停招标统一标准，2026重启2.0集采。
关键影响：
标准切换：评定体系由欧洲RCCM切换国产NB标准，所有供应商重新全套材料评定，存量1.0资质不可顺延。
时间节点：2.0机组材料交付锁定2030年，堆内构件核心制造开工2028年中，锻件预计2027年一季度启动。
采购模式：一机床板材统一通过上海国贸招标；业主强制推行双供方托底，单台机组至少两家合格供应商。
远期增量：聚变辐照材料CN1515/CN1520单价接近黄金（仅抚钢+久立供货），多机组叠加规模可观。

锻件市场：华能武核华龙1.5机组堆内构件全套锻件备选托底供应商——整套上下支撑板大锻件7月底完成动力院评定，8月全部大断面锻件发运，质量管控获一机床+动力院双重认可。2.0以后面临是否要重新鉴定的问题。
细分品类：贯穿件（2.0无一体式需求）、690合金套管（动力院专项评定壁垒高，短期难批量）、304金属套管（竞争厂家超10家，武钢取证后将加剧竞争）。

板材市场：太钢是核心供货方，报废后25天补产，50mm+厚板全电渣重熔，新供应商入场后太钢会主动降价。须覆盖6.35mm-140mm全规格；朱段企业深耕2.5年已全规格覆盖为稳定供方；九钢因超大规格瓶颈长期未取得2.0供货资质。竞品梯队：宝武（第一，品牌+稳定性最强）→ 舞洋/久立特钢（第二，备选名额）→ 酒钢（第三，部分规格，短期难入集采）。我方切入：先签0元示范试制合同→全规格板材+NB标准验证达标→与上海国贸签批量正式供货价。短板：暂无完整华龙板材业绩，7mm薄规格短期难超太钢。

上海辅机厂已经签订框架协议，目前因为质量问题和交付问题客户暂停下单，等在手订单回复正常水平恢复下单，同时也要准备明年的框架协议。

下一步行动计划：
1. 武核锻件发运后，向一机床采购+技术部门提交完整试制资料及检测数据，赵涛
2. 依托武核业绩，提交华龙2.0 NB标准供方资质转证申请，赵涛
3. 对接金七门、太平岭2.0示范项目锻件集采需求，策划工艺方案，赵涛
4. 邀请一机床团队赴无锡厂区参观一体化产线，单总/马总`;

export default function TravelReport() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    travelers: '',
    travelDate: today(),
    location: '',
    purpose: [],
    clients: '',
    customerBackground: '',
    customerRelations: '',
    rawText: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const togglePurpose = (opt: string) => {
    setForm(prev => {
      const has = prev.purpose.includes(opt);
      return { ...prev, purpose: has ? prev.purpose.filter((x: string) => x !== opt) : [...prev.purpose, opt] };
    });
  };

  const handleSubmit = async () => {
    const hasRaw = form.rawText.trim().length > 20;
    const hasBasic = form.travelers.trim() || form.location.trim();
    if (!hasRaw && !hasBasic) {
      alert('请至少填写「原始出差记录」或填写出差人+出差地点');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setGeneratedContent('');
    try {
      const payload: any = {
        travelers: form.travelers,
        travelDate: form.travelDate,
        location: form.location,
        purpose: form.purpose.join('、') || '',
        clients: form.clients,
        customerBackground: form.customerBackground,
        customerRelations: form.customerRelations,
        rawText: form.rawText.trim(),
      };
      const res = await aiApi.travelReport(payload);
      setGeneratedContent(res.content || '生成失败，请重试');
    } catch (err: any) {
      // 降级使用本地模板
      const msg = err?.message || String(err) || '';
      setErrorMsg(`AI 服务暂不可用（${msg}），已使用本地模板生成报告骨架，您可手动补充。`);
      setGeneratedContent(buildLocalReport(form.rawText, form));
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

  const markdownToHtml = useMemo(() => (md: string): string => {
    const escapeHtml = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c] || c);
    let lines = md.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let inList = false;
    let inTable = false;
    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
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
      let m;
      if ((m = line.match(/^######\s+(.*)$/))) { closeList(); html.push(`<h6 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h6>`); continue; }
      if ((m = line.match(/^#####\s+(.*)$/)))  { closeList(); html.push(`<h5 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h5>`); continue; }
      if ((m = line.match(/^####\s+(.*)$/)))   { closeList(); html.push(`<h4 style="margin:16px 0 8px;color:#6b5845;font-size:1.05em;">${escapeHtml(m[1])}</h4>`); continue; }
      if ((m = line.match(/^###\s+(.*)$/)))    { closeList(); html.push(`<h3 style="margin:18px 0 10px;color:#5c4a3a;font-size:1.15em;">${escapeHtml(m[1])}</h3>`); continue; }
      if ((m = line.match(/^##\s+(.*)$/)))     { closeList(); html.push(`<h2 style="margin:22px 0 12px;color:#5c4a3a;border-bottom:2px solid #e6dccb;padding-bottom:6px;font-size:1.3em;">${escapeHtml(m[1])}</h2>`); continue; }
      if ((m = line.match(/^#\s+(.*)$/)))      { closeList(); html.push(`<h1 style="margin:24px 0 14px;color:#4a3a2a;border-bottom:3px solid #8c7153;padding-bottom:8px;font-size:1.6em;">${escapeHtml(m[1])}</h1>`); continue; }
      if ((m = line.match(/^(\s*)[-*]\s+(.*)$/))) {
        if (!inList) { html.push('<ul style="margin:8px 0;padding-left:24px;line-height:1.8;">'); inList = true; }
        let item = m[2].replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html.push(`<li style="margin:4px 0;">${escapeHtml(item).replace(/&lt;strong&gt;([^&]+)&lt;\/strong&gt;/g, '<strong>$1</strong>')}</li>`);
        continue;
      }
      if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr style="border:none;border-top:1px dashed #c9bfa3;margin:18px 0;">'); continue; }
      if (/^\s*$/.test(line)) { closeList(); if (html[html.length - 1] !== '<p></p>') html.push('<p style="margin:0;line-height:0.6;">&nbsp;</p>'); continue; }
      closeList();
      let p = escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html.push(`<p style="margin:6px 0;line-height:1.8;text-indent:0;">${p}</p>`);
    }
    if (inList) html.push('</ul>');
    if (inTable) html.push('</tbody></table>');
    return html.join('\n');
  }, []);

  const handleDownload = useCallback(() => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出差报告_${form.travelDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedContent, form.travelDate]);

  const handleDownloadWord = useCallback(() => {
    if (!generatedContent) return;
    const date = form.travelDate;
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
  }, [generatedContent, form.travelDate, markdownToHtml]);

  const handleBack = useCallback(() => {
    navigate('/voice-workbench');
  }, [navigate]);

  const rawCharCount = form.rawText.length;
  const sampleHint = !form.rawText.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
      <header className="bg-white border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 flex-wrap">
          <button onClick={handleBack} className="p-2 hover:bg-cream-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-cream-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-coffee-900 font-display">出差报告</h1>
            <p className="text-xs text-coffee-500">
              <Wand2 className="w-3 h-3 inline mr-1" />
              粘贴原始出差记录 → AI 自动归纳为八大卡片结构 → 导出 Word
            </p>
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
          {/* 左侧：输入区 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 基本信息小卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5">
              <h2 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cream-600"></span>
                一、基本信息（可选，AI 会自动从总框识别）
              </h2>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">出差人</label>
                    <input type="text" name="travelers" value={form.travelers} onChange={handleChange}
                      placeholder="如：单璟僖/马奕泓"
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-coffee-600 mb-1">出差日期</label>
                    <input type="date" name="travelDate" value={form.travelDate} onChange={handleChange}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">出差地点</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange}
                    placeholder="如：上海临港"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">主要目的（可选勾选）</label>
                  <div className="flex flex-wrap gap-2">
                    {PURPOSE_OPTIONS.map(opt => (
                      <button type="button" key={opt} onClick={() => togglePurpose(opt)}
                        className={['px-2.5 py-1 text-xs rounded-full border transition-colors',
                          form.purpose.includes(opt)
                            ? 'bg-cream-600 text-white border-cream-600'
                            : 'bg-white text-coffee-600 border-cream-300 hover:bg-cream-50'
                        ].join(' ')}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">客户单位 / 姓名 / 职位</label>
                  <input type="text" name="clients" value={form.clients} onChange={handleChange}
                    placeholder="如：上海一机床厂 于耀华(总)、楼杭飞(书记)"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500" />
                </div>
              </div>
            </div>

            {/* 大输入框：原始出差记录 */}
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-coffee-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  二、粘贴原始出差记录（总框）
                </h2>
                <span className={`text-xs ${rawCharCount > 100 ? 'text-emerald-600' : 'text-coffee-400'}`}>
                  {rawCharCount} 字 {rawCharCount > 100 ? '· 足够 AI 提取' : '· 建议 ≥100 字效果更佳'}
                </span>
              </div>
              <p className="text-xs text-coffee-500 mb-2">
                直接粘贴您随手记的笔记、语音转文字、聊天记录、工作群汇报等任何原始文本。
                AI 会自动抽取信息归纳为<strong>关键影响/标准切换/时间节点/采购模式/标杆/准入/品类/竞品梯队/切入路径</strong>等八大卡片所有子项。
              </p>
              <textarea
                name="rawText"
                value={form.rawText}
                onChange={handleChange}
                rows={18}
                placeholder={sampleHint ? SAMPLE_TEXT : ''}
                className="w-full px-3 py-3 border border-cream-300 rounded-lg text-sm leading-relaxed
                           focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-transparent resize-y
                           placeholder:text-cream-400 placeholder:leading-7"
              />
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, rawText: sampleHint ? SAMPLE_TEXT : '' }))}
                  className="text-xs text-coffee-500 hover:text-cream-700 transition-colors"
                >
                  {sampleHint ? '📄 加载示例（上海一机床厂完整记录）' : '🗑️ 清空示例'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cream-700 to-cream-500
                             hover:opacity-90 disabled:opacity-50 rounded-xl transition-opacity flex items-center gap-2 shadow-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? 'AI 归纳提取中…' : '一键生成八大卡片报告'}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：报告预览区 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-5 min-h-[720px] sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-coffee-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cream-600" />
                  报告预览区（八大卡片结构化输出）
                </h2>
                {generatedContent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    已生成
                  </span>
                )}
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-3 text-coffee-400">
                  <Loader2 className="w-10 h-10 animate-spin text-cream-600" />
                  <div className="text-sm">
                    AI 正在从原始记录中提取信息，自动归类：<br/>
                    标准切换 · 时间节点 · 采购模式 · 远期增量 · 标杆落地 · 准入门槛 · 细分品类 · 竞品梯队 · 切入路径 …
                  </div>
                </div>
              ) : generatedContent ? (
                <div className="prose prose-sm max-w-none
                              prose-h1:text-coffee-900 prose-h1:border-b-3 prose-h1:border-cream-700
                              prose-h2:text-coffee-800 prose-h2:border-b-2 prose-h2:border-cream-300
                              prose-h3:text-coffee-800 prose-h4:text-coffee-700 prose-h5:text-coffee-700
                              prose-strong:text-coffee-900
                              prose-a:text-cream-700
                              prose-ul:my-1 prose-li:my-0.5
                              prose-p:my-1.5
                              prose-table:border-collapse prose-th:bg-cream-100 prose-th:border prose-td:border">
                  <MarkdownPreview text={generatedContent} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-coffee-400 text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-cream-50 border-2 border-dashed border-cream-300
                                  flex items-center justify-center">
                    <FileText className="w-10 h-10 text-cream-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-coffee-500 font-medium">请在左侧填写信息并生成报告</p>
                    <p className="text-xs max-w-md">
                      1. 可直接在「原始出差记录总框」粘贴您的笔记，无需整理<br/>
                      2. AI 会自动识别出差人/客户/时间/关键信息<br/>
                      3. 自动填入八大卡片的 20+ 子标题，输出标准报告 + Word
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MarkdownPreview({ text }: { text: string }) {
  const html = useMemo(() => {
    const escapeHtml = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c] || c);
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const out: string[] = [];
    let inList = false, inTable = false;
    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (inTable) {
        if (/^\s*\|.*\|\s*$/.test(line) && /---/.test(line)) continue;
        if (/^\s*\|.*\|\s*$/.test(line)) {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          out.push(`<tr>${cells.map(c => `<td style="border:1px solid #e6dccb;padding:6px 10px;">${escapeHtml(c)}</td>`).join('')}</tr>`);
          continue;
        } else {
          out.push('</tbody></table>');
          inTable = false;
        }
      }
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /---/.test(lines[i + 1])) {
        const header = line.split('|').slice(1, -1).map(c => c.trim());
        out.push(`<table style="border-collapse:collapse;width:100%;margin:12px 0;"><thead><tr style="background:#f5f1ea;">${header.map(c => `<th style="border:1px solid #e6dccb;padding:6px 10px;text-align:left;">${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>`);
        inTable = true;
        continue;
      }
      let m;
      if ((m = line.match(/^######\s+(.*)$/))) { closeList(); out.push(`<h6>${escapeHtml(m[1])}</h6>`); continue; }
      if ((m = line.match(/^#####\s+(.*)$/)))  { closeList(); out.push(`<h5>${escapeHtml(m[1])}</h5>`); continue; }
      if ((m = line.match(/^####\s+(.*)$/)))   { closeList(); out.push(`<h4>${escapeHtml(m[1])}</h4>`); continue; }
      if ((m = line.match(/^###\s+(.*)$/)))    { closeList(); out.push(`<h3>${escapeHtml(m[1])}</h3>`); continue; }
      if ((m = line.match(/^##\s+(.*)$/)))     { closeList(); out.push(`<h2>${escapeHtml(m[1])}</h2>`); continue; }
      if ((m = line.match(/^#\s+(.*)$/)))      { closeList(); out.push(`<h1>${escapeHtml(m[1])}</h1>`); continue; }
      if ((m = line.match(/^(\s*)[-*]\s+(.*)$/))) {
        if (!inList) { out.push('<ul>'); inList = true; }
        const item = m[2].replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        out.push(`<li>${escapeHtml(item).replace(/&lt;strong&gt;([^&]+)&lt;\/strong&gt;/g, '<strong>$1</strong>')}</li>`);
        continue;
      }
      if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr/>'); continue; }
      if (/^\s*$/.test(line)) { closeList(); out.push('<br/>'); continue; }
      closeList();
      const p = escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out.push(`<p>${p}</p>`);
    }
    if (inList) out.push('</ul>');
    if (inTable) out.push('</tbody></table>');
    return out.join('\n');
  }, [text]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
