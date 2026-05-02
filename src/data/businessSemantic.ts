/**
 * 业务语义分类体系
 * 核心原则：按"业务角色"分类，而非按"重要性"分层
 *
 * 5类节点角色：
 * - entity:  业务实体（客户、供应商、品牌商、设计师 — 谁在做）
 * - system:  业务系统（ERP、MES、WMS — 用什么做）
 * - process: 工艺节点（车间、工序、设备 — 怎么做）
 * - order:   业务单据（订单、合同、物流 — 做什么）
 * - metric:  指标/风险（成本、次品率、风险 — 做得怎样）
 *
 * 3类边角色：
 * - flow:    主流程（工序前置、订单驱动 — 业务怎么流转）
 * - support: 支撑链（系统支撑、仓储存储 — 什么在支撑业务）
 * - impact:  影响链（成本传导、风险影响 — 什么在影响结果）
 */

// ==================== 节点语义分类 ====================

export type NodeSemantic = 'entity' | 'system' | 'process' | 'order' | 'metric';

export interface SemanticConfig {
  label: string;        // 中文名
  shape: 'circle' | 'rect' | 'diamond' | 'hexagon' | 'triangle'; // G6 形状
  fill: string;         // 填充色
  stroke: string;       // 边框色
  size: number;         // 基础大小
  labelColor: string;   // 标签颜色
  badge?: string;       // 角标
}

/** 节点语义配置 */
export const NODE_SEMANTIC_CONFIG: Record<NodeSemantic, SemanticConfig> = {
  entity: {
    label: '业务主体',
    shape: 'circle',
    fill: '#2563EB',      // 蓝色 — 稳定可靠
    stroke: '#60A5FA',
    size: 40,
    labelColor: '#DBEAFE',
    badge: '●',
  },
  system: {
    label: '业务系统',
    shape: 'rect',
    fill: '#7C3AED',      // 紫色 — 科技感
    stroke: '#A78BFA',
    size: 36,
    labelColor: '#EDE9FE',
    badge: '▣',
  },
  process: {
    label: '工艺节点',
    shape: 'diamond',
    fill: '#059669',      // 绿色 — 生产制造
    stroke: '#34D399',
    size: 38,
    labelColor: '#D1FAE5',
    badge: '◆',
  },
  order: {
    label: '业务单据',
    shape: 'hexagon',
    fill: '#D97706',      // 橙色 — 订单驱动
    stroke: '#FBBF24',
    size: 38,
    labelColor: '#FEF3C7',
    badge: '⬡',
  },
  metric: {
    label: '指标/风险',
    shape: 'triangle',
    fill: '#DC2626',      // 红色 — 警示
    stroke: '#FCA5A5',
    size: 32,
    labelColor: '#FEE2E2',
    badge: '▲',
  },
};

// ==================== 语义分类规则（按对象类型ID） ====================

/** 对象类型 → 语义角色 */
const TYPE_SEMANTIC_MAP: Record<string, NodeSemantic> = {
  // 业务主体
  designer:      'entity',
  patternMaster: 'entity',
  team:          'entity',
  supplier:      'entity',
  qcInspector:   'entity',
  salesperson:   'entity',
  customer:      'entity',
  channel:       'entity',
  // 业务系统
  bizSystem:     'system',
  // 工艺节点
  workshop:      'process',
  process:       'process',
  equipment:     'process',
  patternMaking: 'process',
  sampleMaking:  'process',
  shoeDesign:    'process',
  material:      'process',
  warehouse:     'process',
  // 业务单据
  order:         'order',
  logistics:     'order',
  // 指标/风险
  costItem:      'metric',
  profitFactor:  'metric',
  risk:          'metric',
  qcStandard:    'metric',
};

/** 获取节点的业务语义角色 */
export function getNodeSemantic(typeId: string): NodeSemantic {
  return TYPE_SEMANTIC_MAP[typeId] || 'entity';
}

/** 获取节点的语义配置 */
export function getNodeSemanticConfig(typeId: string): SemanticConfig {
  const semantic = getNodeSemantic(typeId);
  return NODE_SEMANTIC_CONFIG[semantic];
}

// ==================== 边语义分类 ====================

export type EdgeSemantic = 'flow' | 'support' | 'impact';

export interface EdgeSemanticConfig {
  label: string;
  color: string;
  width: number;
  dash?: number[];
  arrowSize: number;
  opacity: number;
}

export const EDGE_SEMANTIC_CONFIG: Record<EdgeSemantic, EdgeSemanticConfig> = {
  flow: {
    label: '主流程',
    color: '#3B82F6',     // 蓝色实线 — 业务流转
    width: 2.5,
    dash: undefined,
    arrowSize: 8,
    opacity: 0.85,
  },
  support: {
    label: '支撑链',
    color: '#8B5CF6',     // 紫色虚线 — 系统支撑
    width: 1.5,
    dash: [6, 3],
    arrowSize: 6,
    opacity: 0.6,
  },
  impact: {
    label: '影响链',
    color: '#EF4444',     // 红色点线 — 成本/风险传导
    width: 2,
    dash: [2, 4],
    arrowSize: 7,
    opacity: 0.75,
  },
};

