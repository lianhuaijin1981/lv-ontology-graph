/**
 * S4(产能瓶颈) + S5(供应商风险) 场景数据生成器
 *
 * 程序化批量生成工位、班次、产能计划、瓶颈预警、优化建议、
 * 风险事件、影响评估、应急预案、替代供应商等深度业务实体
 */

import type { OntologyObject, OntologyLink } from '@/ontology/types';

const _now = new Date().toISOString();

function obj(
  id: string, typeId: string, name: string, domain: string,
  importance: number, level: number,
  props: Record<string, any> = {},
): OntologyObject {
  return {
    id, typeId, displayName: name, domain: domain as any,
    importance, level,
    isAggregate: false,
    createdAt: _now, updatedAt: _now,
    properties: props,
  };
}

function link(
  id: string, typeId: string, source: string, target: string,
  semantics: string,
  props: Record<string, any> = {},
): OntologyLink {
  return { id, typeId, sourceId: source, targetId: target, semantics: semantics as any, properties: props };
}

// ============================================================
// S4 - 产能瓶颈场景 (30实体 + 30关系)
// ============================================================

/** 工位 — 分布在裁断/针车/成型三大车间 */
export const s4Workstations: OntologyObject[] = [
  // 裁断车间 (4个)
  obj('s4-ws01', 'workstation', '裁断工位#1-自动刀模', '生产制造', 0.82, 2, {
    belongsTo: 'mfg-01', baseCapacity: 1800, currentUtilization: 0.85,
    skillLevel: '高级', operatorCount: 2, oee: 0.88,
  }),
  obj('s4-ws02', 'workstation', '裁断工位#2-手动裁断', '生产制造', 0.88, 2, {
    belongsTo: 'mfg-01', baseCapacity: 1200, currentUtilization: 0.98,
    skillLevel: '熟练', operatorCount: 3, oee: 0.95,
  }),
  obj('s4-ws03', 'workstation', '裁断工位#3-排版优化', '生产制造', 0.75, 2, {
    belongsTo: 'mfg-01', baseCapacity: 1500, currentUtilization: 0.72,
    skillLevel: '高级', operatorCount: 2, oee: 0.80,
  }),
  obj('s4-ws04', 'workstation', '裁断工位#4-小料裁切', '生产制造', 0.65, 2, {
    belongsTo: 'mfg-01', baseCapacity: 800, currentUtilization: 0.60,
    skillLevel: '初级', operatorCount: 1, oee: 0.70,
  }),

  // 针车车间 (3个)
  obj('s4-ws05', 'workstation', '针车工位#5-帮面车缝', '生产制造', 0.80, 2, {
    belongsTo: 'mfg-02', baseCapacity: 2500, currentUtilization: 0.78,
    skillLevel: '高级', operatorCount: 6, oee: 0.85,
  }),
  obj('s4-ws06', 'workstation', '针车工位#6-内里缝合', '生产制造', 0.72, 2, {
    belongsTo: 'mfg-02', baseCapacity: 2000, currentUtilization: 0.88,
    skillLevel: '熟练', operatorCount: 5, oee: 0.82,
  }),
  obj('s4-ws07', 'workstation', '针车工位#7-装饰线迹', '生产制造', 0.68, 2, {
    belongsTo: 'mfg-02', baseCapacity: 1500, currentUtilization: 0.65,
    skillLevel: '熟练', operatorCount: 3, oee: 0.75,
  }),

  // 成型车间 (3个)
  obj('s4-ws08', 'workstation', '成型工位#8-贴底贴合', '生产制造', 0.84, 2, {
    belongsTo: 'mfg-03', baseCapacity: 2000, currentUtilization: 0.90,
    skillLevel: '高级', operatorCount: 4, oee: 0.83,
  }),
  obj('s4-ws09', 'workstation', '成型工位#9-绷帮定型', '生产制造', 0.76, 2, {
    belongsTo: 'mfg-03', baseCapacity: 1800, currentUtilization: 0.82,
    skillLevel: '高级', operatorCount: 4, oee: 0.80,
  }),
  obj('s4-ws10', 'workstation', '成型工位#10-后处理整理', '生产制造', 0.62, 2, {
    belongsTo: 'mfg-03', baseCapacity: 2200, currentUtilization: 0.55,
    skillLevel: '初级', operatorCount: 3, oee: 0.68,
  }),
];

