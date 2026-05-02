/**
 * 女鞋总厂知识图谱 — 本体定义与核心数据
 * 
 * 数据规模策略（可扩展设计）：
 * - 当前：加载 ~100 核心实体（覆盖 9 大板块 + 55 条三元组）
 * - Phase 2: 按板块按需分页加载（每次 50-100 实体）
 * - Phase 3: 聚合节点 LOD，点击展开才加载子节点
 * - Phase 4: 后端 GraphDB 支持 10 亿级，前端仅渲染视窗内节点
 * 
 * 颜色体系：
 * - 研发设计: #F59E0B (amber)
 * - 生产制造: #3B82F6 (blue)
 * - 供应链管理: #10B981 (emerald)
 * - 质量管控: #EF4444 (red)
 * - 业务系统支撑: #8B5CF6 (violet)
 * - 市场渠道销售: #EC4899 (pink)
 * - 订单物流报关: #06B6D4 (cyan)
 * - 成本利润核算: #F97316 (orange)
 * - 经营风险管控: #DC2626 (rose)
 */

import type { BusinessDomain } from '@/types';
import {
  PropertyDataType,
  LinkSemantics,
  LinkMultiplicity,
} from '@/ontology/types';
import type {
  ObjectType,
  LinkType,
  ActionType,
  PropertyType,
} from '@/ontology/types';

