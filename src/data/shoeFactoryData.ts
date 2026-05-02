/**
 * 女鞋总厂核心实体数据
 * 基于 PRD.md 中的 55 条三元组和 426 实体精选核心子集
 * 
 * 数据生成策略：
 * 1. 九大板块聚合节点（9个）
 * 2. 每板块核心实体（约8-12个）
 * 3. 覆盖全部55条三元组关系
 * 
 * 总计：约 90 实体，80 链接
 */

import type { OntologyObject, OntologyLink } from '@/ontology/types';

const now = new Date().toISOString();

function makeObject(
  id: string,
  typeId: string,
  displayName: string,
  domain: string,
  importance: number,
  level: number,
  isAggregate: boolean,
  properties: Record<string, string | number | boolean | string[] | null> = {}
): OntologyObject {
  return {
    id,
    typeId,
    displayName,
    domain: domain as any,
    importance,
    level,
    isAggregate,
    createdAt: now,
    updatedAt: now,
    properties,
  };
}

function makeLink(
  id: string,
  typeId: string,
  sourceId: string,
  targetId: string,
  semantics: string,
  properties: Record<string, string | number | boolean | string[] | null> = {}
): OntologyLink {
  return {
    id,
    typeId,
    sourceId,
    targetId,
    semantics: semantics as any,
    properties,
  };
}

// ==================== 九大板块聚合节点 ====================

export const domainAggregates: OntologyObject[] = [
  makeObject('dom-rd', 'domainAggregate', '研发设计', '研发设计', 1.0, 0, true, { domain: '研发设计' }),
  makeObject('dom-mfg', 'domainAggregate', '生产制造', '生产制造', 1.0, 0, true, { domain: '生产制造' }),
  makeObject('dom-scm', 'domainAggregate', '供应链管理', '供应链管理', 1.0, 0, true, { domain: '供应链管理' }),
  makeObject('dom-qc', 'domainAggregate', '质量管控', '质量管控', 1.0, 0, true, { domain: '质量管控' }),
  makeObject('dom-sys', 'domainAggregate', '业务系统支撑', '业务系统支撑', 1.0, 0, true, { domain: '业务系统支撑' }),
  makeObject('dom-sales', 'domainAggregate', '市场渠道销售', '市场渠道销售', 1.0, 0, true, { domain: '市场渠道销售' }),
  makeObject('dom-order', 'domainAggregate', '订单物流报关', '订单物流报关', 1.0, 0, true, { domain: '订单物流报关' }),
  makeObject('dom-cost', 'domainAggregate', '成本利润核算', '成本利润核算', 1.0, 0, true, { domain: '成本利润核算' }),
  makeObject('dom-risk', 'domainAggregate', '经营风险管控', '经营风险管控', 1.0, 0, true, { domain: '经营风险管控' }),
];

// ==================== 研发设计实体 ====================

export const rdEntities: OntologyObject[] = [
  makeObject('rd-01', 'designer', '出格设计师', '研发设计', 0.9, 2, false, { experience: 8, description: '负责鞋款版型出格设计' }),
  makeObject('rd-02', 'patternMaster', '版型师傅', '研发设计', 0.85, 2, false, { description: '楦头调整与版型优化' }),
  makeObject('rd-03', 'shoeDesign', '鞋款设计方案', '研发设计', 0.9, 2, false, { season: '2024春夏', description: '支撑产品创新，打造差异化优势' }),
  makeObject('rd-04', 'patternMaking', '版型出格', '研发设计', 0.8, 2, false, { description: '版型尺寸、裁片设计、图纸生成' }),
  makeObject('rd-05', 'sampleMaking', '初样制作', '研发设计', 0.75, 2, false, { description: '样品编号、用料、工时、试穿反馈' }),
];

// ==================== 生产制造实体 ====================