/** 班次 */
export const s4Shifts: OntologyObject[] = [
  obj('s4-sh01', 'shift', '早班(08:00-16:30)', '生产制造', 0.78, 2, {
    headcount: 45, productivityFactor: 1.0, mealBreak: true,
    actualOutput: 4200, planOutput: 4500,
  }),
  obj('s4-sh02', 'shift', '晚班(16:30-01:00)', '生产制造', 0.72, 2, {
    headcount: 38, productivityFactor: 0.92, mealBreak: true,
    actualOutput: 3500, planOutput: 3800,
  }),
  obj('s4-sh03', 'shift', '加班班次(弹性)', '生产制造', 0.65, 2, {
    headcount: 15, productivityFactor: 0.85, overtimeRate: 1.5,
    actualOutput: 1200, planOutput: 1400,
  }),
];

/** 产能计划 */
export const s4CapacityPlans: OntologyObject[] = [
  obj('s4-cp01', 'capacityPlan', 'Q2排产计划-W16', '生产制造', 0.80, 2, {
    planPeriod: '2024-W16', targetOutput: 9500, assignedWorkstations: ['s4-ws01','s4-ws02','s4-ws05'],
    actualOutput: null, status: '执行中',
  }),
  obj('s4-cp02', 'capacityPlan', 'Q2排产计划-W17', '生产制造', 0.78, 2, {
    planPeriod: '2024-W17', targetOutput: 10200, assignedWorkstations: ['s4-ws01','s4-ws02','s4-ws05','s4-ws08'],
    actualOutput: null, status: '计划中',
  }),
  obj('s4-cp03', 'capacityPlan', 'ZARA加单紧急计划', '生产制造', 0.88, 2, {
    planPeriod: '紧急', targetOutput: 5000, assignedWorkstations: ['s4-ws01','s4-ws02','s4-ws05','s4-ws08'],
    actualOutput: 3200, status: '执行中',
  }),
  obj('s4-cp04', 'capacityPlan', 'SHEIN快返计划', '生产制造', 0.82, 2, {
    planPeriod: '滚动周计划', targetOutput: 3000, assignedWorkstations: ['s4-ws06','s4-ws07','s4-ws09'],
    actualOutput: 2800, status: '已完成',
  }),
  obj('s4-cp05', 'capacityPlan', '设备维护窗口期', '生产制造', 0.60, 2, {
    planPeriod: 'W18周末', targetOutput: 2000, assignedWorkstations: ['s4-ws03','s4-ws07','s4-ws10'],
    actualOutput: null, status: '计划中',
  }),
  obj('s4-cp06', 'capacityPlan', '新员工培训期计划', '生产制造', 0.55, 2, {
    planPeriod: 'W19', targetOutput: 4000, assignedWorkstations: ['s4-ws04','s4-ws07','s4-ws10'],
    actualOutput: null, status: '计划中',
  }),
  obj('s4-cp07', 'capacityPlan', '调整后排产方案v2', '生产制造', 0.83, 2, {
    planPeriod: 'W17调整版', targetOutput: 11000,
    assignedWorkstations: ['s4-ws01','s4-ws03','s4-ws05','s4-ws08','s4-ws09'],
    actualOutput: null, status: '待审批',
  }),
  obj('s4-cp08', 'capacityPlan', '验证期产能测试', '生产制造', 0.68, 2, {
    planPeriod: 'W20验证', targetOutput: 10000,
    assignedWorkstations: ['s4-ws01','s4-ws02','s4-ws03','s4-ws05','s4-ws08'],
    actualOutput: null, status: '计划中',
  }),
];

