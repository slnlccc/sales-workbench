import { useState, useMemo, useEffect } from 'react';
import {
  Kanban,
  Search,
  Plus,
  Download,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Eye,
  AlertTriangle,
  Save,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockProjects as initialProjects, mockContracts as initialContracts, ProjectItem, ContractItem } from '@/data/projects';
import Layout from '@/components/Layout';

type Tab = 'project' | 'contract';

function formatCurrency(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    正常: 'bg-green-50 text-green-700 border-green-200',
    预警: 'bg-amber-50 text-amber-700 border-amber-200',
    注意: 'bg-blue-50 text-blue-700 border-blue-200',
    紧急: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', map[risk] || map['正常'])}>
      {risk}
    </span>
  );
}

const STORAGE_KEY_PROJECTS = 'workbench.projects.v1';
const STORAGE_KEY_CONTRACTS = 'workbench.contracts.v1';

function loadProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) return JSON.parse(raw) as ProjectItem[];
  } catch {}
  return initialProjects;
}
function loadContracts(): ContractItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTRACTS);
    if (raw) return JSON.parse(raw) as ContractItem[];
  } catch {}
  return initialContracts;
}

const emptyProject: Omit<ProjectItem, 'id'> = {
  customer: '',
  productionNo: '',
  drawingNo: '',
  productName: '',
  material: '',
  spec: '',
  quantity: 0,
  blankWeight: '',
  unitPrice: 0,
  piecePrice: 0,
  totalPrice: 0,
  hasContract: false,
  clientContractNo: '—',
  plannedDelivery: '',
  actualDelivery: '—',
  plannedQualified: '',
  qualified: false,
  risk: '正常',
  overdueDays: 0,
};

const emptyContract: Omit<ContractItem, 'id'> = {
  clientContractNo: '',
  customer: '',
  linkedProjects: 0,
  totalAmount: 0,
  paymentStatus: '未回款',
  invoiceDate: '未开票',
  paymentDate: '—',
  partialAmount: 0,
  contractPaymentMethod: '',
  actualPaymentMethod: '—',
  risk: '正常',
};

