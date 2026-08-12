import { useState } from 'react';
import {
  Sparkles, FileText, Image, BookOpen, Send, Download, Copy,
  ChevronRight, Zap, Wand2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

type TabKey = 'product' | 'whitepaper' | 'promotion' | 'social';

const tabConfig: Record<TabKey, { label: string; icon: React.ComponentType<{ className?: string }>; subLabel: string }> = {
  product: { label: '产品介绍', icon: FileText, subLabel: '产品文案生成' },
  whitepaper: { label: '技术白皮书', icon: BookOpen, subLabel: '专业技术文档' },
  promotion: { label: '宣传素材', icon: Image, subLabel: '推广物料' },
  social: { label: '社交媒体', icon: Zap, subLabel: '朋友圈/公众号' },
};

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  usageCount: number;
}

const productTemplates: TemplateItem[] = [
  { id: 'pt1', title: 'GH4169高温合金锻件产品介绍', description: '航空发动机用高温合金锻件完整产品介绍文案', tag: '高温合金', usageCount: 128 },
  { id: 'pt2', title: 'TC4钛合金锻件产品手册', description: '航空航天用钛合金锻件产品说明', tag: '钛合金', usageCount: 96 },
  { id: 'pt3', title: '大型环形锻件产品介绍', description: '风电、核电用大型环锻件产品方案', tag: '大型锻件', usageCount: 72 },
  { id: 'pt4', title: '不锈钢锻件产品画册', description: '核电阀门、化工用不锈钢锻件', tag: '不锈钢', usageCount: 54 },
  { id: 'pt5', title: '铝合金锻件产品介绍', description: '航空航天结构件用铝合金锻件', tag: '铝合金', usageCount: 43 },
  { id: 'pt6', title: '船用锻件产品方案', description: '船舶柴油机曲轴等大型船用锻件', tag: '船舶', usageCount: 38 },
];

const whitepaperTemplates: TemplateItem[] = [
  { id: 'wp1', title: '航空锻造行业技术白皮书', description: '航空发动机锻件技术发展趋势分析', tag: '航空航天', usageCount: 86 },
  { id: 'wp2', title: '高温合金锻造工艺指南', description: 'GH4169等高温合金锻造工艺详解', tag: '工艺技术', usageCount: 72 },
  { id: 'wp3', title: '核电锻件质量控制手册', description: '核级锻件质量控制体系与检测标准', tag: '核电', usageCount: 58 },
  { id: 'wp4', title: '大型风电锻件技术方案', description: '风电轮毂、主轴锻件技术方案', tag: '新能源', usageCount: 45 },
];

const promotionTemplates: TemplateItem[] = [
  { id: 'pm1', title: '展会宣传折页设计文案', description: '行业展会用三折页宣传文案', tag: '展会', usageCount: 64 },
  { id: 'pm2', title: '企业宣传册内容策划', description: '公司介绍+产品+案例完整宣传册', tag: '企业宣传', usageCount: 52 },
  { id: 'pm3', title: '产品海报文案', description: '新品发布、主打产品海报文案', tag: '海报', usageCount: 81 },
  { id: 'pm4', title: '客户案例故事', description: '典型客户合作案例深度报道', tag: '案例', usageCount: 39 },
];

const socialTemplates: TemplateItem[] = [
  { id: 'sc1', title: '朋友圈产品推广文案', description: '适合朋友圈发布的产品推广短文', tag: '朋友圈', usageCount: 156 },
  { id: 'sc2', title: '公众号行业深度文章', description: '行业洞察、技术解析类长文', tag: '公众号', usageCount: 78 },
  { id: 'sc3', title: '节日问候文案', description: '春节、中秋等节日客户问候', tag: '节日', usageCount: 203 },
  { id: 'sc4', title: '企业动态新闻稿', description: '公司重大事件、获奖、合作新闻', tag: '新闻稿', usageCount: 47 },
];

interface GeneratedContent {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: string;
}