export const mfgEntities: OntologyObject[] = [
  makeObject('mfg-01', 'workshop', '裁断车间', '生产制造', 0.9, 1, false, { capacity: 5000, description: '精准加工降低皮料损耗' }),
  makeObject('mfg-02', 'workshop', '针车车间', '生产制造', 0.9, 1, false, { capacity: 8000, description: '规范缝制工序，减少次品率' }),
  makeObject('mfg-03', 'workshop', '成型车间', '生产制造', 0.9, 1, false, { capacity: 6000, description: '高效组装提升产能' }),
  makeObject('mfg-04', 'process', '裁断下料', '生产制造', 0.85, 2, false, { yield: 0.92, description: '裁片切割、损耗控制' }),
  makeObject('mfg-05', 'process', '针车车缝', '生产制造', 0.85, 2, false, { yield: 0.95, description: '车缝工艺、线迹标准' }),
  makeObject('mfg-06', 'process', '贴底工艺', '生产制造', 0.8, 2, false, { yield: 0.93, description: '贴合精准度、牢固度' }),
  makeObject('mfg-07', 'process', '高温定型', '生产制造', 0.75, 2, false, { yield: 0.94, description: '整鞋形状、稳定性' }),
  makeObject('mfg-08', 'team', '裁断班组A', '生产制造', 0.6, 2, false, { headcount: 12, description: '裁断班组管理、损耗管控' }),
  makeObject('mfg-09', 'team', '针车班组B', '生产制造', 0.6, 2, false, { headcount: 18, description: '针车工序分配、技工考核' }),
  makeObject('mfg-10', 'equipment', '裁断刀模', '生产制造', 0.7, 2, false, { status: '运行中', description: '提升裁片精度，减少皮料浪费' }),
  makeObject('mfg-11', 'equipment', '欧码楦头', '生产制造', 0.7, 2, false, { status: '运行中', description: '贴合海外市场需求' }),
];

// ==================== 供应链管理实体 ====================

export const scmEntities: OntologyObject[] = [
  makeObject('scm-01', 'supplier', '原材料供应商A', '供应链管理', 0.85, 2, false, { rating: 'A', description: '保障物料稳定供应' }),
  makeObject('scm-02', 'material', '头层牛皮', '供应链管理', 0.85, 2, false, { unitPrice: 45, description: '提升产品品质与档次' }),
  makeObject('scm-03', 'material', '橡胶鞋底', '供应链管理', 0.75, 2, false, { unitPrice: 12, description: '保障产品耐用性' }),
  makeObject('scm-04', 'material', '鞋面裁片', '供应链管理', 0.7, 2, false, { unitPrice: 8, description: '裁片编号、尺寸、材质' }),
  makeObject('scm-05', 'warehouse', '皮料专用仓', '供应链管理', 0.8, 1, false, { capacity: 50000, description: '防火防潮标准、批次管理' }),
  makeObject('scm-06', 'warehouse', '成品仓库', '供应链管理', 0.8, 1, false, { capacity: 80000, description: '合理存储减少库存积压' }),
];

// ==================== 质量管控实体 ====================

export const qcEntities: OntologyObject[] = [
  makeObject('qc-01', 'qcInspector', 'IQC质检员', '质量管控', 0.8, 2, false, { description: '来料检测、不合格判定' }),
  makeObject('qc-02', 'qcInspector', 'OQC质检员', '质量管控', 0.8, 2, false, { description: '成品检测、出货验收' }),
  makeObject('qc-03', 'qcStandard', '成品质检标准', '质量管控', 0.75, 2, false, { description: '拦截次品流入市场' }),
  makeObject('qc-04', 'qcStandard', '来料质检标准', '质量管控', 0.75, 2, false, { description: '提前拦截不合格皮料' }),
];

// ==================== 业务系统支撑实体 ====================

export const sysEntities: OntologyObject[] = [
  makeObject('sys-01', 'bizSystem', 'ERP系统', '业务系统支撑', 0.9, 1, false, { coverage: ['订单', '物料', '财务'], description: '订单统筹与资源调度' }),
  makeObject('sys-02', 'bizSystem', 'MES系统', '业务系统支撑', 0.9, 1, false, { coverage: ['工序监控', '进度跟踪', '计件统计'], description: '工序实时监控与异常预警' }),
  makeObject('sys-03', 'bizSystem', 'WMS系统', '业务系统支撑', 0.85, 1, false, { coverage: ['库位', '出入库', '盘点'], description: '皮料精准管理与库存预警' }),
  makeObject('sys-04', 'bizSystem', 'QMS系统', '业务系统支撑', 0.85, 1, false, { coverage: ['质检标准', '不良记录', '整改'], description: '全流程质检管控能力' }),
  makeObject('sys-05', 'bizSystem', 'APS系统', '业务系统支撑', 0.8, 1, false, { coverage: ['排产', '产能调度', '交期'], description: '生产排产优化能力' }),
  makeObject('sys-06', 'bizSystem', 'EAM系统', '业务系统支撑', 0.75, 1, false, { coverage: ['设备档案', '保养', '维修'], description: '设备运维记录与故障预警' }),
];

