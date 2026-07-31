import { useState } from 'react';
import {
  FileText, Calculator, FileCheck,
  ChevronDown, RotateCcw, Download, Zap, Upload, Circle, Cylinder,
  Disc, Square as SquareIcon,
  Layers, Box,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

type TabKey = 'calculate' | 'quote';

const tabConfig: Record<TabKey, { label: string; icon: React.ComponentType<{ className?: string }>; subLabel: string; color: string }> = {
  calculate: { label: '智能算', icon: Calculator, subLabel: '成本核算', color: 'from-blue-500 to-cyan-500' },
  quote: { label: '标准化', icon: FileCheck, subLabel: '报价单生成', color: 'from-purple-500 to-pink-500' },
};

type ForgingType = 'ring' | 'disk' | 'shaft' | 'cylinder' | 'block';

const forgingTypes: { key: ForgingType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: 'ring', label: '环锻件', icon: Circle, desc: '环形/法兰类锻件' },
  { key: 'disk', label: '盘锻件', icon: Disc, desc: '圆盘/饼类锻件' },
  { key: 'shaft', label: '轴锻件', icon: Cylinder, desc: '长轴/杆类锻件' },
  { key: 'cylinder', label: '筒锻件', icon: Cylinder, desc: '筒体/厚壁筒' },
  { key: 'block', label: '方块锻件', icon: Box, desc: '矩形/方块锻件' },
];

const materials = [
  { id: 'GH4169', name: 'GH4169', category: '高温合金', price: 385, density: 8.2 },
  { id: 'GH141', name: 'GH141', category: '高温合金', price: 365, density: 8.2 },
  { id: 'GH3039', name: 'GH3039', category: '高温合金', price: 295, density: 8.2 },
  { id: 'TC4', name: 'TC4（钛合金）', category: '钛合金', price: 280, density: 4.51 },
  { id: '5A06', name: '5A06（铝合金）', category: '铝合金', price: 28.5, density: 2.7 },
  { id: '2A14', name: '2A14（铝合金）', category: '铝合金', price: 32.8, density: 2.7 },
  { id: '17-4PH', name: '17-4PH（不锈钢）', category: '不锈钢', price: 42.5, density: 7.9 },
  { id: '304', name: '304（不锈钢）', category: '不锈钢', price: 28, density: 7.9 },
  { id: '42CrMo', name: '42CrMo（合金结构钢）', category: '结构钢', price: 18, density: 7.85 },
];

