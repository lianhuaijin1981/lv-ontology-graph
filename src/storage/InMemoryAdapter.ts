/**
 * 内存存储适配器
 * 全量数据驻留内存，O(1) 查询，适合 <10k 实体
 * 支持图遍历查询（为后续 GraphDBAdapter 提供 API 契约参考）
 */

import type { EntityId, LinkId, EntityProperties } from '@/types';
import type { StorageAdapter } from '@/storage/types';
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

export class InMemoryAdapter implements StorageAdapter {
  readonly name = 'InMemoryAdapter';
  readonly version = '1.0.0';
  readonly supportsIncremental = false;
  readonly supportsGraphTraversal = true;
  readonly maxPageSize = 10000;

  private objects = new Map<EntityId, OntologyObject>();
  private links = new Map<LinkId, OntologyLink>();
  private adjacency = new Map<EntityId, Set<LinkId>>(); // nodeId -> linkIds
  private objectTypes: ObjectType[] = [];
  private linkTypes: LinkType[] = [];
  private actionTypes: ActionType[] = [];

  // ==================== 生命周期 ====================

  async initialize(): Promise<void> {
    // initialization complete
  }

  async close(): Promise<void> {
    this.objects.clear();
    this.links.clear();
    this.adjacency.clear();
  }

  // ==================== 写入接口 ====================

  async createObject(object: OntologyObject): Promise<OntologyObject> {
    this.objects.set(object.id, object);
    if (!this.adjacency.has(object.id)) {
      this.adjacency.set(object.id, new Set());
    }
    return object;
  }