const domainColors: Record<BusinessDomain, string> = {
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

// ==================== 属性模板 ====================

const commonProps: PropertyType[] = [
  { key: 'description', displayName: '描述', description: '实体业务描述', dataType: PropertyDataType.RichText, required: false, filterable: false, sortable: false },
  { key: 'importance', displayName: '重要性', description: '0-1重要性评分', dataType: PropertyDataType.Number, required: false, filterable: true, sortable: true },
];

// ==================== 对象类型定义（核心类型） ====================

export const shoeFactoryObjectTypes: ObjectType[] = [
  // ---- 研发设计 ----
  {
    id: 'designer', displayName: '设计师', description: '出格设计师、版型设计师', domain: '研发设计', color: domainColors['研发设计'], shape: 'circle', level: 2, isCore: true,
    properties: [...commonProps, { key: 'experience', displayName: '经验年限', description: '', dataType: PropertyDataType.Number, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'patternMaster', displayName: '版型师傅', description: '楦头调整、版型优化', domain: '研发设计', color: domainColors['研发设计'], shape: 'circle', level: 2, isCore: true,
    properties: [...commonProps],
  },
  {
    id: 'shoeDesign', displayName: '鞋款设计', description: '鞋款设计方案', domain: '研发设计', color: domainColors['研发设计'], shape: 'hexagon', level: 2, isCore: true,
    properties: [...commonProps, { key: 'season', displayName: '季节', description: '', dataType: PropertyDataType.String, required: false, filterable: true, sortable: false }],
  },
  {
    id: 'patternMaking', displayName: '版型出格', description: '版型尺寸、裁片设计', domain: '研发设计', color: domainColors['研发设计'], shape: 'hexagon', level: 2, isCore: false,
    properties: [...commonProps],
  },
  {
    id: 'sampleMaking', displayName: '初样制作', description: '打样、改版、封样', domain: '研发设计', color: domainColors['研发设计'], shape: 'diamond', level: 2, isCore: false,
    properties: [...commonProps],
  },

  // ---- 生产制造 ----
  {
    id: 'workshop', displayName: '生产车间', description: '裁断/针车/成型/包装车间', domain: '生产制造', color: domainColors['生产制造'], shape: 'rect', level: 1, isCore: true,
    properties: [...commonProps, { key: 'capacity', displayName: '日产能', description: '', dataType: PropertyDataType.Number, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'process', displayName: '工艺工序', description: '裁断下料、针车车缝、贴底工艺等', domain: '生产制造', color: domainColors['生产制造'], shape: 'hexagon', level: 2, isCore: true,
    properties: [...commonProps, { key: 'yield', displayName: '合格率', description: '', dataType: PropertyDataType.Percentage, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'team', displayName: '班组', description: '生产班组', domain: '生产制造', color: domainColors['生产制造'], shape: 'circle', level: 2, isCore: false,
    properties: [...commonProps, { key: 'headcount', displayName: '人数', description: '', dataType: PropertyDataType.Number, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'equipment', displayName: '设备', description: '生产设备、刀模、楦头', domain: '生产制造', color: domainColors['生产制造'], shape: 'diamond', level: 2, isCore: false,
    properties: [...commonProps, { key: 'status', displayName: '状态', description: '', dataType: PropertyDataType.Enum, enumOptions: ['运行中', '待机', '维修中', '报废'], required: false, filterable: true, sortable: false }],
  },

  // ---- 供应链管理 ----
  {
    id: 'supplier', displayName: '供应商', description: '原材料供应商', domain: '供应链管理', color: domainColors['供应链管理'], shape: 'circle', level: 2, isCore: true,
    properties: [...commonProps, { key: 'rating', displayName: '评级', description: '', dataType: PropertyDataType.Enum, enumOptions: ['A', 'B', 'C', 'D'], required: false, filterable: true, sortable: false }],
  },
  {
    id: 'material', displayName: '物料', description: '皮料、布料、鞋底、辅料', domain: '供应链管理', color: domainColors['供应链管理'], shape: 'diamond', level: 2, isCore: true,
    properties: [...commonProps, { key: 'unitPrice', displayName: '单价', description: '', dataType: PropertyDataType.Currency, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'warehouse', displayName: '仓库', description: '原料仓、半成品仓、成品仓', domain: '供应链管理', color: domainColors['供应链管理'], shape: 'rect', level: 1, isCore: true,
    properties: [...commonProps, { key: 'capacity', displayName: '库容', description: '', dataType: PropertyDataType.Number, required: false, filterable: true, sortable: true }],
  },

  // ---- 质量管控 ----
  {
    id: 'qcInspector', displayName: '质检员', description: 'IQC/IPQC/OQC 质检员', domain: '质量管控', color: domainColors['质量管控'], shape: 'circle', level: 2, isCore: true,
    properties: [...commonProps],
  },
  {
    id: 'qcStandard', displayName: '质检标准', description: '来料/制程/成品质检标准', domain: '质量管控', color: domainColors['质量管控'], shape: 'hexagon', level: 2, isCore: false,
    properties: [...commonProps],
  },

  // ---- 业务系统支撑 ----
  {
    id: 'bizSystem', displayName: '业务系统', description: 'ERP/MES/WMS/QMS/APS/EAM', domain: '业务系统支撑', color: domainColors['业务系统支撑'], shape: 'rect', level: 1, isCore: true,
    properties: [...commonProps, { key: 'coverage', displayName: '覆盖模块', description: '', dataType: PropertyDataType.Array, required: false, filterable: false, sortable: false }],
  },

  // ---- 市场渠道销售 ----
  {
    id: 'channel', displayName: '销售渠道', description: '1688/抖音/广交会/海外商超', domain: '市场渠道销售', color: domainColors['市场渠道销售'], shape: 'rect', level: 1, isCore: true,
    properties: [...commonProps, { key: 'channelType', displayName: '渠道类型', description: '', dataType: PropertyDataType.Enum, enumOptions: ['线上', '线下', '展会', '批发'], required: false, filterable: true, sortable: false }],
  },
  {
    id: 'salesperson', displayName: '业务员', description: '外贸/内销业务员', domain: '市场渠道销售', color: domainColors['市场渠道销售'], shape: 'circle', level: 2, isCore: false,
    properties: [...commonProps],
  },
  {
    id: 'customer', displayName: '客户', description: '批发商/品牌商/经销商', domain: '市场渠道销售', color: domainColors['市场渠道销售'], shape: 'circle', level: 2, isCore: true,
    properties: [...commonProps, { key: 'customerType', displayName: '客户类型', description: '', dataType: PropertyDataType.Enum, enumOptions: ['海外品牌商', '国内批发商', '电商卖家', '直播主播'], required: false, filterable: true, sortable: false }],
  },

  // ---- 订单物流报关 ----
  {
    id: 'order', displayName: '订单', description: '打样/外贸/内销订单', domain: '订单物流报关', color: domainColors['订单物流报关'], shape: 'hexagon', level: 2, isCore: true,
    properties: [...commonProps, { key: 'orderType', displayName: '订单类型', description: '', dataType: PropertyDataType.Enum, enumOptions: ['打样', '外贸大货', '内销现货', '信用证'], required: false, filterable: true, sortable: false }, { key: 'amount', displayName: '金额', description: '', dataType: PropertyDataType.Currency, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'logistics', displayName: '物流', description: '海运/陆运/报关/订舱', domain: '订单物流报关', color: domainColors['订单物流报关'], shape: 'diamond', level: 2, isCore: false,
    properties: [...commonProps],
  },

  // ---- 成本利润核算 ----
  {
    id: 'costItem', displayName: '成本项', description: '皮料/人工/库存/物流成本', domain: '成本利润核算', color: domainColors['成本利润核算'], shape: 'diamond', level: 2, isCore: true,
    properties: [...commonProps, { key: 'costValue', displayName: '成本值', description: '', dataType: PropertyDataType.Currency, required: false, filterable: true, sortable: true }],
  },
  {
    id: 'profitFactor', displayName: '利润因素', description: '损耗率/次品率/周转率', domain: '成本利润核算', color: domainColors['成本利润核算'], shape: 'hexagon', level: 2, isCore: true,
    properties: [...commonProps, { key: 'impactWeight', displayName: '影响权重', description: '', dataType: PropertyDataType.Percentage, required: false, filterable: true, sortable: true }],
  },

  // ---- 经营风险管控 ----
  {
    id: 'risk', displayName: '经营风险', description: '环保/弃单/库存/汇率风险', domain: '经营风险管控', color: domainColors['经营风险管控'], shape: 'hexagon', level: 2, isCore: true,
    properties: [...commonProps, { key: 'probability', displayName: '发生概率', description: '', dataType: PropertyDataType.Percentage, required: false, filterable: true, sortable: true }, { key: 'lossEstimate', displayName: '预估损失', description: '', dataType: PropertyDataType.Currency, required: false, filterable: true, sortable: true }],
  },

  // ---- 聚合节点类型（九大板块） ----
  {
    id: 'domainAggregate', displayName: '业务板块', description: '九大业务板块聚合节点', domain: '研发设计', color: '#64748B', shape: 'rect', level: 0, isCore: true,
    properties: [...commonProps, { key: 'domain', displayName: '板块名称', description: '', dataType: PropertyDataType.String, required: true, filterable: true, sortable: false }],
  },
];

// ==================== 链接类型定义（对应 55 条三元组） ====================

export const shoeFactoryLinkTypes: LinkType[] = [
  // 能力支撑
  { id: 'supports', displayName: '提供能力支撑', description: '系统提供能力支撑角色/工序', sourceTypeId: 'bizSystem', targetTypeId: 'process', semantics: LinkSemantics.CapabilitySupport, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#8B5CF6', style: 'solid' },
  { id: 'systemSupportsRole', displayName: '系统支撑角色', description: '系统支撑岗位角色', sourceTypeId: 'bizSystem', targetTypeId: 'designer', semantics: LinkSemantics.CapabilitySupport, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#8B5CF6', style: 'solid' },
  { id: 'systemSupportsQc', displayName: '系统支撑质检', description: '系统支撑质检员', sourceTypeId: 'bizSystem', targetTypeId: 'qcInspector', semantics: LinkSemantics.CapabilitySupport, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#8B5CF6', style: 'solid' },

  // 前置/从属
  { id: 'precedes', displayName: '前置于', description: '工序A前置于工序B', sourceTypeId: 'process', targetTypeId: 'process', semantics: LinkSemantics.Precedence, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#3B82F6', style: 'solid' },
  { id: 'belongsTo', displayName: '隶属于', description: '工艺隶属于流程', sourceTypeId: 'process', targetTypeId: 'workshop', semantics: LinkSemantics.Precedence, multiplicity: LinkMultiplicity.ManyToOne, directed: true, color: '#3B82F6', style: 'dashed' },
  { id: 'partOf', displayName: '组成', description: '物料组成产品', sourceTypeId: 'material', targetTypeId: 'shoeDesign', semantics: LinkSemantics.Composition, multiplicity: LinkMultiplicity.ManyToOne, directed: true, color: '#10B981', style: 'solid' },

  // 影响传导
  { id: 'causes', displayName: '导致', description: '损耗/次品导致成本变化', sourceTypeId: 'risk', targetTypeId: 'costItem', semantics: LinkSemantics.ImpactTransmission, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#DC2626', style: 'solid' },
  { id: 'reducesProfit', displayName: '降低利润', description: '次品率降低利润率', sourceTypeId: 'profitFactor', targetTypeId: 'costItem', semantics: LinkSemantics.ImpactTransmission, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#F97316', style: 'dashed' },
  { id: 'increasesCost', displayName: '增加成本', description: '损耗增加经营成本', sourceTypeId: 'material', targetTypeId: 'costItem', semantics: LinkSemantics.ImpactTransmission, multiplicity: LinkMultiplicity.ManyToMany, directed: true, color: '#F97316', style: 'dashed' },

  // 路径关联
  { id: 'acquires', displayName: '获取客户', description: '渠道获取客户', sourceTypeId: 'channel', targetTypeId: 'customer', semantics: LinkSemantics.PathAssociation, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#EC4899', style: 'solid' },
  { id: 'placesOrder', displayName: '产生订单', description: '客户产生订单', sourceTypeId: 'customer', targetTypeId: 'order', semantics: LinkSemantics.PathAssociation, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#EC4899', style: 'solid' },
  { id: 'contributesTo', displayName: '贡献营收', description: '订单贡献营收', sourceTypeId: 'order', targetTypeId: 'profitFactor', semantics: LinkSemantics.PathAssociation, multiplicity: LinkMultiplicity.ManyToOne, directed: true, color: '#EC4899', style: 'solid' },

  // 管控约束
  { id: 'controls', displayName: '管控', description: '质检管控工序/物料', sourceTypeId: 'qcInspector', targetTypeId: 'process', semantics: LinkSemantics.ControlConstraint, multiplicity: LinkMultiplicity.ManyToMany, directed: true, color: '#EF4444', style: 'solid' },
  { id: 'inspects', displayName: '检测', description: '质检员检测物料/成品', sourceTypeId: 'qcInspector', targetTypeId: 'material', semantics: LinkSemantics.ControlConstraint, multiplicity: LinkMultiplicity.ManyToMany, directed: true, color: '#EF4444', style: 'solid' },

  // 负责关系
  { id: 'responsibleFor', displayName: '负责', description: '人员负责工序/流程', sourceTypeId: 'designer', targetTypeId: 'patternMaking', semantics: LinkSemantics.Responsibility, multiplicity: LinkMultiplicity.OneToOne, directed: true, color: '#F59E0B', style: 'solid' },
  { id: 'manages', displayName: '管理', description: '班组管理设备', sourceTypeId: 'team', targetTypeId: 'equipment', semantics: LinkSemantics.Responsibility, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#3B82F6', style: 'dashed' },

  // 存储关系
  { id: 'stores', displayName: '存储', description: '仓库存储物料/产品', sourceTypeId: 'warehouse', targetTypeId: 'material', semantics: LinkSemantics.Storage, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#10B981', style: 'solid' },

  // 供给关系
  { id: 'supplies', displayName: '供给', description: '供应商供给物料', sourceTypeId: 'supplier', targetTypeId: 'material', semantics: LinkSemantics.Supply, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#10B981', style: 'solid' },

  // 合作关系
  { id: 'cooperates', displayName: '合作', description: '工厂与渠道/客户合作', sourceTypeId: 'channel', targetTypeId: 'customer', semantics: LinkSemantics.Cooperation, multiplicity: LinkMultiplicity.ManyToMany, directed: false, color: '#EC4899', style: 'dashed' },
  { id: 'logisticsPartnership', displayName: '物流合作', description: '物流服务商合作', sourceTypeId: 'logistics', targetTypeId: 'order', semantics: LinkSemantics.Cooperation, multiplicity: LinkMultiplicity.ManyToMany, directed: false, color: '#06B6D4', style: 'dashed' },

  // 指导生产
  { id: 'guidesProduction', displayName: '指导生产', description: '设计方案指导生产线', sourceTypeId: 'shoeDesign', targetTypeId: 'workshop', semantics: LinkSemantics.Association, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#F59E0B', style: 'solid' },

  // 外贸关联
  { id: 'customsRelated', displayName: '报关关联', description: '订单关联报关', sourceTypeId: 'order', targetTypeId: 'logistics', semantics: LinkSemantics.Association, multiplicity: LinkMultiplicity.OneToMany, directed: true, color: '#06B6D4', style: 'solid' },

  // 适配关系
  { id: 'adaptsTo', displayName: '适配', description: '刀模/楦头适配裁片/鞋款', sourceTypeId: 'equipment', targetTypeId: 'shoeDesign', semantics: LinkSemantics.Association, multiplicity: LinkMultiplicity.ManyToMany, directed: false, color: '#3B82F6', style: 'dotted' },
];

// ==================== 动作类型定义 ====================

export const shoeFactoryActionTypes: ActionType[] = [
  {
    id: 'drillDown', displayName: '穿透分析', description: '向下穿透查看成本/利润/根因', applicableTypeIds: ['costItem', 'profitFactor', 'risk', 'process'], parameters: [], category: 'drillDown', resultType: 'report',
  },
  {
    id: 'traceSource', displayName: '溯源追踪', description: '追溯实体来源和影响链路', applicableTypeIds: ['material', 'order', 'risk', 'costItem'], parameters: [], category: 'drillDown', resultType: 'chart',
  },
  {
    id: 'neighborExplore', displayName: '展开关联', description: '展开实体的关联邻居', applicableTypeIds: ['workshop', 'process', 'material', 'customer', 'order', 'bizSystem'], parameters: [], category: 'analysis', resultType: 'entity',
  },
  {
    id: 'exportData', displayName: '导出数据', description: '导出实体及关联数据', applicableTypeIds: ['workshop', 'process', 'material', 'order', 'customer', 'supplier'], parameters: [{ name: 'format', type: PropertyDataType.Enum, required: false, description: '导出格式' }], category: 'export', resultType: 'report',
  },
  {
    id: 'riskAlert', displayName: '风险预警', description: '触发风险预警分析', applicableTypeIds: ['risk', 'process', 'material', 'order'], parameters: [], category: 'alert', resultType: 'report',
  },
];