/** 链接类型ID → 边语义角色 */
const LINK_SEMANTIC_MAP: Record<string, EdgeSemantic> = {
  // 主流程：工序前置、订单驱动、路径关联
  precedes:     'flow',
  belongsTo:    'flow',
  partOf:       'flow',
  acquires:     'flow',
  placesOrder:  'flow',
  contributesTo:'flow',
  guidesProduction: 'flow',
  // 支撑链：系统支撑、能力支撑、负责、存储
  supports:     'support',
  systemSupportsRole: 'support',
  systemSupportsQc:   'support',
  controls:     'support',
  inspects:     'support',
  responsibleFor: 'support',
  manages:      'support',
  stores:       'support',
  supplies:     'support',
  adaptsTo:     'support',
  // 影响链：成本传导、风险影响
  causes:       'impact',
  reducesProfit:'impact',
  increasesCost:'impact',
  // 其他按语义判断
  cooperates:   'support',
  logisticsPartnership: 'support',
  customsRelated: 'flow',
};

/** 获取边的语义角色 */
export function getEdgeSemantic(linkTypeId: string, semantics?: string): EdgeSemantic {
  const mapped = LINK_SEMANTIC_MAP[linkTypeId];
  if (mapped) return mapped;
  // fallback: 按 semantics 判断
  if (semantics === 'precedence' || semantics === 'pathAssociation') return 'flow';
  if (semantics === 'capabilitySupport' || semantics === 'controlConstraint' || semantics === 'responsibility') return 'support';
  if (semantics === 'impactTransmission') return 'impact';
  return 'support'; // 默认支撑链
}

/** 获取边的语义配置 */
export function getEdgeSemanticConfig(linkTypeId: string, semantics?: string): EdgeSemanticConfig {
  const semantic = getEdgeSemantic(linkTypeId, semantics);
  return EDGE_SEMANTIC_CONFIG[semantic];
}

// ==================== 业务板块颜色（用于筛选联动高亮） ====================

export const DOMAIN_COLORS: Record<string, string> = {
  '研发设计': '#F59E0B',
  '生产制造': '#3B82F6',
  '供应链管理': '#10B981',
  '质量管控': '#EF4444',
  '业务系统支撑': '#8B5CF6',
  '市场渠道销售': '#EC4899',
  '订单物流报关': '#06B6D4',
  '成本利润核算': '#F97316',
  '经营风险管控': '#DC2626',
};

// ==================== 核心流程链路定义 ====================

/** 生产主链路（皮料→裁断→车缝→成型→质检） */
export const MAIN_PRODUCTION_CHAIN = [
  'scm-02', 'mfg-01', 'mfg-04', 'mfg-02', 'mfg-05', 'mfg-03', 'mfg-06', 'mfg-07', 'rd-03',
];

/** 订单履约链路 */
export const ORDER_CHAIN = [
  'sales-07', 'sales-02', 'ord-02', 'ord-05',
];

/** 成本传导链路 */
export const COST_CHAIN = [
  'scm-02', 'cost-01', 'cost-06', 'cost-02', 'risk-03',
];

/** 判断节点是否在核心链路中 */
export function isInCoreChain(nodeId: string): boolean {
  return MAIN_PRODUCTION_CHAIN.includes(nodeId)
    || ORDER_CHAIN.includes(nodeId)
    || COST_CHAIN.includes(nodeId);
}

/** 判断边是否在核心链路中 */
export function isCoreChainEdge(sourceId: string, targetId: string): boolean {
  const allChains = [MAIN_PRODUCTION_CHAIN, ORDER_CHAIN, COST_CHAIN];
  return allChains.some((chain) => {
    const si = chain.indexOf(sourceId);
    const ti = chain.indexOf(targetId);
    return si >= 0 && ti >= 0 && Math.abs(si - ti) === 1;
  });
}

// ==================== 语义图例数据 ====================

export const SEMANTIC_LEGEND = [
  { semantic: 'entity' as NodeSemantic, label: '业务主体', desc: '客户/供应商/人员' },
  { semantic: 'system' as NodeSemantic, label: '业务系统', desc: 'ERP/MES/WMS' },
  { semantic: 'process' as NodeSemantic, label: '工艺节点', desc: '车间/工序/设备' },
  { semantic: 'order' as NodeSemantic, label: '业务单据', desc: '订单/物流/合同' },
  { semantic: 'metric' as NodeSemantic, label: '指标/风险', desc: '成本/次品率/风险' },
];
