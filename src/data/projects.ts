export interface ProjectItem {
  id: string;
  customer: string;
  productionNo: string;
  drawingNo: string;
  productName: string;
  material: string;
  spec: string;
  quantity: number;
  blankWeight: string;
  unitPrice: number;
  piecePrice: number;
  totalPrice: number;
  hasContract: boolean;
  clientContractNo: string;
  plannedDelivery: string;
  actualDelivery: string;
  plannedQualified: string;
  qualified: boolean;
  risk: '正常' | '预警' | '注意' | '紧急';
  overdueDays?: number;
}

export interface ContractItem {
  id: string;
  clientContractNo: string;
  customer: string;
  linkedProjects: number;
  totalAmount: number;
  paymentStatus: '已回款' | '未回款' | '部分回款';
  invoiceDate: string;
  paymentDate: string;
  partialAmount: number;
  contractPaymentMethod: string;
  actualPaymentMethod: string;
  risk: '正常' | '预警' | '紧急';
}

export const mockProjects: ProjectItem[] = [
  {
    id: 'SC-2024-001', customer: '某某机械有限公司', productionNo: 'SC-2024-001', drawingNo: 'DWG-001',
    productName: '轴套', material: '45钢', spec: 'φ50×100', quantity: 20, blankWeight: '64KG',
    unitPrice: 8.5, piecePrice: 27.20, totalPrice: 544.00, hasContract: true, clientContractNo: 'HT-2024-001',
    plannedDelivery: '2026-03-03', actualDelivery: '2026-03-08', plannedQualified: '2026-03-06',
    qualified: true, risk: '正常',
  },
  {
    id: 'SC-2024-002', customer: '宏达重工集团', productionNo: 'SC-2024-002', drawingNo: 'DWG-002',
    productName: '法兰盘', material: '304不锈钢', spec: 'DN100 PN16', quantity: 50, blankWeight: '150KG',
    unitPrice: 22, piecePrice: 66.00, totalPrice: 3300.00, hasContract: true, clientContractNo: 'HD-2024-056',
    plannedDelivery: '2026-04-19', actualDelivery: '2026-04-22', plannedQualified: '2026-04-21',
    qualified: true, risk: '预警',
  },
  {
    id: 'SC-2024-003', customer: '精诚制造股份公司', productionNo: 'SC-2024-003', drawingNo: 'DWG-003',
    productName: '齿轮', material: '20CrMnTi', spec: 'M4×36T', quantity: 100, blankWeight: '280KG',
    unitPrice: 15, piecePrice: 42.00, totalPrice: 4200.00, hasContract: true, clientContractNo: 'JC-2024-112',
    plannedDelivery: '2026-05-02', actualDelivery: '2026-05-07', plannedQualified: '2026-05-09',
    qualified: true, risk: '预警',
  },
  {
    id: 'SC-2024-004', customer: '某某机械有限公司', productionNo: 'SC-2024-004', drawingNo: 'DWG-004',
    productName: '轴承座', material: 'HT250', spec: '型号B-200', quantity: 30, blankWeight: '90KG',
    unitPrice: 6, piecePrice: 18.00, totalPrice: 540.00, hasContract: false, clientContractNo: '—',
    plannedDelivery: '2026-05-25', actualDelivery: '2026-05-27', plannedQualified: '2026-05-28',
    qualified: true, risk: '注意',
  },
  {
    id: 'SC-2024-005', customer: '宏达重工集团', productionNo: 'SC-2024-005', drawingNo: 'DWG-005',
    productName: '支撑架', material: 'Q345B', spec: '200×300×20', quantity: 15, blankWeight: '189KG',
    unitPrice: 7.8, piecePrice: 98.28, totalPrice: 1474.20, hasContract: true, clientContractNo: 'HD-2024-078',
    plannedDelivery: '2026-06-08', actualDelivery: '—', plannedQualified: '2026-06-11',
    qualified: false, risk: '紧急', overdueDays: 38,
  },
  {
    id: 'SC-2024-006', customer: '新星电力设备厂', productionNo: 'SC-2024-006', drawingNo: 'DWG-006',
    productName: '密封圈', material: '橡胶复合材料', spec: 'φ120×8', quantity: 200, blankWeight: '8KG',
    unitPrice: 85, piecePrice: 3.40, totalPrice: 680.00, hasContract: true, clientContractNo: 'XX-2024-033',
    plannedDelivery: '2026-04-05', actualDelivery: '2026-04-07', plannedQualified: '2026-04-06',
    qualified: true, risk: '正常',
  },
  {
    id: 'SC-2024-007', customer: '精诚制造股份公司', productionNo: 'SC-2024-007', drawingNo: 'DWG-007',
    productName: '减速箱壳体', material: 'ZL102铝合金', spec: '定制件', quantity: 5, blankWeight: '45KG',
    unitPrice: 68, piecePrice: 612.00, totalPrice: 3060.00, hasContract: true, clientContractNo: 'JC-2024-115',
    plannedDelivery: '2026-05-15', actualDelivery: '2026-05-17', plannedQualified: '2026-05-27',
    qualified: false, risk: '紧急', overdueDays: 50,
  },
  {
    id: 'SC-2024-008', customer: '东风精密零件公司', productionNo: 'SC-2024-008', drawingNo: 'DWG-008',
    productName: '活塞杆', material: '42CrMo', spec: 'φ80×600', quantity: 10, blankWeight: '240KG',
    unitPrice: 18, piecePrice: 432.00, totalPrice: 4320.00, hasContract: true, clientContractNo: 'DF-2024-029',
    plannedDelivery: '2026-03-20', actualDelivery: '2026-03-23', plannedQualified: '2026-03-22',
    qualified: true, risk: '预警',
  },
  {
    id: 'SC-2024-009', customer: '华联精工有限公司', productionNo: 'SC-2024-009', drawingNo: 'DWG-009',
    productName: '连接板', material: 'Q235B', spec: '300×200×10', quantity: 40, blankWeight: '188KG',
    unitPrice: 7.2, piecePrice: 33.84, totalPrice: 1353.60, hasContract: true, clientContractNo: 'HL-2024-045',
    plannedDelivery: '2026-06-12', actualDelivery: '—', plannedQualified: '2026-06-14',
    qualified: false, risk: '紧急', overdueDays: 34,
  },
];