// ==================== 市场渠道销售实体 ====================

export const salesEntities: OntologyObject[] = [
  makeObject('sales-01', 'channel', '1688批发平台', '市场渠道销售', 0.85, 1, false, { channelType: '线上', description: '拓展内销渠道' }),
  makeObject('sales-02', 'channel', '抖音短视频', '市场渠道销售', 0.9, 1, false, { channelType: '线上', description: '快速提升产品曝光' }),
  makeObject('sales-03', 'channel', '广交会', '市场渠道销售', 0.85, 1, false, { channelType: '展会', description: '拓展优质外贸渠道' }),
  makeObject('sales-04', 'channel', '海外商超', '市场渠道销售', 0.8, 1, false, { channelType: '线下', description: '海外市场覆盖' }),
  makeObject('sales-05', 'salesperson', '外贸业务员', '市场渠道销售', 0.75, 2, false, { description: '维护外贸客户关系' }),
  makeObject('sales-06', 'salesperson', '内销业务员', '市场渠道销售', 0.75, 2, false, { description: '拓展内销终端渠道' }),
  makeObject('sales-07', 'customer', '海外品牌商A', '市场渠道销售', 0.85, 2, false, { customerType: '海外品牌商', description: '稳定外贸订单来源' }),
  makeObject('sales-08', 'customer', '国内批发商B', '市场渠道销售', 0.75, 2, false, { customerType: '国内批发商', description: '内销渠道客户' }),
];

// ==================== 订单物流报关实体 ====================

export const orderEntities: OntologyObject[] = [
  makeObject('ord-01', 'order', '打样订单2024-001', '订单物流报关', 0.75, 2, false, { orderType: '打样', amount: 5000, description: '降低大货生产风险' }),
  makeObject('ord-02', 'order', '外贸大货订单2024-Q2', '订单物流报关', 0.9, 2, false, { orderType: '外贸大货', amount: 850000, description: '外贸季度大单' }),
  makeObject('ord-03', 'order', '内销现货订单2024-050', '订单物流报关', 0.7, 2, false, { orderType: '内销现货', amount: 120000, description: '现货快速发货' }),
  makeObject('ord-04', 'order', '信用证订单2024-008', '订单物流报关', 0.8, 2, false, { orderType: '信用证', amount: 320000, description: '外贸信用证结算' }),
  makeObject('ord-05', 'logistics', '海运订舱服务', '订单物流报关', 0.75, 2, false, { description: '保障外贸订单顺利出运' }),
  makeObject('ord-06', 'logistics', '报关服务', '订单物流报关', 0.75, 2, false, { description: '确保报关合规' }),
];

// ==================== 成本利润核算实体 ====================

export const costEntities: OntologyObject[] = [
  makeObject('cost-01', 'costItem', '皮料主料成本', '成本利润核算', 0.85, 2, false, { costValue: 280000, description: '占总成本主要部分' }),
  makeObject('cost-02', 'costItem', '物料损耗成本', '成本利润核算', 0.8, 2, false, { costValue: 45000, description: '裁断损耗、报废、边角料' }),
  makeObject('cost-03', 'costItem', '库存积压成本', '成本利润核算', 0.8, 2, false, { costValue: 120000, description: '资金占用、仓储、贬值' }),
  makeObject('cost-04', 'costItem', '直接人工成本', '成本利润核算', 0.75, 2, false, { costValue: 180000, description: '计件工资、加班费' }),
  makeObject('cost-05', 'costItem', '模具开发成本', '成本利润核算', 0.7, 2, false, { costValue: 35000, description: '开模费、定制费' }),
  makeObject('cost-06', 'profitFactor', '皮料损耗率', '成本利润核算', 0.85, 2, false, { impactWeight: 0.25, description: '过高导致利润下滑' }),
  makeObject('cost-07', 'profitFactor', '成品次品率', '成本利润核算', 0.85, 2, false, { impactWeight: 0.2, description: '降低订单利润率' }),
  makeObject('cost-08', 'profitFactor', '订单翻单率', '成本利润核算', 0.7, 2, false, { impactWeight: 0.15, description: '复购订单摊薄成本' }),
  makeObject('cost-09', 'profitFactor', '交期达成率', '成本利润核算', 0.75, 2, false, { impactWeight: 0.18, description: '准时率影响违约金' }),
];