export default function ProposalPage() {
  const [tab, setTab] = useState<TabKey>('calculate');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [forgingType, setForgingType] = useState<ForgingType>('ring');
  const [outerDiameter, setOuterDiameter] = useState<string>('');
  const [innerDiameter, setInnerDiameter] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);

  const [processingFee, setProcessingFee] = useState<string>('12.5');
  const [lossRate, setLossRate] = useState<string>('8.5');

  const selectedMat = materials.find((m) => m.id === selectedMaterial);

  const calculateRoughWeight = () => {
    if (!selectedMat) return 0;
    const density = selectedMat.density;

    let volume = 0;
    const od = parseFloat(outerDiameter) || 0;
    const id = parseFloat(innerDiameter) || 0;
    const h = parseFloat(height) || 0;
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;

    if (forgingType === 'ring') {
      if (!od || !h) return 0;
      const innerR = id > 0 ? id / 2 : od / 4;
      volume = Math.PI * ((od / 2) ** 2 - innerR ** 2) * h / 1000000000;
    } else if (forgingType === 'disk') {
      if (!od || !h) return 0;
      volume = Math.PI * (od / 2) ** 2 * h / 1000000000;
    } else if (forgingType === 'shaft') {
      if (!od || !l) return 0;
      volume = Math.PI * (od / 2) ** 2 * l / 1000000000;
    } else if (forgingType === 'cylinder') {
      if (!od || !h) return 0;
      const innerR = id > 0 ? id / 2 : od / 4;
      volume = Math.PI * ((od / 2) ** 2 - innerR ** 2) * h / 1000000000;
    } else if (forgingType === 'block') {
      if (!l || !w || !h) return 0;
      volume = l * w * h / 1000000000;
    }

    return Math.round(volume * density * 1000 * 100) / 100;
  };

  const roughWeight = calculateRoughWeight();
  const lossPercent = parseFloat(lossRate) || 0;
  const procFee = parseFloat(processingFee) || 0;
  const blankWeight = roughWeight > 0 ? Math.round(roughWeight * (1 + lossPercent / 100) * 100) / 100 : 0;
  const materialCost = blankWeight * (selectedMat?.price || 0);
  const forgingCost = blankWeight * procFee;
  const machiningCost = materialCost * 0.25;
  const heatTreatCost = materialCost * 0.1;
  const inspectionCost = materialCost * 0.05;
  const totalCost = Math.round((materialCost + forgingCost + machiningCost + heatTreatCost + inspectionCost) * 100) / 100;
  const suggestedPrice = Math.round(totalCost * 1.3 * 100) / 100;

  const handleReset = () => {
    setSelectedMaterial('');
    setOuterDiameter('');
    setInnerDiameter('');
    setHeight('');
    setLength('');
    setWidth('');
    setProcessingFee('12.5');
    setLossRate('8.5');
  };

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300';
  const labelClass = 'text-xs text-coffee-500 mb-1.5 block';

  const SectionTitle = ({ icon: Icon, title, subtitle, accent }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; accent?: string }) => (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', accent || 'bg-blue-100')}>
        <Icon className={cn('w-4 h-4', accent?.includes('text') || 'text-blue-600')} />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-coffee-900 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-coffee-400 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <Layout>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-coffee-900 font-display">方案报价</h1>
                <p className="text-xs text-coffee-500">智能成本核算 · 一键生成专业报价</p>
              </div>
            </div>
            <button className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
              <Zap className="w-4 h-4" />
              <span>成单加速器</span>
            </button>
          </div>

          <div className="flex gap-1.5 mb-5 bg-white p-1.5 rounded-2xl shadow-soft w-fit">
            {(Object.keys(tabConfig) as TabKey[]).map((key) => {
              const config = tabConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                    tab === key
                      ? `bg-gradient-to-br ${config.color} text-white shadow-sm`
                      : 'text-coffee-600 hover:bg-coffee-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                  <span className={cn('text-xs', tab === key ? 'text-white/70' : 'text-coffee-400')}>{config.subLabel}</span>
                </button>
              );
            })}
          </div>

          {tab === 'calculate' && (
            <div className="flex flex-col lg:flex-row gap-5 animate-fade-in">
              <div className="flex-1 space-y-4">
                <div className="bg-white rounded-2xl p-5 shadow-soft">
                  <SectionTitle icon={Upload} title="上传表格分析" subtitle="Excel表格智能识别尺寸与材质" accent="bg-sky-100 text-sky-600" />
                  <div className="border-2 border-dashed border-coffee-200 rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-coffee-50 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-6 h-6 text-coffee-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-coffee-700 mb-0.5">点击上传或拖拽文件至此处</p>
                    <p className="text-xs text-coffee-400">支持 .xlsx / .xls 格式 · 根据尺寸、材质自动计算毛坯重量</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-soft">
                  <SectionTitle icon={Layers} title="锻件类型选择" subtitle="选择对应的几何形状计算方式" accent="bg-indigo-100 text-indigo-600" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {forgingTypes.map((ft) => {
                      const Icon = ft.icon;
                      const active = forgingType === ft.key;
                      return (
                        <button
                          key={ft.key}
                          onClick={() => setForgingType(ft.key)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all border',
                            active
                              ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white border-transparent shadow-md scale-[1.02]'
                              : 'bg-cream text-coffee-600 border-transparent hover:bg-coffee-100 hover:border-coffee-200'
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="font-semibold">{ft.label}</span>
                          <span className={cn('text-[10px] font-normal', active ? 'text-white/70' : 'text-coffee-400')}>{ft.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-soft">
                  <SectionTitle icon={Calculator} title="尺寸与材料参数" subtitle="输入净尺寸自动计算重量" accent="bg-blue-100 text-blue-600" />

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-coffee-700 mb-2 block">原材料选择</label>
                      <div className="relative">
                        <button
                          onClick={() => setMaterialDropdownOpen(!materialDropdownOpen)}
                          className="w-full px-4 py-2.5 rounded-xl bg-cream text-left text-sm text-coffee-700 flex items-center justify-between hover:bg-coffee-50 border border-transparent hover:border-coffee-200 transition-colors"
                        >
                          <span className="font-medium">
                            {selectedMat ? `${selectedMat.name}（${selectedMat.category}）` : '请选择原材料'}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedMat && (
                              <span className="text-xs text-coffee-400">¥{selectedMat.price}/kg</span>
                            )}
                            <ChevronDown className={cn('w-4 h-4 text-coffee-400 transition-transform', materialDropdownOpen && 'rotate-180')} />
                          </div>
                        </button>
                        {materialDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1.5 bg-white rounded-xl shadow-lg border border-coffee-200 max-h-64 overflow-y-auto">
                            {materials.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => { setSelectedMaterial(m.id); setMaterialDropdownOpen(false); }}
                                className={cn(
                                  'w-full px-4 py-2.5 text-left text-sm hover:bg-coffee-50 flex items-center justify-between',
                                  selectedMaterial === m.id && 'bg-blue-50 text-blue-700'
                                )}
                              >
                                <div>
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-xs text-coffee-400 ml-2">{m.category}</span>
                                </div>
                                <span className="text-xs text-coffee-500 font-medium">¥{m.price}/kg</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-coffee-700">尺寸参数</label>
                        <span className="text-xs text-coffee-400">单位：mm</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(forgingType === 'ring' || forgingType === 'disk' || forgingType === 'cylinder') && (
                          <>
                            <div>
                              <label className={labelClass}>外径 (mm)</label>
                              <input
                                type="number"
                                value={outerDiameter}
                                onChange={(e) => setOuterDiameter(e.target.value)}
                                placeholder="请输入外径"
                                className={inputClass}
                              />
                            </div>
                            {(forgingType === 'ring' || forgingType === 'cylinder') && (
                              <div>
                                <label className={labelClass}>内径 (mm)</label>
                                <input
                                  type="number"
                                  value={innerDiameter}
                                  onChange={(e) => setInnerDiameter(e.target.value)}
                                  placeholder="请输入内径"
                                  className={inputClass}
                                />
                              </div>
                            )}
                            <div className={cn(forgingType === 'disk' && 'col-span-2')}>
                              <label className={labelClass}>
                                {forgingType === 'cylinder' ? '高度/长度 (mm)' : '高度/厚度 (mm)'}
                              </label>
                              <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="请输入高度"
                                className={inputClass}
                              />
                            </div>
                          </>
                        )}
                        {forgingType === 'shaft' && (
                          <>
                            <div>
                              <label className={labelClass}>直径 (mm)</label>
                              <input
                                type="number"
                                value={outerDiameter}
                                onChange={(e) => setOuterDiameter(e.target.value)}
                                placeholder="请输入直径"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>长度 (mm)</label>
                              <input
                                type="number"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                placeholder="请输入长度"
                                className={inputClass}
                              />
                            </div>
                          </>
                        )}
                        {forgingType === 'block' && (
                          <>
                            <div>
                              <label className={labelClass}>长度 (mm)</label>
                              <input
                                type="number"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                placeholder="请输入长度"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>宽度 (mm)</label>
                              <input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                placeholder="请输入宽度"
                                className={inputClass}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className={labelClass}>高度 (mm)</label>
                              <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="请输入高度"
                                className={inputClass}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-coffee-900">加工参数设置</h4>
                        <span className="text-xs text-blue-600 font-medium">可自定义</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>加工费 (元/kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={processingFee}
                            onChange={(e) => setProcessingFee(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>材料损耗率 (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={lossRate}
                            onChange={(e) => setLossRate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-200 hover:bg-coffee-50 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置参数
                  </button>
                  <button className="flex-[2] py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-shadow">
                    <FileText className="w-4 h-4" />
                    生成专业报价单
                  </button>
                </div>
              </div>

              <div className="w-full lg:w-96 space-y-4 sticky top-4 h-fit">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 shadow-lg text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Calculator className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">实时报价结果</p>
                        <p className="text-[11px] text-white/60">基于当前参数自动计算</p>
                      </div>
                    </div>
                    {selectedMat && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-medium">
                        {selectedMat.name}
                      </span>
                    )}
                  </div>

                  {roughWeight > 0 ? (
                    <div className="space-y-3.5">
                      <div className="text-center py-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-white/70 mb-1">毛坯重量（含 {lossPercent}% 损耗）</p>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight">
                          {blankWeight} <span className="text-base font-normal text-white/70">kg</span>
                        </p>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          净尺寸重量: {roughWeight} kg</p>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <CostRow label="原材料成本" value={`¥${materialCost.toFixed(2)}`} />
                        <CostRow label="锻造加工费" value={`¥${forgingCost.toFixed(2)}`} />
                        <CostRow label="机加工费" value={`¥${machiningCost.toFixed(2)}`} />
                        <CostRow label="热处理费" value={`¥${heatTreatCost.toFixed(2)}`} />
                        <CostRow label="检测费" value={`¥${inspectionCost.toFixed(2)}`} />
                        <div className="border-t border-white/20 my-1.5" />
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 font-medium">总成本</span>
                          <span className="font-bold text-lg">¥{totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                        <Calculator className="w-6 h-6 text-white/50" />
                      </div>
                      <p className="text-sm text-white/60">选择材料并输入参数</p>
                      <p className="text-xs text-white/40 mt-0.5">自动计算毛坯重量与报价</p>
                    </div>
                  )}
                </div>

                {roughWeight > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-soft border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-coffee-900">建议报价</p>
                      <p className="text-[11px] text-coffee-400">含 30% 毛利率</p>
                    </div>
                  </div>
                    <div className="text-center py-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                      <p className="text-2xl md:text-3xl font-bold text-emerald-600">
                        ¥{suggestedPrice.toFixed(2)}
                      </p>
                    </div>
                    <button className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5">
                      <Download className="w-4 h-4" />
                      导出报价单
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-4 shadow-soft">
                  <p className="text-xs font-medium text-coffee-600 mb-2">💡 计算说明</p>
                  <ul className="text-[11px] text-coffee-400 space-y-1 leading-relaxed">
                    <li>• 毛坯重量 = 净体积 × 密度 × (1 + 损耗率)</li>
                    <li>• 机加工费 = 材料成本 × 25%</li>
                    <li>• 热处理费 = 材料成本 × 10%</li>
                    <li>• 检测费 = 材料成本 × 5%</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === 'quote' && (
            <div className="bg-white rounded-2xl p-12 text-center animate-fade-in shadow-soft">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-md">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-coffee-900 mb-2">标准化报价单</h3>
              <p className="text-sm text-coffee-500 mb-6 max-w-sm mx-auto">
                快速生成规范、专业的报价单，支持自定义模板、Logo、条款等
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 flex items-center gap-2 mx-auto shadow-md">
                <Download className="w-4 h-4" />
                生成报价单
              </button>
            </div>
          )}
    </Layout>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/70">{label}</span>
      <span className="font-medium text-white/90">{value}</span>
    </div>
  );
}
