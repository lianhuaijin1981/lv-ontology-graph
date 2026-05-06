/**
 * 端到端业务流程定义
 *
 * 核心设计原则：
 * - 每条流程是一条有向故事线，从业务触发点到最终结果
 * - 每步包含：步骤ID、名称、描述、所属板块、关键指标
 * - 流程支持"当前步骤高亮"模式，用于追踪订单/成本/质量状态
 *
 * F1: 订单全生命周期 (12步) — 从客户下单到交付回款
 * F2: 成本风险传导链 (8步)  — 从原材料采购到利润影响
 * F3: 质量管控闭环 (7步)    — 从来料检验到成品出库
 * F4: 产能分析流程 (8步)   — 从OEE监控到瓶颈识别
 * F5: 供应链风险流程 (7步)  — 从风险识别到应急预案
 */

import type { EntityId } from '@/types';

// ==================== 流程步骤定义 ====================

export interface FlowStep {
  /** 步骤序号 (1-based) */
  step: number;
  /** 节点ID */
  nodeId: EntityId;
  /** 步骤显示名称 */
  name: string;
  /** 详细描述 */
  description: string;
  /** 所属业务板块 */
  domain: string;
  /** 关键指标（可选） */
  metric?: string;
  /** 是否为决策/风险节点 */
  isCritical?: boolean;
}

export interface ProcessFlow {
  /** 流程ID */
  id: string;
  /** 流程名称 */
  name: string;
  /** 流程描述 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** 所有步骤（有序） */
  steps: FlowStep[];
  /** 涉及的所有节点ID集合（用于快速查找） */
  nodeIds: EntityId[];
  /** 相邻步骤之间的边关系（用于高亮路径） */
  pathSegments: [EntityId, EntityId][];
}

// ==================== F1: 订单全生命周期 (12步) ====================

const ORDER_LIFECYCLE_STEPS: FlowStep[] = [
  {
    step: 1, nodeId: 'sales-07', name: '客户下单',
    description: '海外品牌商通过广交会等渠道下达外贸订单',
    domain: '市场渠道销售', metric: '订单金额 ¥850,000',
  },
  {
    step: 2, nodeId: 'ord-02', name: '订单录入ERP',
    description: '外贸大货订单录入系统，启动生产计划',
    domain: '订单物流报关', isCritical: true,
  },
  {
    step: 3, nodeId: 'sys-01', name: 'ERP排产调度',
    description: 'ERP系统统筹物料需求、产能分配、交期规划',
    domain: '业务系统支撑', metric: '计划交期 45天',
  },
  {
    step: 4, nodeId: 'scm-01', name: '原材料采购',
    description: '供应商A供应头层牛皮、橡胶鞋底等主料',
    domain: '供应链管理', metric: '皮料单价 ¥45/尺',
  },
  {
    step: 5, nodeId: 'qc-01', name: '来料IQC质检',
    description: 'IQC检测员按标准检验入库皮料质量',
    domain: '质量管控', isCritical: true,
  },
  {
    step: 6, nodeId: 'mfg-01', name: '裁断下料',
    description: '裁断车间精准切割，控制皮料损耗率',
    domain: '生产制造', metric: '良品率 92%',
  },
  {
    step: 7, nodeId: 'mfg-02', name: '针车车缝',
    description: '针车间规范缝制，执行线迹工艺标准',
    domain: '生产制造', metric: '良品率 95%',
  },
  {
    step: 8, nodeId: 'mfg-03', name: '成型+定型',
    description: '成型车间贴底+高温定型，确保整鞋稳定性',
    domain: '生产制造', metric: '良品率 93%',
  },
  {
    step: 9, nodeId: 'qc-02', name: '成品OQC验收',
    description: 'OQC质检员成品全检，拦截次品流入市场',
    domain: '质量管控', isCritical: true,
  },
  {
    step: 10, nodeId: 'scm-06', name: '入成品仓',
    description: '合格产品入成品仓库，等待发货',
    domain: '供应链管理',
  },
  {
    step: 11, nodeId: 'ord-05', name: '海运订舱出运',
    description: '安排海运订舱，完成出口报关手续',
    domain: '订单物流报关', metric: '船期 15天',
  },
  {
    step: 12, nodeId: 'cost-08', name: '交付+回款确认',
    description: '订单交付完成，翻单率与利润核算',
    domain: '成本利润核算', metric: '目标翻单率 >60%',
  },
];

