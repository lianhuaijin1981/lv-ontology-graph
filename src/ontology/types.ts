/**
 * Palantir Ontology 类型系统
 * 定义对象类型、属性类型、链接类型、动作类型
 * 
 * 架构设计原则：
 * 1. ObjectType 是多态实体的类型契约（而非具体实例）
 * 2. LinkType 是有方向的、带多重性约束的关系定义
 * 3. ActionType 定义可在实体上执行的业务动作
 * 4. 所有类型都支持扩展属性（extensible properties）
 */

import type {
  BusinessDomain,
  EntityId,
  LinkId,
  EntityProperties,
  PropertyValue,
  BusinessValue,
  ObjectTypeId,
  LinkTypeId,
  PropertyKey,
} from '@/types';

/** 属性数据类型 */
export const PropertyDataType = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Date: 'date',
  Enum: 'enum',
  Array: 'array',
  RichText: 'richText',
  Percentage: 'percentage',
  Currency: 'currency',
} as const;

export type PropertyDataType = (typeof PropertyDataType)[keyof typeof PropertyDataType];

export interface PropertyType {
  key: PropertyKey;
  displayName: string;
  description: string;
  dataType: PropertyDataType;
  required: boolean;
  /** 枚举选项（当 dataType === Enum 时） */
  enumOptions?: string[];
  /** 单位（如"元/米"、"%"） */
  unit?: string;
  /** 默认值 */
  defaultValue?: PropertyValue;
  /** 是否可筛选 */
  filterable: boolean;
  /** 是否可排序 */
  sortable: boolean;
}

/** ==================== 对象类型 ==================== */

export interface ObjectType {
  id: ObjectTypeId;
  displayName: string;
  description: string;
  /** 所属业务板块 */
  domain: BusinessDomain;
  /** 父类型（支持继承） */
  parentTypeId?: ObjectTypeId;
  /** 属性定义 */
  properties: PropertyType[];
  /** 图标标识 */
  icon?: string;
  /** 颜色标识 */
  color: string;
  /** 形状标识 */
  shape: 'circle' | 'rect' | 'diamond' | 'hexagon';
  /** 层级 */
  level: number;
  /** 是否为核心实体（影响渲染大小和重要性） */
  isCore: boolean;
  /** 关联的业务价值描述 */
  businessValue?: BusinessValue;
}

/** ==================== 链接类型 ==================== */

export const LinkMultiplicity = {
  OneToOne: '1:1',
  OneToMany: '1:N',
  ManyToOne: 'N:1',
  ManyToMany: 'N:N',
} as const;

export type LinkMultiplicity = (typeof LinkMultiplicity)[keyof typeof LinkMultiplicity];

export const LinkSemantics = {
  /** 能力支撑：系统 → 提供能力 → 支撑角色 */
  CapabilitySupport: 'capabilitySupport',
  /** 前置/从属：工序A → 前置于 → 工序B */
  Precedence: 'precedence',
  /** 影响传导：损耗 → 导致 → 成本变化 */
  ImpactTransmission: 'impactTransmission',
  /** 路径关联：渠道 → 引流 → 客户 → 产生 → 订单 */
  PathAssociation: 'pathAssociation',
  /** 管控约束：质检 → 管控 → 工序 */
  ControlConstraint: 'controlConstraint',
  /** 组成关系：物料 → 组成 → 产品 */
  Composition: 'composition',
  /** 负责关系：人员 → 负责 → 工序 */
  Responsibility: 'responsibility',
  /** 存储关系：仓库 → 存储 → 物料 */
  Storage: 'storage',
  /** 供给关系：供应商 → 供给 → 物料 */
  Supply: 'supply',
  /** 合作关系：工厂 → 合作 → 渠道 */
  Cooperation: 'cooperation',
  /** 关联关系：通用弱关联 */
  Association: 'association',
} as const;

export type LinkSemantics = (typeof LinkSemantics)[keyof typeof LinkSemantics];

export interface LinkType {
  id: LinkTypeId;
  displayName: string;
  description: string;
  /** 源对象类型 */
  sourceTypeId: ObjectTypeId;
  /** 目标对象类型 */
  targetTypeId: ObjectTypeId;
  /** 语义类型 */
  semantics: LinkSemantics;
  /** 多重性约束 */
  multiplicity: LinkMultiplicity;
  /** 是否有方向 */
  directed: boolean;
  /** 业务价值说明 */
  businessValue?: BusinessValue;
  /** 颜色 */
  color: string;
  /** 线条样式 */
  style: 'solid' | 'dashed' | 'dotted' | 'double';
}

