/**
 * 通用类型定义
 * 知识图谱系统的基础类型层
 */

export type EntityId = string;
export type LinkId = string;
export type ObjectTypeId = string;
export type LinkTypeId = string;
export type PropertyKey = string;

/** 九大业务板块 */
export const BusinessDomains = [
  '研发设计',
  '生产制造',
  '供应链管理',
  '质量管控',
  '业务系统支撑',
  '市场渠道销售',
  '订单物流报关',
  '成本利润核算',
  '经营风险管控',
] as const;

export type BusinessDomain = (typeof BusinessDomains)[number];

/** 节点层级（用于LOD聚合） */
export const NodeLevel = {
  Aggregate: 0,
  Category: 1,
  Entity: 2,
  Instance: 3,
} as const;

export type NodeLevel = (typeof NodeLevel)[keyof typeof NodeLevel];

/** 属性值类型 */
export type PropertyValue = string | number | boolean | Date | string[] | null;

/** 实体属性对象 */
export type EntityProperties = Record<PropertyKey, PropertyValue>;

/** 扩展信息（业务系统能力的量化描述） */
export interface BusinessValue {
  description: string;
  profitImpact?: string;
  riskReduction?: string;
  efficiencyGain?: string;
}

/** 坐标 */
export interface Point {
  x: number;
  y: number;
}

/** 边界框 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 视图状态 */
export interface ViewState {
  zoom: number;
  center: Point;
  selectedNodeId?: EntityId;
  hoveredNodeId?: EntityId;
  expandedAggregateIds: Set<EntityId>;
  activeFilters: FilterState;
}

/** 筛选状态 */
export interface FilterState {
  domains: BusinessDomain[];
  objectTypes: ObjectTypeId[];
  searchQuery: string;
  importanceMin: number; // 0-1
}

/** 图谱渲染配置 */
export interface GraphRenderConfig {
  nodeSizeBase: number;
  nodeSizeMax: number;
  linkWidthBase: number;
  linkDistance: number;
  chargeStrength: number;
  collideRadius: number;
  alphaDecay: number;
  velocityDecay: number;
}

export const DEFAULT_RENDER_CONFIG: GraphRenderConfig = {
  nodeSizeBase: 6,
  nodeSizeMax: 18,
  linkWidthBase: 1.5,
  linkDistance: 100,
  chargeStrength: -300,
  collideRadius: 20,
  alphaDecay: 0.06,
  velocityDecay: 0.65,
};