// ==================== F2: 成本风险传导链 (8步) ====================

const COST_RISK_CHAIN_STEPS: FlowStep[] = [
  {
    step: 1, nodeId: 'scm-01', name: '供应商报价',
    description: '原材料供应商A提供头层牛皮报价',
    domain: '供应链管理', metric: '¥45/尺²',
  },
  {
    step: 2, nodeId: 'scm-02', name: '主料入库',
    description: '头层牛皮作为最大单项成本入库',
    domain: '供应链管理', isCritical: true,
  },
  {
    step: 3, nodeId: 'cost-01', name: '主料成本归集',
    description: '皮料主料成本占总成本约40%，是核心驱动因子',
    domain: '成本利润核算', metric: '¥280,000/批次',
  },
  {
    step: 4, nodeId: 'cost-06', name: '损耗率监控',
    description: '裁断工序产生皮料损耗，直接影响主料成本效率',
    domain: '成本利润核算', isCritical: true, metric: '目标 <8%',
  },
  {
    step: 5, nodeId: 'mfg-04', name: '裁断损耗发生',
    description: '裁断下料环节实际损耗率波动',
    domain: '生产制造', metric: '当前 8.3%',
  },
  {
    step: 6, nodeId: 'cost-02', name: '损耗成本叠加',
    description: '物料损耗(边角料+报废)转化为额外成本项',
    domain: '成本利润核算', metric: '¥45,000/批次',
  },
  {
    step: 7, nodeId: 'risk-03', name: '品质风险传导',
    description: '高损耗可能暗示裁片质量问题→批量品质风险',
    domain: '经营风险管控', isCritical: true,
  },
  {
    step: 8, nodeId: 'risk-02', name: '利润侵蚀结果',
    description: '成本叠加+风险损失→最终侵蚀净利润',
    domain: '经营风险管控', metric: '预计损失 ¥85,000~120,000',
  },
];

// ==================== F3: 质量管控闭环 (7步) ====================

const QC_CLOSED_LOOP_STEPS: FlowStep[] = [
  {
    step: 1, nodeId: 'scm-01', name: '供应商供货',
    description: '原材料供应商A供应皮料和辅料',
    domain: '供应链管理',
  },
  {
    step: 2, nodeId: 'qc-04', name: '来料质检标准',
    description: '按来料质检标准判定皮料等级是否合格',
    domain: '质量管控', isCritical: true,
  },
  {
    step: 3, nodeId: 'qc-01', name: 'IQC检验执行',
    description: 'IQC质检员对入库皮料进行抽样检验',
    domain: '质量管控', metric: '抽检率 ≥15%',
  },
  {
    step: 4, nodeId: 'mfg-04', name: '制程巡检',
    description: '裁断/针车/成型各工序的制程质量监控',
    domain: '生产制造', isCritical: true,
  },
  {
    step: 5, nodeId: 'qc-03', name: '成品质检标准',
    description: '按成品质检标准进行最终验收',
    domain: '质量管控',
  },
  {
    step: 6, nodeId: 'qc-02', name: 'OQC成品验收',
    description: 'OQC质检员成品外观+功能全检',
    domain: '质量管控', metric: '次品率目标 <3%',
  },
  {
    step: 7, nodeId: 'risk-03', name: '整改闭环',
    description: '不合格品根因分析 → 整改措施 → 预防再发',
    domain: '经营风险管控', isCritical: true,
  },
];

// ==================== F4: 产能分析流程 (8步) ====================