  async updateObject(
    id: EntityId,
    properties: Partial<EntityProperties>
  ): Promise<OntologyObject> {
    const obj = this.objects.get(id);
    if (!obj) throw new Error(`Object ${id} not found`);
    const mergedProps: EntityProperties = {};
    for (const [k, v] of Object.entries(obj.properties)) {
      mergedProps[k] = v;
    }
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined) mergedProps[k] = v;
    }
    const updated: OntologyObject = { ...obj, properties: mergedProps, updatedAt: new Date().toISOString() };
    this.objects.set(id, updated);
    return updated;
  }

  async deleteObject(id: EntityId): Promise<void> {
    this.objects.delete(id);
    // 清理关联链接
    const linkIds = this.adjacency.get(id) || new Set();
    for (const linkId of linkIds) {
      this.links.delete(linkId);
    }
    // 从其他节点的邻接表中移除
    for (const [, set] of this.adjacency) {
      for (const lid of linkIds) set.delete(lid);
    }
    this.adjacency.delete(id);
  }

  async createLink(link: OntologyLink): Promise<OntologyLink> {
    this.links.set(link.id, link);
    // 更新邻接表
    if (!this.adjacency.has(link.sourceId)) this.adjacency.set(link.sourceId, new Set());
    if (!this.adjacency.has(link.targetId)) this.adjacency.set(link.targetId, new Set());
    this.adjacency.get(link.sourceId)!.add(link.id);
    this.adjacency.get(link.targetId)!.add(link.id);
    return link;
  }

  async deleteLink(id: LinkId): Promise<void> {
    const link = this.links.get(id);
    if (link) {
      this.adjacency.get(link.sourceId)?.delete(id);
      this.adjacency.get(link.targetId)?.delete(id);
    }
    this.links.delete(id);
  }

  async bulkImport(
    objects: OntologyObject[],
    links: OntologyLink[]
  ): Promise<{ objects: number; links: number }> {
    for (const obj of objects) {
      this.objects.set(obj.id, obj);
      if (!this.adjacency.has(obj.id)) this.adjacency.set(obj.id, new Set());
    }
    for (const link of links) {
      this.links.set(link.id, link);
      if (!this.adjacency.has(link.sourceId)) this.adjacency.set(link.sourceId, new Set());
      if (!this.adjacency.has(link.targetId)) this.adjacency.set(link.targetId, new Set());
      this.adjacency.get(link.sourceId)!.add(link.id);
      this.adjacency.get(link.targetId)!.add(link.id);
    }
    return { objects: objects.length, links: links.length };
  }

  // ==================== 读取接口 ====================

  async getObject(id: EntityId): Promise<OntologyObject | null> {
    return this.objects.get(id) || null;
  }

  async getObjects(
    query: ObjectQuery
  ): Promise<{ items: OntologyObject[]; total: number }> {
    let items = Array.from(this.objects.values());

    if (query.typeIds?.length) {
      items = items.filter((o) => query.typeIds!.includes(o.typeId));
    }
    if (query.domains?.length) {
      items = items.filter((o) => query.domains!.includes(o.domain as any));
    }
    if (query.searchQuery) {
      const q = query.searchQuery.toLowerCase();
      items = items.filter(
        (o) =>
          o.displayName.toLowerCase().includes(q) ||
          Object.values(o.properties).some((v) =>
            String(v).toLowerCase().includes(q)
          )
      );
    }
    if (query.importanceMin !== undefined) {
      items = items.filter((o) => o.importance >= query.importanceMin!);
    }
    if (query.importanceMax !== undefined) {
      items = items.filter((o) => o.importance <= query.importanceMax!);
    }
    if (!query.includeAggregates) {
      items = items.filter((o) => !o.isAggregate);
    }

    const total = items.length;
    const offset = query.offset || 0;
    const limit = query.limit || this.maxPageSize;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  async getLink(id: LinkId): Promise<OntologyLink | null> {
    return this.links.get(id) || null;
  }

  async getLinks(
    query: LinkQuery
  ): Promise<{ items: OntologyLink[]; total: number }> {
    let items = Array.from(this.links.values());

    if (query.typeIds?.length) {
      items = items.filter((l) => query.typeIds!.includes(l.typeId));
    }
    if (query.semantics?.length) {
      items = items.filter((l) => query.semantics!.includes(l.semantics));
    }
    if (query.sourceId) {
      items = items.filter((l) => l.sourceId === query.sourceId);
    }
    if (query.targetId) {
      items = items.filter((l) => l.targetId === query.targetId);
    }
    if (query.relatedToNodeId) {
      items = items.filter(
        (l) =>
          l.sourceId === query.relatedToNodeId ||
          l.targetId === query.relatedToNodeId
      );
    }

    return { items, total: items.length };
  }

  // ==================== 图查询接口 ====================

  async getNeighbors(
    nodeId: EntityId,
    options: {
      hopLimit?: number;
      linkTypeIds?: string[];
      direction?: 'outgoing' | 'incoming' | 'both';
    } = {}
  ): Promise<NeighborResult[]> {
    const hopLimit = options.hopLimit || 1;
    const direction = options.direction || 'both';
    const linkTypeIds = options.linkTypeIds;

    const visited = new Set<EntityId>();
    const results: NeighborResult[] = [];
    const queue: { id: EntityId; hops: number }[] = [{ id: nodeId, hops: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.hops >= hopLimit) continue;

      const linkIds = this.adjacency.get(current.id) || new Set();
      for (const linkId of linkIds) {
        const link = this.links.get(linkId);
        if (!link) continue;
        if (linkTypeIds && !linkTypeIds.includes(link.typeId)) continue;

        let neighborId: EntityId;
        if (link.sourceId === current.id) {
          if (direction === 'incoming') continue;
          neighborId = link.targetId;
        } else if (link.targetId === current.id) {
          if (direction === 'outgoing') continue;
          neighborId = link.sourceId;
        } else {
          continue;
        }

        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighbor = this.objects.get(neighborId);
        if (!neighbor) continue;

        const linksToNeighbor = Array.from(linkIds)
          .map((lid) => this.links.get(lid))
          .filter(
            (l): l is OntologyLink =>
              !!l &&
              (l.sourceId === neighborId || l.targetId === neighborId) &&
              (l.sourceId === current.id || l.targetId === current.id)
          );

        results.push({
          node: neighbor,
          links: linksToNeighbor,
          hops: current.hops + 1,
        });

        queue.push({ id: neighborId, hops: current.hops + 1 });
      }
    }

    return results;
  }

  async findPaths(query: PathQuery): Promise<PathResult[]> {
    // BFS 找最短路径（支持多条）
    const { sourceId, targetId, maxDepth = 5, semantics } = query;
    const paths: PathResult[] = [];

    type QueueItem = {
      nodeId: EntityId;
      pathNodes: EntityId[];
      pathLinks: LinkId[];
      depth: number;
    };

    const queue: QueueItem[] = [
      { nodeId: sourceId, pathNodes: [sourceId], pathLinks: [], depth: 0 },
    ];
    const visitedAtDepth = new Map<string, number>();

    while (queue.length > 0 && paths.length < 5) {
      const current = queue.shift()!;
      if (current.nodeId === targetId && current.pathLinks.length > 0) {
        paths.push({
          nodes: current.pathNodes.map((id) => this.objects.get(id)!),
          links: current.pathLinks.map((id) => this.links.get(id)!),
          totalCost: current.depth,
        });
        continue;
      }
      if (current.depth >= maxDepth) continue;

      const linkIds = this.adjacency.get(current.nodeId) || new Set();
      for (const linkId of linkIds) {
        const link = this.links.get(linkId);
        if (!link) continue;
        if (semantics && !semantics.includes(link.semantics)) continue;

        const nextId =
          link.sourceId === current.nodeId ? link.targetId : link.sourceId;
        if (current.pathNodes.includes(nextId)) continue;

        const stateKey = `${nextId}@${current.depth + 1}`;
        if (visitedAtDepth.has(stateKey)) continue;
        visitedAtDepth.set(stateKey, current.depth + 1);

        queue.push({
          nodeId: nextId,
          pathNodes: [...current.pathNodes, nextId],
          pathLinks: [...current.pathLinks, linkId],
          depth: current.depth + 1,
        });
      }
    }

    return paths;
  }

  async aggregateCounts(
    options: {
      byType?: boolean;
      byDomain?: boolean;
      byLinkType?: boolean;
    } = {}
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (options.byType) {
      for (const obj of this.objects.values()) {
        result[`type:${obj.typeId}`] = (result[`type:${obj.typeId}`] || 0) + 1;
      }
    }
    if (options.byDomain) {
      for (const obj of this.objects.values()) {
        result[`domain:${obj.domain}`] = (result[`domain:${obj.domain}`] || 0) + 1;
      }
    }
    if (options.byLinkType) {
      for (const link of this.links.values()) {
        result[`linkType:${link.typeId}`] = (result[`linkType:${link.typeId}`] || 0) + 1;
      }
    }

    return result;
  }

  // ==================== 本体定义接口 ====================

  async getObjectTypes(): Promise<ObjectType[]> {
    return [...this.objectTypes];
  }

  async getLinkTypes(): Promise<LinkType[]> {
    return [...this.linkTypes];
  }

  async getActionTypes(): Promise<ActionType[]> {
    return [...this.actionTypes];
  }

  // ==================== 内部方法（本体注册） ====================

  registerObjectTypes(types: ObjectType[]): void {
    this.objectTypes = types;
  }

  registerLinkTypes(types: LinkType[]): void {
    this.linkTypes = types;
  }

  registerActionTypes(types: ActionType[]): void {
    this.actionTypes = types;
  }
}