export const mockContracts: ContractItem[] = [
  {
    id: 'c1', clientContractNo: 'HT-2024-001', customer: '某某机械有限公司', linkedProjects: 1,
    totalAmount: 544.00, paymentStatus: '已回款', invoiceDate: '2026-03-13', paymentDate: '2026-04-07',
    partialAmount: 544.00, contractPaymentMethod: '月结30天', actualPaymentMethod: '电汇', risk: '正常',
  },
  {
    id: 'c2', clientContractNo: 'HD-2024-056', customer: '宏达重工集团', linkedProjects: 1,
    totalAmount: 3300.00, paymentStatus: '未回款', invoiceDate: '2026-04-27', paymentDate: '—',
    partialAmount: 0, contractPaymentMethod: '发货后30天', actualPaymentMethod: '—', risk: '预警',
  },
  {
    id: 'c3', clientContractNo: 'JC-2024-112', customer: '精诚制造股份公司', linkedProjects: 1,
    totalAmount: 4200.00, paymentStatus: '未回款', invoiceDate: '未开票', paymentDate: '—',
    partialAmount: 0, contractPaymentMethod: '开票后15天', actualPaymentMethod: '—', risk: '预警',
  },
  {
    id: 'c4', clientContractNo: 'HD-2024-078', customer: '宏达重工集团', linkedProjects: 1,
    totalAmount: 1474.20, paymentStatus: '未回款', invoiceDate: '未开票', paymentDate: '—',
    partialAmount: 0, contractPaymentMethod: '到货验收后付款', actualPaymentMethod: '—', risk: '紧急',
  },
  {
    id: 'c5', clientContractNo: 'XX-2024-033', customer: '新星电力设备厂', linkedProjects: 1,
    totalAmount: 680.00, paymentStatus: '已回款', invoiceDate: '2026-04-12', paymentDate: '2026-05-07',
    partialAmount: 680.00, contractPaymentMethod: '月结', actualPaymentMethod: '支票', risk: '正常',
  },
  {
    id: 'c6', clientContractNo: 'JC-2024-115', customer: '精诚制造股份公司', linkedProjects: 1,
    totalAmount: 3060.00, paymentStatus: '未回款', invoiceDate: '未开票', paymentDate: '—',
    partialAmount: 0, contractPaymentMethod: '款到发货', actualPaymentMethod: '—', risk: '紧急',
  },
  {
    id: 'c7', clientContractNo: 'DF-2024-029', customer: '东风精密零件公司', linkedProjects: 1,
    totalAmount: 4320.00, paymentStatus: '部分回款', invoiceDate: '2026-03-28', paymentDate: '2026-04-22',
    partialAmount: 2160.00, contractPaymentMethod: '分期付款', actualPaymentMethod: '转账', risk: '预警',
  },
  {
    id: 'c8', clientContractNo: 'HL-2024-045', customer: '华联精工有限公司', linkedProjects: 1,
    totalAmount: 1353.60, paymentStatus: '未回款', invoiceDate: '未开票', paymentDate: '—',
    partialAmount: 0, contractPaymentMethod: '货到付款', actualPaymentMethod: '—', risk: '紧急',
  },
];