const CAPACITY_ANALYSIS_STEPS: FlowStep[] = [
  {
    step: 1, nodeId: 's4-ba04', name: '整体OEE监控',
    description: 'MES实时采集全厂设备综合效率，发现整体OEE低于85%目标',
    domain: '生产制造', metric: 'OEE 72% / 目标 85%', isCritical: true,
  },
  {
    step: 2, nodeId: 's4-ws01', name: '裁断工位#1分析',
    description: '分析裁断车间各工位的实际产能利用率',
    domain: '生产制造', metric: '利用率 87%',
  },
  {
    step: 3, nodeId: 's4-ba01', name: '瓶颈识别: 裁断#2',
    description: '裁断工位#2利用率达98%，成为生产线瓶颈点',
    domain: '生产制造', metric: '利用率 98%', isCritical: true,
  },
  {
    step: 4, nodeId: 's4-sh01', name: '班次产能评估',
    description: '对比早/晚班及加班班的产出差异，识别人力瓶颈',
    domain: '生产制造', metric: '早班产出 4200 vs 晚班 3500',
  },
  {
    step: 5, nodeId: 's4-cp03', name: '产能计划调整',
    description: '基于瓶颈分析结果，重新分配产能计划至非瓶颈时段',
    domain: '生产制造', metric: '调整后预计产能 +18%',
  },
  {
    step: 6, nodeId: 's4-os01', name: '优化建议生成',
    description: 'AI引擎自动推荐扩产/提效方案并排序优先级',
    domain: '生产制造', metric: 'Top建议: 增加自动化裁断设备',
  },
  {
    step: 7, nodeId: 's4-cp07', name: '计划执行验证',
    description: '执行调整后的产能计划，跟踪实际效果',
    domain: '生产制造', metric: '执行进度 65%',
  },
  {
    step: 8, nodeId: 's4-ba04', name: '闭环验证',
    description: '再次测量OEE指标，确认是否达到目标值',
    domain: '生产制造', metric: '目标 OEE > 85%', isCritical: true,
  },
];

// ==================== F5: 供应链风险流程 (7步) ====================

const SUPPLY_CHAIN_RISK_STEPS: FlowStep[] = [
  {
    step: 1, nodeId: 's5-re03', name: '风险识别',
    description: '持续监测供应链风险信号，发现单一供应商集中度过高',
    domain: '供应链管理', metric: '集中度指数 0.78 (高风险)', isCritical: true,
  },
  {
    step: 2, nodeId: 'scm-01', name: '供应商评估',
    description: '对核心供应商A进行多维度风险评估(交期/质量/财务/地理)',
    domain: '供应链管理', metric: '综合评分 B+ (需关注)',
  },
  {
    step: 3, nodeId: 's5-re01', name: '交期风险量化',
    description: '量化近期交期延迟事件的频率、时长及对生产的影响',
    domain: '经营风险管控', metric: '延迟概率 35% · 影响订单 ¥850K', isCritical: true,
  },
  {
    step: 4, nodeId: 's5-ri03', name: '影响传导分析',
    description: '模拟风险事件向下游传导路径：缺料→停产→违约→客户流失',
    domain: '经营风险管控', metric: '潜在损失 ¥1.2M~1.8M',
  },
  {
    step: 5, nodeId: 's5-cp01', name: '应急预案激活',
    description: '触发备选供应商预案，启动安全库存动用程序',
    domain: '供应链管理', metric: '安全库存可用 21天',
  },
  {
    step: 6, nodeId: 's5-as01', name: '替代供应商启用',
    description: '激活认证通过的替代供应商B/C，分散供应风险',
    domain: '供应链管理', metric: '备选供应商覆盖率 60%',
  },
  {
    step: 7, nodeId: 's5-re06', name: '持续监控与改进',
    description: '建立常态化风险监测机制，定期评审供应商组合健康度',
    domain: '经营风险管控', metric: '目标: 集中度 < 0.5', isCritical: true,
  },
];

// ==================== 辅助函数：构建相邻边关系 ====================

function buildPathSegments(steps: FlowStep[]): [EntityId, EntityId][] {
  const segments: [EntityId, EntityId][] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    segments.push([steps[i].nodeId, steps[i + 1].nodeId]);
  }
  return segments;
}

// ==================== 导出5条流程 ====================

export const ORDER_LIFECYCLE_FLOW: ProcessFlow = {
  id: 'order-lifecycle',
  name: '订单全生命周期',
  description: '从客户下单到交付回款的完整12步端到端流程',
  icon: '📦',
  steps: ORDER_LIFECYCLE_STEPS,
  nodeIds: ORDER_LIFECYCLE_STEPS.map(s => s.nodeId),
  pathSegments: buildPathSegments(ORDER_LIFECYCLE_STEPS),
};