/** 瓶颈预警 */
export const s4BottleneckAlerts: OntologyObject[] = [
  obj('s4-ba01', 'bottleneckAlert', '🔴 裁断工位#2利用率98%告警', '生产制造', 0.92, 2, {
    level: 'danger', utilizationRate: 0.98, threshold: 0.90,
    affectedWorkstation: 's4-ws02', suggestion: '立即增加人手或启用备用设备',
    impactEstimate: '日减产约800双',
  }),
  obj('s4-ba02', 'bottleneckAlert', '🟡 针车工位#5等待率22%', '生产制造', 0.78, 2, {
    level: 'warning', waitRate: 0.22, threshold: 0.15,
    affectedWorkstation: 's4-ws05', suggestion: '检查上游裁断供料节奏',
    impactEstimate: '针车空闲损失约550双/天',
  }),
  obj('s4-ba04', 'bottleneckAlert', '🟢 全厂OEE 72%低于目标85%', '生产制造', 0.86, 2, {
    level: 'info', oeeValue: 0.72, targetOee: 0.85,
    affectedWorkstation: 'ALL', suggestion: '全面排查低效工序',
    impactEstimate: '潜在产能提升约18%',
  }),
  obj('s4-ba03', 'bottleneckAlert', '🟡 成型工位#8效率下降12%', '生产制造', 0.74, 2, {
    level: 'warning', efficiencyDrop: 0.12, threshold: 0.08,
    affectedWorkstation: 's4-ws08', suggestion: '核查贴底胶水固化参数',
    impactEstimate: '日减产约240双',
  }),
  obj('s4-ba05', 'bottleneckAlert', '🟡 换产停机平均45min(目标20min)', '生产制造', 0.70, 2, {
    level: 'warning', avgChangeoverMin: 45, targetMin: 20,
    affectedWorkstation: 's4-ws08,s4-ws09', suggestion: '推行SMED快速换模',
    impactEstimate: '每天多出约2小时有效产能',
  }),
];

/** 优化建议 */
export const s4Optimizations: OntologyObject[] = [
  obj('s4-os01', 'optimizationSuggestion', '引入自动化裁断设备', '生产制造', 0.88, 2, {
    category: '扩产', expectedImprovement: '+30%裁断产能', implementationCost: 380000,
    paybackMonths: 14, priority: 1, difficulty: '高',
  }),
  obj('s4-os02', 'optimizationSuggestion', '推行SMED快速换模法', '生产制造', 0.82, 2, {
    category: '效率提升', expectedImprovement: '换产时间从45min→15min',
    implementationCost: 25000, paybackMonths: 2, priority: 2, difficulty: '中',
  }),
  obj('s4-os03', 'optimizationSuggestion', '建立动态排程引擎(APS深化)', '生产制造', 0.80, 2, {
    category: '排程优化', expectedImprovement: '+8%整体OEE',
    implementationCost: 120000, paybackMonths: 6, priority: 3, difficulty: '中',
  }),
  obj('s4-os04', 'optimizationSuggestion', '关键技工技能矩阵+激励', '生产制造', 0.76, 2, {
    category: '技能培训', expectedImprovement: '减少50%技能瓶颈',
    implementationCost: 50000, paybackMonths: 4, priority: 4, difficulty: '低',
  }),
  obj('s4-os05', 'optimizationSuggestion', '增设夜班补贴提升出勤率', '生产制造', 0.72, 2, {
    category: '扩产', expectedImprovement: '+15%晚班产出',
    implementationCost: 60000 / 12, // 月度成本
    paybackMonths: 1, priority: 5, difficulty: '低',
  }),
  obj('s4-os06', 'optimizationSuggestion', '裁断排版AI优化算法', '生产制造', 0.74, 2, {
    category: '效率提升', expectedImprovement: '皮料利用率从92%→96%',
    implementationCost: 80000, paybackMonths: 8, priority: 3, difficulty: '中',
  }),
];