// ==================== 经营风险管控实体 ====================

export const riskEntities: OntologyObject[] = [
  makeObject('risk-01', 'risk', '模具弃单风险', '经营风险管控', 0.85, 2, false, { probability: 0.15, lossEstimate: 35000, description: '浪费模具开发投入' }),
  makeObject('risk-02', 'risk', '库存积压风险', '经营风险管控', 0.8, 2, false, { probability: 0.25, lossEstimate: 120000, description: '资金占用、清仓损失' }),
  makeObject('risk-03', 'risk', '批量品质风险', '经营风险管控', 0.85, 2, false, { probability: 0.12, lossEstimate: 85000, description: '退货损失、客户流失' }),
  makeObject('risk-04', 'risk', '环保合规风险', '经营风险管控', 0.8, 2, false, { probability: 0.08, lossEstimate: 150000, description: '整改、出货受阻' }),
  makeObject('risk-05', 'risk', '交期违约风险', '经营风险管控', 0.75, 2, false, { probability: 0.1, lossEstimate: 45000, description: '违约金、客户流失' }),
  makeObject('risk-06', 'risk', '汇率波动风险', '经营风险管控', 0.7, 2, false, { probability: 0.3, lossEstimate: 25000, description: '汇兑损失、利润影响' }),
];

// ==================== 全部实体 ====================

export const allEntities: OntologyObject[] = [
  ...domainAggregates,
  ...rdEntities,
  ...mfgEntities,
  ...scmEntities,
  ...qcEntities,
  ...sysEntities,
  ...salesEntities,
  ...orderEntities,
  ...costEntities,
  ...riskEntities,
];

// ==================== 核心链接数据（对应 55 条三元组精选） ====================