export const COST_RISK_FLOW: ProcessFlow = {
  id: 'cost-risk-chain',
  name: '成本风险传导链',
  description: '从原材料采购到利润侵蚀的8步因果传导路径',
  icon: '💰',
  steps: COST_RISK_CHAIN_STEPS,
  nodeIds: COST_RISK_CHAIN_STEPS.map(s => s.nodeId),
  pathSegments: buildPathSegments(COST_RISK_CHAIN_STEPS),
};

export const QC_CLOSED_LOOP_FLOW: ProcessFlow = {
  id: 'qc-closed-loop',
  name: '质量管控闭环',
  description: '从来料检验到整改闭环的7步质量管理全流程',
  icon: '✅',
  steps: QC_CLOSED_LOOP_STEPS,
  nodeIds: QC_CLOSED_LOOP_STEPS.map(s => s.nodeId),
  pathSegments: buildPathSegments(QC_CLOSED_LOOP_STEPS),
};

export const CAPACITY_ANALYSIS_FLOW: ProcessFlow = {
  id: 'capacity-analysis',
  name: '产能分析流程',
  description: '从OEE监控到瓶颈识别、计划调整的8步产能优化闭环',
  icon: '📊',
  steps: CAPACITY_ANALYSIS_STEPS,
  nodeIds: CAPACITY_ANALYSIS_STEPS.map(s => s.nodeId),
  pathSegments: buildPathSegments(CAPACITY_ANALYSIS_STEPS),
};

export const SUPPLY_CHAIN_RISK_FLOW: ProcessFlow = {
  id: 'supply-chain-risk',
  name: '供应链风险流程',
  description: '从风险识别到应急预案、替代供应商启用的7步供应链韧性建设',
  icon: '🔗',
  steps: SUPPLY_CHAIN_RISK_STEPS,
  nodeIds: SUPPLY_CHAIN_RISK_STEPS.map(s => s.nodeId),
  pathSegments: buildPathSegments(SUPPLY_CHAIN_RISK_STEPS),
};

/** 全部流程列表 */
export const ALL_PROCESS_FLOWS: ProcessFlow[] = [
  ORDER_LIFECYCLE_FLOW,
  COST_RISK_FLOW,
  QC_CLOSED_LOOP_FLOW,
  CAPACITY_ANALYSIS_FLOW,   // 新增 F4
  SUPPLY_CHAIN_RISK_FLOW,   // 新增 F5
];

// ==================== 查询工具函数 ====================

/** 根据节点ID查找所在流程及步骤位置 */
export function findFlowForNode(nodeId: EntityId): { flow: ProcessFlow; stepIndex: number; step: FlowStep } | null {
  for (const flow of ALL_PROCESS_FLOWS) {
    const idx = flow.nodeIds.indexOf(nodeId);
    if (idx >= 0) {
      return { flow, stepIndex: idx, step: flow.steps[idx] };
    }
  }
  return null;
}

/** 判断某条边是否在某流程的路径上 */
export function isEdgeInFlowPath(sourceId: EntityId, targetId: EntityId): { flow: ProcessFlow } | null {
  for (const flow of ALL_PROCESS_FLOWS) {
    const found = flow.pathSegments.some(([s, t]) =>
      (s === sourceId && t === targetId) || (s === targetId && t === sourceId)
    );
    if (found) return { flow };
  }
  return null;
}

/** 获取某流程中指定步骤之前的所有节点（用于"已完成"高亮） */
export function getCompletedSteps(flowId: string, currentStep: number): EntityId[] {
  const flow = ALL_PROCESS_FLOWS.find(f => f.id === flowId);
  if (!flow) return [];
  return flow.steps.slice(0, currentStep).map(s => s.nodeId);
}

/** 获取某流程中指定步骤之后的所有节点（用于"待执行"灰显） */
export function getPendingSteps(flowId: string, currentStep: number): EntityId[] {
  const flow = ALL_PROCESS_FLOWS.find(f => f.id === flowId);
  if (!flow) return [];
  return flow.steps.slice(currentStep).map(s => s.nodeId);
}