// ---- S4 关系 ----
export const s4Links: OntologyLink[] = [
  // 工位 → 归属车间
  link('l-s4-01', 'belongsTo', 's4-ws01', 'mfg-01', 'precedence'),
  link('l-s4-02', 'belongsTo', 's4-ws02', 'mfg-01', 'precedence'),
  link('l-s4-03', 'belongsTo', 's4-ws03', 'mfg-01', 'precedence'),
  link('l-s4-04', 'belongsTo', 's4-ws04', 'mfg-01', 'precedence'),
  link('l-s4-05', 'belongsTo', 's4-ws05', 'mfg-02', 'precedence'),
  link('l-s4-06', 'belongsTo', 's4-ws06', 'mfg-02', 'precedence'),
  link('l-s4-07', 'belongsTo', 's4-ws07', 'mfg-02', 'precedence'),
  link('l-s4-08', 'belongsTo', 's4-ws08', 'mfg-03', 'precedence'),
  link('l-s4-09', 'belongsTo', 's4-ws09', 'mfg-03', 'precedence'),
  link('l-s4-10', 'belongsTo', 's4-ws10', 'mfg-03', 'precedence'),

  // 班次 → 分配到工位
  link('l-s4-11', 'shiftAssignment', 's4-sh01', 's4-ws01', 'responsibility'),
  link('l-s4-12', 'shiftAssignment', 's4-sh01', 's4-ws02', 'responsibility'),
  link('l-s4-13', 'shiftAssignment', 's4-sh01', 's4-ws05', 'responsibility'),
  link('l-s4-14', 'shiftAssignment', 's4-sh01', 's4-ws08', 'responsibility'),
  link('l-s4-15', 'shiftAssignment', 's4-sh02', 's4-ws01', 'responsibility'),
  link('l-s4-16', 'shiftAssignment', 's4-sh02', 's4-ws06', 'responsibility'),
  link('l-s4-17', 'shiftAssignment', 's4-sh03', 's4-ws02', 'responsibility'),

  // 产能计划 → 分配工位
  link('l-s4-18', 'planAllocation', 's4-cp01', 's4-ws01', 'association'),
  link('l-s4-19', 'planAllocation', 's4-cp01', 's4-ws02', 'association'),
  link('l-s4-20', 'planAllocation', 's4-cp03', 's4-ws02', 'association'),
  link('l-s4-21', 'planAllocation', 's4-cp03', 's4-ws08', 'association'),
  link('l-s4-22', 'planAllocation', 's4-cp07', 's4-ws03', 'association'),

  // 瓶颈检测 → 涉及工位
  link('l-s4-23', 'bottleneckDetectedAt', 's4-ba01', 's4-ws02', 'impactTransmission'),
  link('l-s4-24', 'bottleneckDetectedAt', 's4-ba02', 's4-ws05', 'impactTransmission'),
  link('l-s4-25', 'bottleneckDetectedAt', 's4-ba03', 'mfg-01', 'impactTransmission'),
  link('l-s4-26', 'bottleneckDetectedAt', 's4-ba04', 's4-ws08', 'impactTransmission'),
  link('l-s4-27', 'bottleneckDetectedAt', 's4-ba05', 's4-ws08', 'impactTransmission'),

  // 瓶颈预警 → 触发优化建议
  link('l-s4-28', 'suggestsOptimization', 's4-ba01', 's4-os01', 'association'),
  link('l-s4-29', 'suggestsOptimization', 's4-ba05', 's4-os02', 'association'),
  link('l-s4-30', 'suggestsOptimization', 's4-ba04', 's4-os03', 'association'),
];

/** 合并所有S4数据 */
export function getS4Data() {
  return {
    entities: [...s4Workstations, ...s4Shifts, ...s4CapacityPlans, ...s4BottleneckAlerts, ...s4Optimizations],
    links: s4Links,
  };
}

// ============================================================
// S5 - 供应商风险场景 (25实体 + 22关系)
// ============================================================