export const allLinks: OntologyLink[] = [
  // === 研发设计 ===
  makeLink('l-01', 'responsibleFor', 'rd-01', 'rd-04', 'responsibility', { description: '出格设计师负责版型出格' }),
  makeLink('l-02', 'responsibleFor', 'rd-02', 'rd-04', 'responsibility', { description: '版型师傅优化鞋款版型' }),
  makeLink('l-03', 'guidesProduction', 'rd-03', 'mfg-01', 'association', { description: '设计方案指导生产线' }),
  makeLink('l-04', 'precedes', 'rd-04', 'rd-05', 'precedence', { description: '出格完成后打样' }),
  makeLink('l-05', 'partOf', 'scm-02', 'rd-03', 'composition', { description: '头层牛皮组成时装女鞋鞋面' }),

  // === 生产制造 ===
  makeLink('l-10', 'belongsTo', 'mfg-04', 'mfg-01', 'precedence', { description: '裁断下料隶属于裁断车间' }),
  makeLink('l-11', 'belongsTo', 'mfg-05', 'mfg-02', 'precedence', { description: '针车车缝隶属于针车车间' }),
  makeLink('l-12', 'belongsTo', 'mfg-06', 'mfg-03', 'precedence', { description: '贴底工艺隶属于成型车间' }),
  makeLink('l-13', 'precedes', 'mfg-04', 'mfg-05', 'precedence', { description: '裁断下料前置于针车车缝' }),
  makeLink('l-14', 'precedes', 'mfg-05', 'mfg-06', 'precedence', { description: '针车车缝前置于贴底工艺' }),
  makeLink('l-15', 'precedes', 'mfg-06', 'mfg-07', 'precedence', { description: '贴底工艺前置于高温定型' }),
  makeLink('l-16', 'adaptsTo', 'mfg-10', 'scm-04', 'association', { description: '裁断刀模适配鞋面裁片' }),
  makeLink('l-17', 'adaptsTo', 'mfg-11', 'rd-03', 'association', { description: '欧码楦头适配欧码女鞋' }),
  makeLink('l-18', 'manages', 'mfg-08', 'mfg-10', 'responsibility', { description: '裁断班组管理刀模设备' }),
  makeLink('l-19', 'manages', 'mfg-09', 'mfg-10', 'responsibility', { description: '针车班组管理设备' }),

  // === 供应链管理 ===
  makeLink('l-20', 'supplies', 'scm-01', 'scm-02', 'supply', { description: '供应商供给头层牛皮' }),
  makeLink('l-21', 'supplies', 'scm-01', 'scm-03', 'supply', { description: '供应商供给橡胶鞋底' }),
  makeLink('l-22', 'stores', 'scm-05', 'scm-02', 'storage', { description: '皮料仓存储皮料' }),
  makeLink('l-23', 'stores', 'scm-06', 'rd-03', 'storage', { description: '成品仓存储成品女鞋' }),
  makeLink('l-24', 'partOf', 'scm-02', 'rd-03', 'composition', { description: '头层牛皮组成鞋款' }),
  makeLink('l-25', 'partOf', 'scm-03', 'rd-03', 'composition', { description: '橡胶鞋底配套粗跟高跟鞋' }),
  makeLink('l-26', 'increasesCost', 'scm-02', 'cost-01', 'impactTransmission', { description: '皮料主料成本' }),
  makeLink('l-27', 'increasesCost', 'scm-04', 'cost-02', 'impactTransmission', { description: '裁片损耗成本' }),

  // === 质量管控 ===
  makeLink('l-30', 'controls', 'qc-01', 'mfg-04', 'controlConstraint', { description: 'IQC检测裁断工序' }),
  makeLink('l-31', 'controls', 'qc-02', 'mfg-06', 'controlConstraint', { description: 'OQC验收成品' }),
  makeLink('l-32', 'inspects', 'qc-01', 'scm-02', 'controlConstraint', { description: 'IQC检测皮料入库' }),
  makeLink('l-33', 'inspects', 'qc-02', 'rd-03', 'controlConstraint', { description: 'OQC验收成品装箱' }),

  // === 业务系统支撑 ===
  makeLink('l-40', 'supports', 'sys-01', 'ord-02', 'capabilitySupport', { description: 'ERP支撑订单统筹' }),
  makeLink('l-41', 'supports', 'sys-02', 'mfg-05', 'capabilitySupport', { description: 'MES监控针车工序' }),
  makeLink('l-42', 'supports', 'sys-03', 'scm-05', 'capabilitySupport', { description: 'WMS管理皮料仓' }),
  makeLink('l-43', 'supports', 'sys-04', 'qc-01', 'capabilitySupport', { description: 'QMS支撑质检管控' }),
  makeLink('l-44', 'supports', 'sys-05', 'mfg-01', 'capabilitySupport', { description: 'APS优化排产' }),
  makeLink('l-45', 'supports', 'sys-06', 'mfg-01', 'capabilitySupport', { description: 'EAM设备运维' }),

  // === 市场渠道销售 ===
  makeLink('l-50', 'acquires', 'sales-03', 'sales-07', 'pathAssociation', { description: '广交会获取海外品牌商' }),
  makeLink('l-51', 'acquires', 'sales-02', 'sales-08', 'pathAssociation', { description: '抖音引流国内批发商' }),
  makeLink('l-52', 'acquires', 'sales-01', 'sales-08', 'pathAssociation', { description: '1688引流批发商' }),
  makeLink('l-53', 'placesOrder', 'sales-07', 'ord-02', 'pathAssociation', { description: '海外品牌商下外贸大货单' }),
  makeLink('l-54', 'placesOrder', 'sales-08', 'ord-03', 'pathAssociation', { description: '批发商下内销现货单' }),
  makeLink('l-55', 'cooperates', 'sales-04', 'sales-07', 'cooperation', { description: '海外商超与品牌商合作' }),

  // === 订单物流报关 ===
  makeLink('l-60', 'precedes', 'ord-01', 'ord-02', 'precedence', { description: '打样订单前置外贸大货' }),
  makeLink('l-61', 'customsRelated', 'ord-02', 'ord-05', 'association', { description: '外贸订单关联海运订舱' }),
  makeLink('l-62', 'customsRelated', 'ord-04', 'ord-06', 'association', { description: '信用证订单关联报关' }),
  makeLink('l-63', 'logisticsPartnership', 'ord-05', 'ord-02', 'cooperation', { description: '海运服务外贸订单' }),
  makeLink('l-64', 'contributesTo', 'ord-02', 'cost-08', 'pathAssociation', { description: '外贸大单贡献翻单利润' }),
  makeLink('l-65', 'contributesTo', 'ord-03', 'cost-08', 'pathAssociation', { description: '内销现货贡献利润' }),

  // === 成本利润核算 ===
  makeLink('l-70', 'causes', 'risk-01', 'cost-05', 'impactTransmission', { description: '弃单导致模具成本损失' }),
  makeLink('l-71', 'causes', 'risk-02', 'cost-03', 'impactTransmission', { description: '库存积压产生库存成本' }),
  makeLink('l-72', 'causes', 'risk-03', 'cost-02', 'impactTransmission', { description: '品质风险增加返工成本' }),
  makeLink('l-73', 'causes', 'risk-04', 'cost-03', 'impactTransmission', { description: '环保不合规增加整改成本' }),
  makeLink('l-74', 'reducesProfit', 'cost-06', 'cost-01', 'impactTransmission', { description: '皮料损耗率影响主料成本' }),
  makeLink('l-75', 'reducesProfit', 'cost-07', 'cost-02', 'impactTransmission', { description: '次品率增加损耗成本' }),
  makeLink('l-76', 'reducesProfit', 'cost-09', 'cost-04', 'impactTransmission', { description: '交期影响人工成本' }),

  // === 经营风险管控 ===
  makeLink('l-80', 'causes', 'risk-05', 'ord-02', 'impactTransmission', { description: '交期违约影响外贸订单' }),
  makeLink('l-81', 'causes', 'risk-06', 'ord-04', 'impactTransmission', { description: '汇率波动影响信用证订单' }),
  makeLink('l-82', 'reducesProfit', 'cost-06', 'risk-03', 'impactTransmission', { description: '皮料色差导致品质风险' }),

  // === 板块聚合链接（板块到子实体） ===
  makeLink('l-agg-01', 'belongsTo', 'rd-01', 'dom-rd', 'precedence'),
  makeLink('l-agg-02', 'belongsTo', 'rd-02', 'dom-rd', 'precedence'),
  makeLink('l-agg-03', 'belongsTo', 'rd-03', 'dom-rd', 'precedence'),
  makeLink('l-agg-04', 'belongsTo', 'mfg-01', 'dom-mfg', 'precedence'),
  makeLink('l-agg-05', 'belongsTo', 'mfg-02', 'dom-mfg', 'precedence'),
  makeLink('l-agg-06', 'belongsTo', 'mfg-03', 'dom-mfg', 'precedence'),
  makeLink('l-agg-07', 'belongsTo', 'scm-01', 'dom-scm', 'precedence'),
  makeLink('l-agg-08', 'belongsTo', 'scm-05', 'dom-scm', 'precedence'),
  makeLink('l-agg-09', 'belongsTo', 'qc-01', 'dom-qc', 'precedence'),
  makeLink('l-agg-10', 'belongsTo', 'sys-01', 'dom-sys', 'precedence'),
  makeLink('l-agg-11', 'belongsTo', 'sales-01', 'dom-sales', 'precedence'),
  makeLink('l-agg-12', 'belongsTo', 'ord-01', 'dom-order', 'precedence'),
  makeLink('l-agg-13', 'belongsTo', 'cost-01', 'dom-cost', 'precedence'),
  makeLink('l-agg-14', 'belongsTo', 'risk-01', 'dom-risk', 'precedence'),
];
