import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import Layout from '@/components/Layout';

export default function PlaceholderPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const titles: Record<string, string> = {
    '/market-radar': '市情雷达',
    '/lead-radar': '线索雷达',
    '/content-factory': '内容工厂',
    '/proposal': '方案报价',
    '/customer-manager': '客户管家',
    '/performance-review': '业绩复盘',
    '/meeting-library': '会议知识库',
    '/project-manager': '项目管家',
  };

  const title = titles[location.pathname] || '新页面';

  return (
    <Layout>
      <div className="flex h-full items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-coffee-100 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-10 h-10 text-coffee-500" />
          </div>
          <h1 className="text-2xl font-bold text-coffee-900 font-display mb-3">{title}</h1>
          <p className="text-coffee-500 mb-8">该模块正在建设中，敬请期待。</p>
          <button
            onClick={() => navigate('/voice-workbench')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coffee-600 text-white rounded-xl font-medium hover:bg-coffee-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回工作台</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