/** 风险事件 */
export const s5RiskEvents: OntologyObject[] = [
  obj('s5-re01', 'riskEvent', '牛皮供应商交期延迟频发', '供应链管理', 0.87, 2, {
    eventType: '交期风险', probability: 0.35, impact: 'high',
    occurredAt: '2024-03', frequency: '近3月发生4次', avgDelayDays: 5,
  }),
  obj('s5-re02', 'riskEvent', '橡胶原料质量波动异常', '供应链管理', 0.78, 2, {
    eventType: '质量风险', probability: 0.25, impact: 'medium',
    occurredAt: '2024-02', frequency: '季度性波动', affectedMaterial: 'scm-03',
  }),
  obj('s5-re03', 'riskEvent', '⚠️ 单一供应商集中度过高', '供应链管理', 0.92, 2, {
    eventType: '集中度风险', probability: 0.40, impact: 'critical',
    concentrationIndex: 0.78, supplierCount: 1, materialCoverage: '主料100%',
  }),
  obj('s5-re04', 'riskEvent', '海运费暴涨(红海危机影响)', '订单物流报关', 0.76, 2, {
    eventType: '物流风险', probability: 0.30, impact: 'medium',
    costIncreasePct: 0.45, affectedRoute: '厦门→欧洲',
  }),
  obj('s5-re05', 'riskEvent', '供应商A财务健康度下降预警', '供应链管理', 0.80, 2, {
    eventType: '财务风险', probability: 0.15, impact: 'high',
    creditRating: 'BBB-', trend: '连续两季下滑',
  }),
  obj('s5-re06', 'riskEvent', '⚠️ 地缘政治影响进口皮料供应', '供应链管理', 0.70, 2, {
    eventType: '地理风险', probability: 0.10, impact: 'critical',
    affectedRegion: '南美/欧洲', alternativeSources: '有限',
  }),
];

/** 风险影响评估 */
export const s5RiskImpacts: OntologyObject[] = [
  obj('s5-ri01', 'riskImpact', '交期延迟→外贸大货订单影响', '经营风险管控', 0.85, 2, {
    eventRef: 's5-re01', affectedEntityRef: 'ord-02', impactAmount: 85000,
    impactType: '直接损失(违约金)', currency: 'CNY',
  }),
  obj('s5-ri02', 'riskImpact', '交期延迟→生产排程混乱', '经营风险管控', 0.75, 2, {
    eventRef: 's5-re01', affectedEntityRef: 'sys-01', impactAmount: 25000,
    impactType: '间接损失(加班费)',
  }),
  obj('s5-ri03', 'riskImpact', '集中度→全面断供风险', '经营风险管控', 0.90, 2, {
    eventRef: 's5-re03', affectedEntityRef: 'scm-02', impactAmount: 1200000,
    impactType: '机会成本(停产)', worstCase: true,
  }),
  obj('s5-ri04', 'riskImpact', '橡胶质量→成品次品率上升', '经营风险管控', 0.78, 2, {
    eventRef: 's5-re02', affectedEntityRef: 'cost-02', impactAmount: 32000,
    impactType: '直接损失(返工费)',
  }),
  obj('s5-ri05', 'riskImpact', '海运涨价→利润压缩', '成本利润核算', 0.80, 2, {
    eventRef: 's5-re04', affectedEntityRef: 'ord-05', impactAmount: 48000,
    impactType: '直接损失(运费差价)',
  }),
  obj('s5-ri06', 'riskImpact', '供应商财务恶化→供货中断', '经营风险管控', 0.82, 2, {
    eventRef: 's5-re05', affectedEntityRef: 'scm-01', impactAmount: 650000,
    impactType: '机会成本(寻源切换)',
  }),
  obj('s5-ri07', 'riskImpact', '地缘政治→皮料进口受阻', '经营风险管控', 0.72, 2, {
    eventRef: 's5-re06', affectedEntityRef: 'scm-02', impactAmount: 380000,
    impactType: '机会成本(替代采购溢价)',
  }),
  obj('s5-ri08', 'riskImpact', '财务风险→信用证结算风险', '经营风险管控', 0.70, 2, {
    eventRef: 's5-re05', affectedEntityRef: 'ord-04', impactAmount: 20000,
    impactType: '间接损失(融资成本)',
  }),
];