// Legacy projects data for ProjectTracker / CustomerTracker compatibility
import type { ProjectItem as LegacyProjectItem } from '@/types';

export const projects: LegacyProjectItem[] = [
  {
    id: 'proj-001',
    name: '航空发动机涡轮盘锻件',
    customerId: 'c-001',
    stage: 'won',
    amount: 850,
    progress: 72,
    nextAction: '交付第二批锻件',
    nextActionAt: '2026-07-20',
    industry: '航空发动机',
    description: '高温合金涡轮盘锻件，用于某型航空发动机核心部件。',
    timeline: [
      { id: 't1', label: '技术协议签订', date: '2025-09-10', done: true },
      { id: 't2', label: '首批试制', date: '2025-11-15', done: true },
      { id: 't3', label: '首批交付', date: '2026-03-20', done: true },
      { id: 't4', label: '批量交付', date: '2026-08-30', done: false },
    ],
    tasks: [
      { id: 'task-1', name: '热处理工艺优化', progress: 80, status: 'in-progress', deadline: '2026-07-18' },
      { id: 'task-2', name: '尺寸检测报告', progress: 100, status: 'done', deadline: '2026-07-10' },
    ],
  },
  {
    id: 'proj-002',
    name: '航天火箭箭体环件',
    customerId: 'c-002',
    stage: 'quote',
    amount: 420,
    progress: 35,
    nextAction: '提交正式报价单',
    nextActionAt: '2026-07-18',
    industry: '航天科技',
    description: '铝合金大型环件，用于新一代运载火箭箭体结构。',
    timeline: [
      { id: 't1', label: '需求对接', date: '2026-05-20', done: true },
      { id: 't2', label: '工艺评审', date: '2026-06-30', done: true },
      { id: 't3', label: '报价确认', date: '2026-07-20', done: false },
    ],
    tasks: [
      { id: 'task-1', name: '材料成本核算', progress: 100, status: 'done', deadline: '2026-07-05' },
      { id: 'task-2', name: '加工周期评估', progress: 60, status: 'in-progress', deadline: '2026-07-15' },
    ],
  },
  {
    id: 'proj-003',
    name: '盾构机主轴承锻件',
    customerId: 'c-003',
    stage: 'contact',
    amount: 180,
    progress: 20,
    nextAction: '安排工厂考察',
    nextActionAt: '2026-07-22',
    industry: '高端机械装备',
    description: '大型盾构机主轴承用锻件，要求超声波探伤一级。',
    timeline: [
      { id: 't1', label: '初步接洽', date: '2026-06-10', done: true },
      { id: 't2', label: '工厂考察', date: '2026-07-25', done: false },
    ],
    tasks: [
      { id: 'task-1', name: '考察行程确认', progress: 30, status: 'pending', deadline: '2026-07-20' },
    ],
  },
  {
    id: 'proj-004',
    name: '战机起落架支柱锻件',
    customerId: 'c-004',
    stage: 'aftersale',
    amount: 620,
    progress: 95,
    nextAction: '售后质量回访',
    nextActionAt: '2026-07-25',
    industry: '航空制造',
    description: '超高强度钢起落架支柱锻件，已交付并进入售后阶段。',
    timeline: [
      { id: 't1', label: '合同签订', date: '2024-08-15', done: true },
      { id: 't2', label: '全部交付', date: '2025-12-20', done: true },
      { id: 't3', label: '质保期结束', date: '2026-12-20', done: false },
    ],
    tasks: [
      { id: 'task-1', name: '售后回访', progress: 0, status: 'pending', deadline: '2026-07-25' },
    ],
  },
  {
    id: 'proj-005',
    name: '卫星结构件钛合金锻件',
    customerId: 'c-005',
    stage: 'lead',
    amount: 310,
    progress: 10,
    nextAction: '发送公司资质资料',
    nextActionAt: '2026-07-17',
    industry: '航天科技',
    description: '钛合金卫星结构连接件，处于早期线索阶段。',
    timeline: [
      { id: 't1', label: '展会初识', date: '2026-06-28', done: true },
      { id: 't2', label: '资质评审', date: '2026-07-20', done: false },
    ],
    tasks: [
      { id: 'task-1', name: '整理资质文件', progress: 50, status: 'in-progress', deadline: '2026-07-16' },
    ],
  },
];