export default function ProjectManagerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('project');

  const [projects, setProjects] = useState<ProjectItem[]>(() => loadProjects());
  const [contracts, setContracts] = useState<ContractItem[]>(() => loadContracts());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  }, [contracts]);

  // Project tab state
  const [projectSearch, setProjectSearch] = useState('');
  const [projectContractStatus, setProjectContractStatus] = useState('全部');
  const [projectDeliveryStatus, setProjectDeliveryStatus] = useState('全部');
  const [projectDateFrom, setProjectDateFrom] = useState('');
  const [projectDateTo, setProjectDateTo] = useState('');
  const [projectPage, setProjectPage] = useState(1);

  // Contract tab state
  const [contractSearch, setContractSearch] = useState('');
  const [contractPaymentStatus, setContractPaymentStatus] = useState('全部');
  const [contractPage, setContractPage] = useState(1);

  // Modal states
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectItem | null>(null);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [viewingContract, setViewingContract] = useState<ContractItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'project' | 'contract'; id: string } | null>(null);

  const pageSize = 10;

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = projectSearch.trim();
      if (q) {
        const hit =
          p.customer.includes(q) ||
          p.productName.includes(q) ||
          p.drawingNo.includes(q) ||
          p.productionNo.includes(q);
        if (!hit) return false;
      }
      if (projectContractStatus !== '全部') {
        if (projectContractStatus === '有合同' && !p.hasContract) return false;
        if (projectContractStatus === '无合同' && p.hasContract) return false;
      }
      if (projectDeliveryStatus !== '全部') {
        if (projectDeliveryStatus === '已发货' && p.actualDelivery === '—') return false;
        if (projectDeliveryStatus === '未发货' && p.actualDelivery !== '—') return false;
      }
      if (projectDateFrom) {
        if (p.plannedDelivery < projectDateFrom) return false;
      }
      if (projectDateTo) {
        if (p.plannedDelivery > projectDateTo) return false;
      }
      return true;
    });
  }, [projects, projectSearch, projectContractStatus, projectDeliveryStatus, projectDateFrom, projectDateTo]);

  const projectStats = useMemo(() => {
    const total = filteredProjects.length;
    const totalAmount = filteredProjects.reduce((sum, p) => sum + p.totalPrice, 0);
    const withContract = filteredProjects.filter((p) => p.hasContract).length;
    const shipped = filteredProjects.filter((p) => p.actualDelivery !== '—').length;
    return { total, totalAmount, withContract, shipped };
  }, [filteredProjects]);

  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const projectPaged = filteredProjects.slice((projectPage - 1) * pageSize, projectPage * pageSize);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = contractSearch.trim();
      if (q) {
        const hit = c.customer.includes(q) || c.clientContractNo.includes(q);
        if (!hit) return false;
      }
      if (contractPaymentStatus !== '全部') {
        if (c.paymentStatus !== contractPaymentStatus) return false;
      }
      return true;
    });
  }, [contracts, contractSearch, contractPaymentStatus]);

  const contractStats = useMemo(() => {
    const total = filteredContracts.length;
    const totalAmount = filteredContracts.reduce((sum, c) => sum + c.totalAmount, 0);
    const received = filteredContracts.filter((c) => c.paymentStatus === '已回款').reduce((s, c) => s + c.partialAmount, 0);
    const partial = filteredContracts.filter((c) => c.paymentStatus === '部分回款').reduce((s, c) => s + c.partialAmount, 0);
    const pending = filteredContracts.filter((c) => c.paymentStatus === '未回款').reduce((s, c) => s + c.totalAmount, 0);
    return { total, totalAmount, received, partial, pending };
  }, [filteredContracts]);

  const contractTotalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const contractPaged = filteredContracts.slice((contractPage - 1) * pageSize, contractPage * pageSize);

  function clearProjectFilters() {
    setProjectSearch('');
    setProjectContractStatus('全部');
    setProjectDeliveryStatus('全部');
    setProjectDateFrom('');
    setProjectDateTo('');
    setProjectPage(1);
  }

  function clearContractFilters() {
    setContractSearch('');
    setContractPaymentStatus('全部');
    setContractPage(1);
  }

  // CRUD handlers
  function handleAddProject() {
    const newItem: ProjectItem = {
      ...emptyProject,
      id: `SC-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
      productionNo: `SC-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
    };
    setEditingProject(newItem);
  }

  function handleSaveProject(item: ProjectItem) {
    const itemWithContract: ProjectItem = {
      ...item,
      hasContract: item.clientContractNo && item.clientContractNo !== '—',
    };
    const exists = projects.find((p) => p.id === itemWithContract.id);
    if (exists) {
      setProjects((prev) => prev.map((p) => (p.id === itemWithContract.id ? itemWithContract : p)));
    } else {
      setProjects((prev) => [itemWithContract, ...prev]);
      // auto-increment linked projects count on the contract
      if (itemWithContract.clientContractNo && itemWithContract.clientContractNo !== '—') {
        setContracts((prev) =>
          prev.map((c) =>
            c.clientContractNo === itemWithContract.clientContractNo
              ? { ...c, linkedProjects: c.linkedProjects + 1 }
              : c
          )
        );
      }
    }
    setEditingProject(null);
  }

  function handleDeleteProject(id: string) {
    const target = projects.find((p) => p.id === id);
    if (target?.clientContractNo && target.clientContractNo !== '—') {
      setContracts((prev) =>
        prev.map((c) =>
          c.clientContractNo === target.clientContractNo
            ? { ...c, linkedProjects: Math.max(0, c.linkedProjects - 1) }
            : c
        )
      );
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
  }

  function handleAddContract() {
    const newItem: ContractItem = {
      ...emptyContract,
      id: `c-${Date.now()}`,
      clientContractNo: `NEW-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
    };
    setEditingContract(newItem);
  }

  function handleAddContractFromProject(c: ContractItem) {
    setContracts((prev) => {
      if (prev.some((x) => x.clientContractNo === c.clientContractNo)) {
        // contract already exists, just bump linked count
        return prev.map((x) =>
          x.clientContractNo === c.clientContractNo
            ? { ...x, linkedProjects: x.linkedProjects + 1 }
            : x
        );
      }
      return [c, ...prev];
    });
  }

  function handleSaveContract(item: ContractItem) {
    const exists = contracts.find((c) => c.id === item.id);
    if (exists) {
      setContracts((prev) => prev.map((c) => (c.id === item.id ? item : c)));
    } else {
      setContracts((prev) => [item, ...prev]);
    }
    setEditingContract(null);
  }

  function handleDeleteContract(id: string) {
    setContracts((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
  }

  return (
    <Layout>
          {/* Title area */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coffee-600 to-caramel flex items-center justify-center text-white">
                <Kanban className="w-5 h-5" />
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-coffee-900 font-display">项目管家</h1>
            </div>
            <p className="text-sm text-coffee-500 ml-10">全流程闭环管控</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('project')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'project'
                  ? 'bg-coffee-600 text-white shadow-soft'
                  : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
              )}
            >
              生产项目管理
            </button>
            <button
              onClick={() => setActiveTab('contract')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'contract'
                  ? 'bg-coffee-600 text-white shadow-soft'
                  : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
              )}
            >
              合同管理
            </button>
          </div>

          {activeTab === 'project' && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddProject}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 transition-colors shadow-soft"
                >
                  <Plus className="w-4 h-4" />
                  新增项目
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50 transition-colors">
                  <Download className="w-4 h-4" />
                  导出项目
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  AI智能录入
                </button>
              </div>

              {/* Search & filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => { setProjectSearch(e.target.value); setProjectPage(1); }}
                    placeholder="搜索客户/产品/图号..."
                    className="pl-8 pr-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300 w-full md:w-64"
                  />
                </div>
                <select
                  value={projectContractStatus}
                  onChange={(e) => { setProjectContractStatus(e.target.value); setProjectPage(1); }}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                >
                  <option>全部合同状态</option>
                  <option>有合同</option>
                  <option>无合同</option>
                </select>
                <select
                  value={projectDeliveryStatus}
                  onChange={(e) => { setProjectDeliveryStatus(e.target.value); setProjectPage(1); }}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                >
                  <option>全部发货状态</option>
                  <option>已发货</option>
                  <option>未发货</option>
                </select>
                <input
                  type="date"
                  value={projectDateFrom}
                  onChange={(e) => { setProjectDateFrom(e.target.value); setProjectPage(1); }}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                />
                <input
                  type="date"
                  value={projectDateTo}
                  onChange={(e) => { setProjectDateTo(e.target.value); setProjectPage(1); }}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                />
                <button
                  onClick={clearProjectFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white text-coffee-600 border border-coffee-200 text-sm hover:bg-coffee-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  清除
                </button>
              </div>

              {/* Statistics */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-coffee-700 bg-white border border-coffee-200 rounded-xl px-4 py-3 shadow-soft">
                <span>共 <span className="font-semibold text-coffee-900">{projectStats.total}</span> 个项目</span>
                <span className="text-coffee-300">|</span>
                <span>总金额 <span className="font-semibold text-coffee-900">{formatCurrency(projectStats.totalAmount)}</span></span>
                <span className="text-coffee-300">|</span>
                <span>有合同 <span className="font-semibold text-coffee-900">{projectStats.withContract}</span></span>
                <span className="text-coffee-300">|</span>
                <span>已发货 <span className="font-semibold text-coffee-900">{projectStats.shipped}</span></span>
              </div>

              {/* Table */}
              <div className="bg-white border border-coffee-200 rounded-xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-coffee-700">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">序号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">客户单位</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">生产编号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">图号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">产品名称</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">材质</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">规格型号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">数量(件)</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">下料重</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">单价(元/KG)</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">单件价</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">总价</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">有无合同</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">客户端合同号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">预计发货</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">实际发货</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">预计合格</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">合格证</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">风险</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {projectPaged.map((p, idx) => {
                        const isOverdue = p.actualDelivery === '—' && (p.overdueDays ?? 0) > 0;
                        return (
                          <tr key={p.id} className="hover:bg-coffee-50/50 transition-colors">
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{(projectPage - 1) * pageSize + idx + 1}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.customer}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap font-medium">{p.productionNo}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.drawingNo}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.productName}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.material}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.spec}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.quantity}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.blankWeight}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.unitPrice}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.piecePrice.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.totalPrice.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">
                              {p.hasContract ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">有</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">无</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">
                              {p.clientContractNo !== '—' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  <FileText className="w-3 h-3" />
                                  {p.clientContractNo}
                                </span>
                              ) : (
                                <span className="text-coffee-400">—</span>
                              )}
                            </td>
                            <td className={cn('px-3 py-2.5 whitespace-nowrap', isOverdue && 'text-red-600 font-medium')}>
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {p.plannedDelivery}
                                </span>
                              ) : (
                                p.plannedDelivery
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">
                              {p.actualDelivery !== '—' ? p.actualDelivery : (isOverdue ? `逾期${p.overdueDays}天` : '—')}
                            </td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.plannedQualified}</td>
                            <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{p.qualified ? '有' : '无'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <RiskBadge risk={p.risk} />
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setViewingProject(p)}
                                  className="p-1 rounded-md hover:bg-coffee-100 text-coffee-600 transition-colors"
                                  title="查看"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingProject(p)}
                                  className="p-1 rounded-md hover:bg-coffee-100 text-coffee-600 transition-colors"
                                  title="编辑"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ kind: 'project', id: p.id })}
                                  className="p-1 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredProjects.length === 0 && (
                  <div className="py-10 text-center text-sm text-coffee-400">暂无数据</div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-coffee-100">
                  <div className="text-xs text-coffee-500">
                    共 {filteredProjects.length} 条记录，第 {projectPage} / {projectTotalPages} 页
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setProjectPage((prev) => Math.max(1, prev - 1))}
                      disabled={projectPage === 1}
                      className="p-1.5 rounded-md border border-coffee-200 bg-white text-coffee-600 hover:bg-coffee-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: projectTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setProjectPage(page)}
                        className={cn(
                          'min-w-[28px] px-2 py-1 rounded-md text-sm transition-colors',
                          page === projectPage
                            ? 'bg-coffee-600 text-white'
                            : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setProjectPage((prev) => Math.min(projectTotalPages, prev + 1))}
                      disabled={projectPage === projectTotalPages}
                      className="p-1.5 rounded-md border border-coffee-200 bg-white text-coffee-600 hover:bg-coffee-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contract' && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddContract}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 transition-colors shadow-soft"
                >
                  <Plus className="w-4 h-4" />
                  新增合同
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50 transition-colors">
                  <Download className="w-4 h-4" />
                  导出合同
                </button>
              </div>

              {/* Search & filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                  <input
                    type="text"
                    value={contractSearch}
                    onChange={(e) => { setContractSearch(e.target.value); setContractPage(1); }}
                    placeholder="搜索客户/合同号..."
                    className="pl-8 pr-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300 w-full md:w-64"
                  />
                </div>
                <select
                  value={contractPaymentStatus}
                  onChange={(e) => { setContractPaymentStatus(e.target.value); setContractPage(1); }}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                >
                  <option>全部回款状态</option>
                  <option>已回款</option>
                  <option>未回款</option>
                  <option>部分回款</option>
                </select>
                <button
                  onClick={clearContractFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white text-coffee-600 border border-coffee-200 text-sm hover:bg-coffee-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  清除
                </button>
              </div>

              {/* Statistics */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-coffee-700 bg-white border border-coffee-200 rounded-xl px-4 py-3 shadow-soft">
                <span>共 <span className="font-semibold text-coffee-900">{contractStats.total}</span> 个合同</span>
                <span className="text-coffee-300">|</span>
                <span>合同总额 <span className="font-semibold text-coffee-900">{formatCurrency(contractStats.totalAmount)}</span></span>
                <span className="text-coffee-300">|</span>
                <span>已回款 <span className="font-semibold text-coffee-900">{formatCurrency(contractStats.received)}</span></span>
                <span className="text-coffee-300">|</span>
                <span>部分回款 <span className="font-semibold text-coffee-900">{formatCurrency(contractStats.partial)}</span></span>
                <span className="text-coffee-300">|</span>
                <span>待回款 <span className="font-semibold text-coffee-900">{formatCurrency(contractStats.pending)}</span></span>
              </div>

              {/* Table */}
              <div className="bg-white border border-coffee-200 rounded-xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-coffee-700">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">序号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">客户端合同号</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">客户单位</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">关联项目数</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">合同总额</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">回款状态</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">开票日期</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">回款日期</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">部分回款金额</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">合同付款方式</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">实际付款方式</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">风险</th>
                        <th className="px-3 py-3 text-left font-medium whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {contractPaged.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-coffee-50/50 transition-colors">
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{(contractPage - 1) * pageSize + idx + 1}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap font-medium">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <FileText className="w-3 h-3" />
                              {c.clientContractNo}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.customer}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-coffee-100 text-coffee-700">
                              {c.linkedProjects} 个
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.totalAmount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.paymentStatus}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.invoiceDate}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.paymentDate}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.partialAmount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.contractPaymentMethod}</td>
                          <td className="px-3 py-2.5 text-coffee-800 whitespace-nowrap">{c.actualPaymentMethod}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <RiskBadge risk={c.risk} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewingContract(c)}
                                className="p-1 rounded-md hover:bg-coffee-100 text-coffee-600 transition-colors"
                                title="查看"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingContract(c)}
                                className="p-1 rounded-md hover:bg-coffee-100 text-coffee-600 transition-colors"
                                title="编辑"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ kind: 'contract', id: c.id })}
                                className="p-1 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredContracts.length === 0 && (
                  <div className="py-10 text-center text-sm text-coffee-400">暂无数据</div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-coffee-100">
                  <div className="text-xs text-coffee-500">
                    共 {filteredContracts.length} 条记录，第 {contractPage} / {contractTotalPages} 页
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setContractPage((prev) => Math.max(1, prev - 1))}
                      disabled={contractPage === 1}
                      className="p-1.5 rounded-md border border-coffee-200 bg-white text-coffee-600 hover:bg-coffee-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: contractTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setContractPage(page)}
                        className={cn(
                          'min-w-[28px] px-2 py-1 rounded-md text-sm transition-colors',
                          page === contractPage
                            ? 'bg-coffee-600 text-white'
                            : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setContractPage((prev) => Math.min(contractTotalPages, prev + 1))}
                      disabled={contractPage === contractTotalPages}
                      className="p-1.5 rounded-md border border-coffee-200 bg-white text-coffee-600 hover:bg-coffee-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      {/* Project View Modal */}
      {viewingProject && (
        <ProjectViewModal item={viewingProject} onClose={() => setViewingProject(null)} />
      )}

      {/* Project Edit Modal */}
      {editingProject && (
        <ProjectEditModal
          item={editingProject}
          contracts={contracts}
          existingProjectIds={projects.map((p) => p.id)}
          onSave={handleSaveProject}
          onAddContract={handleAddContractFromProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* Contract View Modal */}
      {viewingContract && (
        <ContractViewModal item={viewingContract} projects={projects} onClose={() => setViewingContract(null)} />
      )}

      {/* Contract Edit Modal */}
      {editingContract && (
        <ContractEditModal item={editingContract} onSave={handleSaveContract} onClose={() => setEditingContract(null)} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDeleteModal
          kind={confirmDelete.kind}
          onConfirm={() =>
            confirmDelete.kind === 'project'
              ? handleDeleteProject(confirmDelete.id)
              : handleDeleteContract(confirmDelete.id)
          }
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </Layout>
  );
}

// ========== Project View Modal ==========
function ProjectViewModal({ item, onClose }: { item: ProjectItem; onClose: () => void }) {
  const isOverdue = item.actualDelivery === '—' && (item.overdueDays ?? 0) > 0;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-coffee-900 font-display">项目详情</h2>
            <p className="text-xs text-coffee-500 mt-0.5">{item.productionNo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-coffee-50 text-coffee-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="客户单位" value={item.customer} />
          <Field label="生产编号" value={item.productionNo} />
          <Field label="图号" value={item.drawingNo} />
          <Field label="产品名称" value={item.productName} />
          <Field label="材质" value={item.material} />
          <Field label="规格型号" value={item.spec} />
          <Field label="数量" value={`${item.quantity} 件`} />
          <Field label="下料重" value={item.blankWeight} />
          <Field label="单价(元/KG)" value={String(item.unitPrice)} />
          <Field label="单件价" value={item.piecePrice.toFixed(2)} />
          <Field label="总价" value={item.totalPrice.toFixed(2)} />
          <Field label="有无合同" value={item.hasContract ? '有' : '无'} />
          <Field label="客户端合同号" value={item.clientContractNo} />
          <Field label="预计发货" value={item.plannedDelivery} />
          <Field label="实际发货" value={isOverdue ? `逾期${item.overdueDays}天` : item.actualDelivery} />
          <Field label="预计合格" value={item.plannedQualified} />
          <Field label="合格证" value={item.qualified ? '有' : '无'} />
          <Field label="风险" value={<RiskBadge risk={item.risk} />} />
        </div>
        <div className="px-6 py-3 border-t border-coffee-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-coffee-500 mb-1">{label}</div>
      <div className="text-sm text-coffee-900">{value}</div>
    </div>
  );
}

// ========== Project Edit Modal ==========
function ProjectEditModal({
  item,
  contracts,
  existingProjectIds,
  onSave,
  onAddContract,
  onClose,
}: {
  item: ProjectItem;
  contracts: ContractItem[];
  existingProjectIds: string[];
  onSave: (item: ProjectItem) => void;
  onAddContract: (c: ContractItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectItem>({ ...item });
  const [newContractNo, setNewContractNo] = useState('');

  const isEdit = existingProjectIds.includes(item.id);

  function update<K extends keyof ProjectItem>(key: K, value: ProjectItem[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddNewContract() {
    if (!newContractNo.trim()) return;
    const c: ContractItem = {
      id: `c-${Date.now()}`,
      clientContractNo: newContractNo.trim(),
      customer: form.customer || '未指定客户',
      linkedProjects: 1,
      totalAmount: form.totalPrice,
      paymentStatus: '未回款',
      invoiceDate: '未开票',
      paymentDate: '—',
      partialAmount: 0,
      contractPaymentMethod: '—',
      actualPaymentMethod: '—',
      risk: '正常',
    };
    onAddContract(c);
    onSave({ ...form, clientContractNo: c.clientContractNo, hasContract: true });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base md:text-lg font-semibold text-coffee-900 font-display">
            {isEdit ? '编辑项目' : '新增项目'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-coffee-50 text-coffee-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Input label="生产编号" value={form.productionNo} onChange={(v) => update('productionNo', v)} />
          <Input label="客户单位" value={form.customer} onChange={(v) => update('customer', v)} />
          <Input label="图号" value={form.drawingNo} onChange={(v) => update('drawingNo', v)} />
          <Input label="产品名称" value={form.productName} onChange={(v) => update('productName', v)} />
          <Input label="材质" value={form.material} onChange={(v) => update('material', v)} />
          <Input label="规格型号" value={form.spec} onChange={(v) => update('spec', v)} />
          <Input
            label="数量(件)"
            type="number"
            value={String(form.quantity)}
            onChange={(v) => update('quantity', Number(v) || 0)}
          />
          <Input label="下料重" value={form.blankWeight} onChange={(v) => update('blankWeight', v)} />
          <Input
            label="单价(元/KG)"
            type="number"
            value={String(form.unitPrice)}
            onChange={(v) => update('unitPrice', Number(v) || 0)}
          />
          <Input
            label="单件价"
            type="number"
            value={String(form.piecePrice)}
            onChange={(v) => update('piecePrice', Number(v) || 0)}
          />
          <Input
            label="总价"
            type="number"
            value={String(form.totalPrice)}
            onChange={(v) => update('totalPrice', Number(v) || 0)}
          />

          <div>
            <div className="text-xs text-coffee-500 mb-1">客户端合同号（绑定合同）</div>
            <div className="flex gap-2">
              <select
                value={form.clientContractNo}
                onChange={(e) => update('clientContractNo', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
              >
                <option value="—">— 不绑定 —</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.clientContractNo}>
                    {c.clientContractNo} · {c.customer}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-2">
              <input
                value={newContractNo}
                onChange={(e) => setNewContractNo(e.target.value)}
                placeholder="或新增合同号"
                className="flex-1 px-3 py-1.5 rounded-md border border-coffee-200 bg-white text-xs text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300"
              />
              <button
                type="button"
                onClick={handleAddNewContract}
                className="px-3 py-1.5 rounded-md bg-coffee-600 text-white text-xs hover:bg-coffee-700"
              >
                新增合同并绑定
              </button>
            </div>
          </div>

          <Input
            label="预计发货"
            type="date"
            value={form.plannedDelivery}
            onChange={(v) => update('plannedDelivery', v)}
          />
          <Input
            label="实际发货"
            value={form.actualDelivery}
            onChange={(v) => update('actualDelivery', v)}
          />
          <Input
            label="预计合格"
            type="date"
            value={form.plannedQualified}
            onChange={(v) => update('plannedQualified', v)}
          />
          <div>
            <div className="text-xs text-coffee-500 mb-1">合格证</div>
            <select
              value={form.qualified ? '有' : '无'}
              onChange={(e) => update('qualified', e.target.value === '有')}
              className="w-full px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
            >
              <option>有</option>
              <option>无</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-coffee-500 mb-1">风险</div>
            <select
              value={form.risk}
              onChange={(e) => update('risk', e.target.value as ProjectItem['risk'])}
              className="w-full px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
            >
              <option>正常</option>
              <option>注意</option>
              <option>预警</option>
              <option>紧急</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-coffee-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50"
          >
            取消
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <div className="text-xs text-coffee-500 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
      />
    </div>
  );
}

// ========== Contract View Modal ==========
function ContractViewModal({
  item,
  projects,
  onClose,
}: {
  item: ContractItem;
  projects: ProjectItem[];
  onClose: () => void;
}) {
  const linked = projects.filter((p) => p.clientContractNo === item.clientContractNo);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-coffee-900 font-display">合同详情</h2>
            <p className="text-xs text-coffee-500 mt-0.5">{item.clientContractNo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-coffee-50 text-coffee-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="客户端合同号" value={item.clientContractNo} />
          <Field label="客户单位" value={item.customer} />
          <Field label="关联项目数" value={`${item.linkedProjects} 个`} />
          <Field label="合同总额" value={item.totalAmount.toFixed(2)} />
          <Field label="回款状态" value={item.paymentStatus} />
          <Field label="开票日期" value={item.invoiceDate} />
          <Field label="回款日期" value={item.paymentDate} />
          <Field label="部分回款金额" value={item.partialAmount.toFixed(2)} />
          <Field label="合同付款方式" value={item.contractPaymentMethod} />
          <Field label="实际付款方式" value={item.actualPaymentMethod} />
          <Field label="风险" value={<RiskBadge risk={item.risk} />} />
        </div>
        <div className="px-6 pb-4">
          <h3 className="text-sm font-semibold text-coffee-800 mb-2">关联生产项目</h3>
          {linked.length === 0 ? (
            <div className="text-xs text-coffee-400">暂无关联项目</div>
          ) : (
            <div className="border border-coffee-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-coffee-50 text-coffee-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">生产编号</th>
                    <th className="px-3 py-2 text-left font-medium">产品名称</th>
                    <th className="px-3 py-2 text-left font-medium">规格</th>
                    <th className="px-3 py-2 text-left font-medium">数量</th>
                    <th className="px-3 py-2 text-left font-medium">总价</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {linked.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium text-coffee-800">{p.productionNo}</td>
                      <td className="px-3 py-2 text-coffee-700">{p.productName}</td>
                      <td className="px-3 py-2 text-coffee-700">{p.spec}</td>
                      <td className="px-3 py-2 text-coffee-700">{p.quantity}</td>
                      <td className="px-3 py-2 text-coffee-700">{p.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-coffee-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Contract Edit Modal ==========
function ContractEditModal({
  item,
  onSave,
  onClose,
}: {
  item: ContractItem;
  onSave: (item: ContractItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContractItem>({ ...item });

  function update<K extends keyof ContractItem>(key: K, value: ContractItem[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base md:text-lg font-semibold text-coffee-900 font-display">
            {item.id.startsWith('c-') && item.clientContractNo.startsWith('NEW-') ? '新增合同' : '编辑合同'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-coffee-50 text-coffee-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Input label="客户端合同号" value={form.clientContractNo} onChange={(v) => update('clientContractNo', v)} />
          <Input label="客户单位" value={form.customer} onChange={(v) => update('customer', v)} />
          <Input
            label="关联项目数"
            type="number"
            value={String(form.linkedProjects)}
            onChange={(v) => update('linkedProjects', Number(v) || 0)}
          />
          <Input
            label="合同总额"
            type="number"
            value={String(form.totalAmount)}
            onChange={(v) => update('totalAmount', Number(v) || 0)}
          />
          <div>
            <div className="text-xs text-coffee-500 mb-1">回款状态</div>
            <select
              value={form.paymentStatus}
              onChange={(e) => update('paymentStatus', e.target.value as ContractItem['paymentStatus'])}
              className="w-full px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
            >
              <option>未回款</option>
              <option>部分回款</option>
              <option>已回款</option>
            </select>
          </div>
          <Input label="开票日期" value={form.invoiceDate} onChange={(v) => update('invoiceDate', v)} />
          <Input label="回款日期" value={form.paymentDate} onChange={(v) => update('paymentDate', v)} />
          <Input
            label="部分回款金额"
            type="number"
            value={String(form.partialAmount)}
            onChange={(v) => update('partialAmount', Number(v) || 0)}
          />
          <Input
            label="合同付款方式"
            value={form.contractPaymentMethod}
            onChange={(v) => update('contractPaymentMethod', v)}
          />
          <Input
            label="实际付款方式"
            value={form.actualPaymentMethod}
            onChange={(v) => update('actualPaymentMethod', v)}
          />
          <div>
            <div className="text-xs text-coffee-500 mb-1">风险</div>
            <select
              value={form.risk}
              onChange={(e) => update('risk', e.target.value as ContractItem['risk'])}
              className="w-full px-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
            >
              <option>正常</option>
              <option>预警</option>
              <option>紧急</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-coffee-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50"
          >
            取消
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded-lg bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Delete Confirm Modal ==========
function ConfirmDeleteModal({
  kind,
  onConfirm,
  onClose,
}: {
  kind: 'project' | 'contract';
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-coffee-900 mb-1">确认删除？</h3>
          <p className="text-sm text-coffee-500">
            确定要删除该{kind === 'project' ? '项目' : '合同'}吗？此操作不可撤销。
          </p>
        </div>
        <div className="px-6 py-3 border-t border-coffee-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-coffee-700 border border-coffee-200 text-sm font-medium hover:bg-coffee-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