/** 应急预案 */
export const s5ContingencyPlans: OntologyObject[] = [
  obj('s5-cp01', 'contingencyPlan', '主料断供应急预案-L1', '供应链管理', 0.88, 2, {
    planName: '主料断供预案L1', triggerCondition: '供应商交期延迟>7天或宣告不可抗力',
    actions: ['激活安全库存(21天用量)', '启动备选供应商B/C', '通知客户调整交期', '加急空运补货'],
    owner: '采购总监', status: '就绪', lastDrillDate: '2024-02-15',
  }),
  obj('s5-cp02', 'contingencyPlan', '质量异常应急预案-L2', '供应链管理', 0.80, 2, {
    planName: '质量异常预案L2', triggerCondition: '来料批次不合格率>5%',
    actions: ['隔离问题批次', 'SQE驻厂审核', '启动替代物料认证', '生产线降级使用方案'],
    owner: '品质经理', status: '就绪', lastDrillDate: '2024-01-20',
  }),
  obj('s5-cp03', 'contingencyPlan', '海运中断应急预案-L3', '订单物流报关', 0.74, 2, {
    planName: '海运中断预案L3', triggerCondition: '主要港口停运或航线阻断',
    actions: ['转港至深圳/宁波', '启用中欧班列备选', '协商客户FOB转DDP', '启动海外仓前置发货'],
    owner: '物流主管', status: '就绪', lastDrillDate: '2024-03-01',
  }),
  obj('s5-cp04', 'contingencyPlan', '供应商破产应急预案-L4', '供应链管理', 0.70, 2, {
    planName: '供应商破产预案L4', triggerCondition: '供应商被申请破产或严重资不抵债',
    actions: ['法律团队介入债权保全', '紧急调用预付款担保', '全量切换备选供应商', '加速新供应商PPAP认证'],
    owner: '总经理+法务', status: '部分就绪', lastDrillDate: '未演练',
  }),
];

/** 替代供应商 */
export const s5AlternativeSuppliers: OntologyObject[] = [
  obj('s5-as01', 'alternativeSupplier', '皮革供应商B(河南商丘)', '供应链管理', 0.82, 2, {
    forMaterial: '头层牛皮', forExistingSupplier: 'scm-01',
    qualificationStatus: '已认证(PPAP通过)', leadTimeDays: 7,
    capacityRatio: 0.40, pricePremium: 0.08, riskReduction: 'medium',
  }),
  obj('s5-as02', 'alternativeSupplier', '皮革供应商C(河北辛集)', '供应链管理', 0.72, 2, {
    forMaterial: '头层牛皮', forExistingSupplier: 'scm-01',
    qualificationStatus: '考察中(SQE已现场审厂)', leadTimeDays: 10,
    capacityRatio: 0.35, pricePremium: -0.05, riskReduction: 'medium',
  }),
  obj('s5-as03', 'alternativeSupplier', '橡胶供应商B(山东潍坊)', '供应链管理', 0.78, 2, {
    forMaterial: '橡胶鞋底', forExistingSupplier: 'scm-01',
    qualificationStatus: '已认证(样品通过)', leadTimeDays: 5,
    capacityRatio: 0.60, pricePremium: 0.03, riskReduction: 'low',
  }),
  obj('s5-as04', 'alternativeSupplier', '本地鞋底厂D(福建晋江)', '供应链管理', 0.68, 2, {
    forMaterial: 'TPR鞋底', forExistingSupplier: 'scm-01',
    qualificationStatus: '备选(初步接触)', leadTimeDays: 3,
    capacityRatio: 0.50, pricePremium: -0.10, riskReduction: 'low',
  }),
  obj('s5-as05', 'alternativeSupplier', '网布供应商B(浙江绍兴)', '供应链管理', 0.70, 2, {
    forMaterial: '涤纶网布', forExistingSupplier: 'scm-01',
    qualificationStatus: '已认证', leadTimeDays: 4,
    capacityRatio: 0.80, pricePremium: 0.02, riskReduction: 'low',
  }),
  obj('s5-as06', 'alternativeSupplier', '包装材料供应商B(广东东莞)', '供应链管理', 0.62, 2, {
    forMaterial: '包装纸盒', forExistingSupplier: 'scm-01',
    qualificationStatus: '备选', leadTimeDays: 2,
    capacityRatio: 1.0, pricePremium: -0.08, riskReduction: 'stable',
  }),
];