/** ==================== 动作类型 ==================== */

export interface ActionParameter {
  name: string;
  type: PropertyDataType;
  required: boolean;
  description: string;
}

export interface ActionType {
  id: string;
  displayName: string;
  description: string;
  /** 适用的对象类型 */
  applicableTypeIds: ObjectTypeId[];
  /** 参数定义 */
  parameters: ActionParameter[];
  /** 动作类别 */
  category: 'analysis' | 'drillDown' | 'export' | 'alert' | 'workflow';
  /** 执行结果类型 */
  resultType: 'entity' | 'property' | 'link' | 'report' | 'chart';
}

/** ==================== 本体注册表 ==================== */

export interface OntologyRegistry {
  /** 注册对象类型 */
  registerObjectType: (type: ObjectType) => void;
  /** 注册链接类型 */
  registerLinkType: (type: LinkType) => void;
  /** 注册动作类型 */
  registerActionType: (type: ActionType) => void;
  /** 获取对象类型 */
  getObjectType: (id: ObjectTypeId) => ObjectType | undefined;
  /** 获取链接类型 */
  getLinkType: (id: LinkTypeId) => LinkType | undefined;
  /** 获取动作类型 */
  getActionType: (id: string) => ActionType | undefined;
  /** 列出所有对象类型 */
  listObjectTypes: () => ObjectType[];
  /** 列出某域下的对象类型 */
  listObjectTypesByDomain: (domain: BusinessDomain) => ObjectType[];
  /** 列出所有链接类型 */
  listLinkTypes: () => LinkType[];
  /** 列出某对象类型相关的链接类型 */
  listLinkTypesForObject: (typeId: ObjectTypeId) => LinkType[];
  /** 列出所有动作类型 */
  listActionTypes: () => ActionType[];
  /** 列出适用于某对象类型的动作 */
  listActionTypesForObject: (typeId: ObjectTypeId) => ActionType[];
}

/** ==================== 实体实例 ==================== */

export interface OntologyObject {
  id: EntityId;
  typeId: ObjectTypeId;
  displayName: string;
  /** 实际属性值（严格遵循 ObjectType 的 PropertyType 定义） */
  properties: EntityProperties;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 业务板块（冗余存储便于筛选） */
  domain: BusinessDomain;
  /** 重要性评分 0-1 */
  importance: number;
  /** 层级 */
  level: number;
  /** 是否是聚合节点 */
  isAggregate: boolean;
  /** 聚合子节点ID列表（仅聚合节点有效） */
  childIds?: EntityId[];
}

/** 链接实例 */
export interface OntologyLink {
  id: LinkId;
  typeId: LinkTypeId;
  sourceId: EntityId;
  targetId: EntityId;
  /** 语义类型（冗余存储便于筛选） */
  semantics: LinkSemantics;
  /** 链接上的属性（如权重、时间范围） */
  properties?: Record<string, PropertyValue>;
  /** 业务价值说明（实例级） */
  businessValue?: BusinessValue;
}

/** ==================== 查询类型 ==================== */

export interface ObjectQuery {
  typeIds?: ObjectTypeId[];
  domains?: BusinessDomain[];
  searchQuery?: string;
  importanceMin?: number;
  importanceMax?: number;
  limit?: number;
  offset?: number;
  /** 是否包含聚合节点 */
  includeAggregates?: boolean;
}

export interface LinkQuery {
  typeIds?: LinkTypeId[];
  sourceId?: EntityId;
  targetId?: EntityId;
  /** 语义类型筛选 */
  semantics?: LinkSemantics[];
  /** 节点ID（查询与该节点相关的所有链接） */
  relatedToNodeId?: EntityId;
  /** 跳数限制 */
  hopLimit?: number;
}

export interface PathQuery {
  sourceId: EntityId;
  targetId: EntityId;
  maxDepth?: number;
  semantics?: LinkSemantics[];
}

/** 邻居查询结果 */
export interface NeighborResult {
  node: OntologyObject;
  links: OntologyLink[];
  /** 跳数 */
  hops: number;
}

/** 路径查询结果 */
export interface PathResult {
  nodes: OntologyObject[];
  links: OntologyLink[];
  totalCost: number;
}
