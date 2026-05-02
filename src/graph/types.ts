/**
 * 图数据模型类型
 * 与 D3.js 渲染层对接的图数据结构
 * 
 * 设计原则：
 * 1. GraphNode / GraphLink 是渲染层专用结构，包含布局坐标等运行时状态
 * 2. 渲染层与领域层通过 ID 关联，不直接引用领域对象（避免循环引用和内存膨胀）
 * 3. 支持增量更新：新节点/边可热插拔，不影响现有布局
 */

import type { EntityId, LinkId, ObjectTypeId, Point } from '@/types';
import type { OntologyObject, OntologyLink } from '@/ontology/types';

/** ==================== 渲染节点 ==================== */

export interface GraphNode {
  /** 实体ID（与 OntologyObject.id 一致） */
  id: EntityId;
  /** 对象类型ID */
  typeId: ObjectTypeId;
  /** 显示名称 */
  label: string;
  /** 业务板块 */
  domain: string;
  /** D3 坐标（力导向模拟用） */
  x?: number;
  y?: number;
  /** D3 速度 */
  vx?: number;
  vy?: number;
  /** D3 固定坐标（拖拽后锁定） */
  fx?: number | null;
  fy?: number | null;
  /** 节点大小（由重要性、类型决定） */
  radius: number;
  /** 颜色 */
  color: string;
  /** 形状 */
  shape: 'circle' | 'rect' | 'diamond' | 'hexagon';
  /** 是否聚合节点 */
  isAggregate: boolean;
  /** 重要性 0-1 */
  importance: number;
  /** 层级 */
  level: number;
  /** 当前渲染状态 */
  state: NodeRenderState;
  /** 关联的子节点数量（聚合节点） */
  childCount: number;
  /** 领域对象引用（按需加载，可为 undefined） */
  ontologyObject?: OntologyObject;
}

/** 节点渲染状态 */
export type NodeRenderState =
  | 'default'
  | 'highlighted'
  | 'dimmed'
  | 'hidden'
  | 'selected'
  | 'hovered'
  | 'visited';     // 面包屑路径中已访问

/** ==================== 渲染边 ==================== */

export interface GraphLink {
  /** 链接ID */
  id: LinkId;
  /** 类型ID */
  typeId: string;
  /** 语义类型 */
  semantics: string;
  /** 源节点ID */
  source: EntityId | GraphNode;
  /** 目标节点ID */
  target: EntityId | GraphNode;
  /** 关系标签 */
  label: string;
  /** 线条宽度 */
  width: number;
  /** 颜色 */
  color: string;
  /** 样式 */
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  /** 是否有方向 */
  directed: boolean;
  /** 当前渲染状态 */
  state: LinkRenderState;
  /** 领域对象引用 */
  ontologyLink?: OntologyLink;
}

/** 链接渲染状态 */
export type LinkRenderState =
  | 'default'
  | 'highlighted'
  | 'dimmed'
  | 'hidden'
  | 'path';          // 面包屑路径

/** ==================== 图谱数据容器 ==================== */

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** ==================== 视窗裁剪 ==================== */

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

/** 用于LOD（Level of Detail）聚合 */
export interface AggregationGroup {
  id: EntityId;
  label: string;
  typeId: ObjectTypeId;
  domain: string;
  childIds: EntityId[];
  /** 聚合后节点坐标（子节点中心平均） */
  center: Point;
  /** 子节点数量 */
  count: number;
  /** 包围盒半径 */
  boundingRadius: number;
}

/** ==================== 渲染状态机 ==================== */

export type GraphMode = 'map' | 'investigate' | 'breadcrumb' | 'search';

export interface GraphState {
  mode: GraphMode;
  selectedNodeId?: EntityId;
  hoveredNodeId?: EntityId;
  breadcrumbPath: EntityId[];
  searchResultIds: EntityId[];
  highlightedPathIds: Set<LinkId>;
}

/** ==================== 交互事件 ==================== */

export interface NodeClickEvent {
  node: GraphNode;
  ctrlKey: boolean;
  shiftKey: boolean;
}

export interface NodeHoverEvent {
  node: GraphNode;
  position: Point;
}

export interface BackgroundClickEvent {
  position: Point;
}

export type GraphEvent =
  | { type: 'nodeClick'; payload: NodeClickEvent }
  | { type: 'nodeHover'; payload: NodeHoverEvent }
  | { type: 'nodeLeave'; payload: { nodeId: EntityId } }
  | { type: 'backgroundClick'; payload: BackgroundClickEvent }
  | { type: 'zoom'; payload: { transform: { k: number; x: number; y: number } } }
  | { type: 'dragStart'; payload: { nodeId: EntityId } }
  | { type: 'dragEnd'; payload: { nodeId: EntityId } };
