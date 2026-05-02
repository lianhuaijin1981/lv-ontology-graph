/**
 * 存储适配器接口
 * 抽象所有数据持久化操作，支持无缝切换存储后端
 * 
 * 扩展路线图：
 * Phase 1（当前）: InMemoryAdapter — 全量加载到内存，适合 <10k 实体
 * Phase 2: IndexedDBAdapter — 本地大容量缓存，支持分页和索引
 * Phase 3: HttpAdapter — REST API 后端，支持远程查询
 * Phase 4: GraphDBAdapter — Neo4j / JanusGraph / TigerGraph，原生图遍历
 * Phase 5: DistributedAdapter — 分片 + 聚合查询，支持 10 亿级
 * 
 * 关键设计：所有查询返回 Promise，异步接口统一
 */

import type { EntityId, LinkId, EntityProperties } from '@/types';
import type {
  OntologyObject,
  OntologyLink,
  ObjectQuery,
  LinkQuery,
  PathQuery,
  NeighborResult,
  PathResult,
  ObjectType,
  LinkType,
  ActionType,
} from '@/ontology/types';

/** ==================== 存储适配器接口 ==================== */

export interface StorageAdapter {
  readonly name: string;
  readonly version: string;
  /** 是否支持增量加载 */
  readonly supportsIncremental: boolean;
  /** 是否支持图遍历查询 */
  readonly supportsGraphTraversal: boolean;
  /** 单次查询最大返回数（分页用） */
  readonly maxPageSize: number;

  /** --- 生命周期 --- */
  initialize(): Promise<void>;
  close(): Promise<void>;

  /** --- 写入接口 --- */
  createObject(object: OntologyObject): Promise<OntologyObject>;
  updateObject(id: EntityId, properties: Partial<EntityProperties>): Promise<OntologyObject>;
  deleteObject(id: EntityId): Promise<void>;
  createLink(link: OntologyLink): Promise<OntologyLink>;
  deleteLink(id: LinkId): Promise<void>;
  /** 批量导入（初始化用） */
  bulkImport(objects: OntologyObject[], links: OntologyLink[]): Promise<{ objects: number; links: number }>;

  /** --- 读取接口 --- */
  getObject(id: EntityId): Promise<OntologyObject | null>;
  getObjects(query: ObjectQuery): Promise<{ items: OntologyObject[]; total: number }>;
  getLink(id: LinkId): Promise<OntologyLink | null>;
  getLinks(query: LinkQuery): Promise<{ items: OntologyLink[]; total: number }>;

  /** --- 图查询接口（核心扩展点） --- */
  /** 获取节点的邻居（1-hop 或 n-hop） */
  getNeighbors(
    nodeId: EntityId,
    options?: {
      hopLimit?: number;
      linkTypeIds?: string[];
      direction?: 'outgoing' | 'incoming' | 'both';
    }
  ): Promise<NeighborResult[]>;
  /** 最短路径 / 全路径查询 */
  findPaths(query: PathQuery): Promise<PathResult[]>;
  /** 聚合统计（按类型、板块统计数量） */
  aggregateCounts(options?: {
    byType?: boolean;
    byDomain?: boolean;
    byLinkType?: boolean;
  }): Promise<Record<string, number>>;

  /** --- 本体定义接口（元数据层） --- */
  getObjectTypes(): Promise<ObjectType[]>;
  getLinkTypes(): Promise<LinkType[]>;
  getActionTypes(): Promise<ActionType[]>;
}

/** ==================== 存储适配器工厂 ==================== */

export type AdapterFactory = () => StorageAdapter;

/** 适配器注册表 */
export class AdapterRegistry {
  private factories = new Map<string, AdapterFactory>();

  register(name: string, factory: AdapterFactory): void {
    this.factories.set(name, factory);
  }

  create(name: string): StorageAdapter {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Storage adapter "${name}" not registered`);
    return factory();
  }

  list(): string[] {
    return Array.from(this.factories.keys());
  }
}

export const globalAdapterRegistry = new AdapterRegistry();

/** ==================== 分页游标（Phase 3+ 远程查询用） ==================== */

export interface PageCursor {
  offset: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

/** ==================== 同步状态（Phase 2+ 离线缓存用） ==================== */

export interface SyncStatus {
  lastSyncedAt: string | null;
  pendingWrites: number;
  isOnline: boolean;
  syncInProgress: boolean;
}