const mockGenerated: GeneratedContent[] = [
  {
    id: 'g1',
    title: 'GH4169高温合金锻件产品介绍',
    type: '产品介绍',
    content: `【产品名称】GH4169高温合金锻件\n\n【产品概述】\nGH4169是一种镍基高温合金，在650℃以下具有优异的高温强度、良好的抗氧化和耐腐蚀性能。我司生产的GH4169锻件广泛应用于航空发动机涡轮盘、叶片、机匣等关键部件。\n\n【技术参数】\n• 工作温度：-253℃~650℃\n• 抗拉强度：≥1240MPa\n• 屈服强度：≥1030MPa\n• 延伸率：≥12%\n• 晶粒度：ASTM 4级或更细\n\n【产品优势】\n1. 纯净度高：采用三级熔炼工艺，气体含量低，夹杂物少\n2. 组织均匀：精密锻造工艺，晶粒度均匀，力学性能稳定\n3. 精度高：数控加工，尺寸公差可达IT7级\n4. 交付快：常规产品45天交货，急单30天可交付\n\n【应用领域】\n• 航空发动机涡轮盘、压气机盘\n• 航空发动机叶片、机匣\n• 航天发动机燃烧室部件\n• 核电高温部件\n\n【质量保证】\n• 通过AS9100航空航天质量管理体系认证\n• 提供完整的质量证明文件\n• 支持第三方检测`,
    createdAt: '2026-07-10',
  },
];

export default function ContentFactory() {
  const [tab, setTab] = useState<TabKey>('product');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(mockGenerated[0]);

  const templates: Record<TabKey, TemplateItem[]> = {
    product: productTemplates,
    whitepaper: whitepaperTemplates,
    promotion: promotionTemplates,
    social: socialTemplates,
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setTimeout(() => {
      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        title: selectedTemplate.title,
        type: tabConfig[tab].label,
        content: `【${selectedTemplate.title}】\n\n${selectedTemplate.description}\n\n（以下为AI生成的完整内容示例）\n\n一、产品概述\n这是一款专为航空航天领域设计的高端锻件产品，采用先进的锻造工艺和热处理技术，确保产品性能卓越。\n\n二、技术特点\n1. 高强度：在高温环境下仍能保持优异的力学性能\n2. 耐疲劳：经过特殊热处理，疲劳寿命提升30%\n3. 高精度：数控加工，尺寸精度可达IT6-IT7级\n4. 长寿命：设计寿命可达数万小时\n\n三、应用场景\n• 航空发动机关键部件\n• 航天飞行器结构件\n• 核电设备核心部件\n• 高端能源装备\n\n四、服务保障\n• 专业技术团队全程跟进\n• 快速响应客户需求\n• 完善的售后服务体系`,
        createdAt: new Date().toLocaleDateString('zh-CN'),
      };
      setGeneratedContent(newContent);
      setGenerating(false);
    }, 1500);
  };

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-coffee-900 font-display">内容工厂</h1>
                <p className="text-xs text-coffee-500">批量获客素材 · AI一键生成</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(Object.keys(tabConfig) as TabKey[]).map((key) => {
              const config = tabConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    tab === key
                      ? 'bg-coffee-700 text-white shadow-md'
                      : 'bg-white text-coffee-600 hover:bg-coffee-50 border border-coffee-200'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-4">
            <div className="w-80 space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <h3 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-500" />
                  选择模板
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {templates[tab].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={cn(
                        'p-3 rounded-xl cursor-pointer transition-all border',
                        selectedTemplate?.id === t.id
                          ? 'bg-purple-50 border-purple-300'
                          : 'bg-cream border-transparent hover:bg-coffee-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-coffee-900">{t.title}</h4>
                        <ChevronRight className="w-4 h-4 text-coffee-400" />
                      </div>
                      <p className="text-xs text-coffee-500 line-clamp-1 mb-2">{t.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">{t.tag}</span>
                        <span className="text-[10px] text-coffee-400">{t.usageCount}次使用</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedTemplate || generating}
                className={cn(
                  'w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all',
                  selectedTemplate && !generating
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                    : 'bg-coffee-200 text-coffee-400 cursor-not-allowed'
                )}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>AI生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>一键生成内容</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col">
              {generatedContent ? (
                <>
                  <div className="p-4 border-b border-coffee-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-coffee-900">{generatedContent.title}</h3>
                      <p className="text-xs text-coffee-500">{generatedContent.type} · {generatedContent.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg bg-cream hover:bg-coffee-100 text-coffee-600" title="复制">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-cream hover:bg-coffee-100 text-coffee-600" title="下载">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="bg-cream rounded-xl p-4 text-sm text-coffee-700 leading-relaxed whitespace-pre-wrap">
                      {generatedContent.content}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-coffee-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-coffee-400" />
                    </div>
                    <p className="text-sm text-coffee-500">选择左侧模板，开始生成内容</p>
                  </div>
                </div>
              )}
            </div>
          </div>
    </Layout>
  );
}