// ---- S5 关系 ----
export const s5Links: OntologyLink[] = [
  // 供应商 → 存在风险事件
  link('l-s5-01', 'hasRisk', 'scm-01', 's5-re01', 'supply', { description: '供应商交期延迟' }),
  link('l-s5-02', 'hasRisk', 'scm-01', 's5-re02', 'supply', { description: '原料质量波动' }),
  link('l-s5-03', 'hasRisk', 'scm-01', 's5-re03', 'supply', { description: '单一供应商依赖' }),
  link('l-s5-04', 'hasRisk', 'scm-01', 's5-re05', 'supply', { description: '财务健康下降' }),

  // 风险事件 → 影响评估
  link('l-s5-05', 'impacts', 's5-re01', 's5-ri01', 'impactTransmission'),
  link('l-s5-06', 'impacts', 's5-re01', 's5-ri02', 'impactTransmission'),
  link('l-s5-07', 'impacts', 's5-re03', 's5-ri03', 'impactTransmission'),
  link('l-s5-08', 'impacts', 's5-re02', 's5-ri04', 'impactTransmission'),
  link('l-s5-09', 'impacts', 's5-re04', 's5-ri05', 'impactTransmission'),
  link('l-s5-10', 'impacts', 's5-re05', 's5-ri06', 'impactTransmission'),
  link('l-s5-11', 'impacts', 's5-re06', 's5-ri07', 'impactTransmission'),
  link('l-s5-12', 'impacts', 's5-re05', 's5-ri08', 'impactTransmission'),

  // 风险影响 → 受影响的业务实体
  link('l-s5-13', 'affectsEntity', 's5-ri01', 'ord-02', 'impactTransmission'),
  link('l-s5-14', 'affectsEntity', 's5-ri03', 'scm-02', 'impactTransmission'),
  link('l-s5-15', 'affectsEntity', 's5-ri04', 'cost-02', 'impactTransmission'),
  link('l-s5-16', 'affectsEntity', 's5-ri06', 'scm-01', 'impactTransmission'),

  // 应急预案 → 缓解风险事件
  link('l-s5-17', 'mitigates', 's5-cp01', 's5-re01', 'controlConstraint'),
  link('l-s5-18', 'mitigates', 's5-cp01', 's5-re03', 'controlConstraint'),
  link('l-s5-19', 'mitigates', 's5-cp02', 's5-re02', 'controlConstraint'),
  link('l-s5-20', 'mitigates', 's5-cp03', 's5-re04', 'controlConstraint'),
  link('l-s5-21', 'mitigates', 's5-cp04', 's5-re05', 'controlConstraint'),
  link('l-s5-22', 'triggersPlan', 's5-re01', 's5-cp01', 'association'),
  link('l-s5-23', 'triggersPlan', 's5-re03', 's5-cp01', 'association'),
  link('l-s5-24', 'triggersPlan', 's5-re05', 's5-cp04', 'association'),

  // 替代供应商 → 备份主供应商
  link('l-s5-25', 'backupFor', 's5-as01', 'scm-01', 'cooperation', { description: '牛皮备选' }),
  link('l-s5-26', 'backupFor', 's5-as02', 'scm-01', 'cooperation', { description: '牛皮第二备选' }),
  link('l-s5-27', 'backupFor', 's5-as03', 'scm-01', 'cooperation', { description: '橡胶备选' }),
  link('l-s5-28', 'backupFor', 's5-as04', 'scm-03', 'cooperation', { description: 'TPR底备选' }),
  link('l-s5-29', 'backupFor', 's5-as05', 'scm-01', 'cooperation', { description: '网布备选' }),
  link('l-s5-30', 'backupFor', 's5-as06', 'scm-01', 'cooperation', { description: '包装备选' }),
];

/** 合并所有S5数据 */
export function getS5Data() {
  return {
    entities: [...s5RiskEvents, ...s5RiskImpacts, ...s5ContingencyPlans, ...s5AlternativeSuppliers],
    links: s5Links,
  };
}

// ============================================================
// 统一导出
// ============================================================

/** 合并S4+S5全部场景增强数据 */
export function getExtendedData() {
  const s4 = getS4Data();
  const s5 = getS5Data();
  return {
    entities: [...s4.entities, ...s5.entities],
    links: [...s4.links, ...s5.links],
  };
}
