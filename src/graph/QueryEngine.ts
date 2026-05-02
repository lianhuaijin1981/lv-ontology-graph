/**
 * 图查询引擎
 * 封装图遍历、邻居查询、路径查找等操作
 * 与 StorageAdapter 解耦，支持增量查询结果缓存
 */

import type { EntityId, LinkId } from '@/types';
import type { StorageAdapter } from '@/storage/types';
import type {
  OntologyObject,
  OntologyLink,
  NeighborResult,
  PathResult,
  ObjectQuery,
  ObjectType,
  LinkType,
} from '@/ontology/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';

export class QueryEngine {
  private cache = new Map<string, unknown>();
  private storage: StorageAdapter;
  private objectTypesCache: ObjectType[] | null = null;
  private linkTypesCache: LinkType[] | null = null;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async getCachedObjectTypes(): Promise<ObjectType[]> {
    if (!this.objectTypesCache) {
      this.objectTypesCache = await this.storage.getObjectTypes();
    }
    return this.objectTypesCache;
  }

  private async getCachedLinkTypes(): Promise<LinkType[]> {
    if (!this.linkTypesCache) {
      this.linkTypesCache = await this.storage.getLinkTypes();
    }
    return this.linkTypesCache;
  }

  // ==================== 基础查询 ====================

  async getObject(id: EntityId): Promise<OntologyObject | null> {
    return this.storage.getObject(id);
  }

  async getObjectsByType(typeId: string): Promise<OntologyObject[]> {
    const result = await this.storage.getObjects({ typeIds: [typeId], limit: 1000 });
    return result.items;
  }

  async getObjectsByDomain(domain: string): Promise<OntologyObject[]> {
    const result = await this.storage.getObjects({ domains: [domain as any], limit: 1000 });
    return result.items;
  }

  // ==================== 邻居查询 ====================

  async getNeighbors(
    nodeId: EntityId,
    hopLimit = 1
  ): Promise<NeighborResult[]> {
    const cacheKey = `neighbors:${nodeId}:${hopLimit}`;
    const cached = this.cache.get(cacheKey) as NeighborResult[] | undefined;
    if (cached) return cached;

    const result = await this.storage.getNeighbors(nodeId, { hopLimit });
    this.cache.set(cacheKey, result);
    return result;
  }

  // ==================== 路径查询 ====================

  async findPaths(
    sourceId: EntityId,
    targetId: EntityId,
    maxDepth = 5
  ): Promise<PathResult[]> {
    const cacheKey = `path:${sourceId}:${targetId}:${maxDepth}`;
    const cached = this.cache.get(cacheKey) as PathResult[] | undefined;
    if (cached) return cached;

    const result = await this.storage.findPaths({
      sourceId,
      targetId,
      maxDepth,
    });
    this.cache.set(cacheKey, result);
    return result;
  }

  // ==================== 子图抽取 ====================

  async extractSubgraph(
    centerId: EntityId,
    depth = 2
  ): Promise<{ nodes: OntologyObject[]; links: OntologyLink[] }> {
    const center = await this.storage.getObject(centerId);
    if (!center) return { nodes: [], links: [] };

    const nodeMap = new Map<EntityId, OntologyObject>();
    const linkSet = new Set<LinkId>();
    nodeMap.set(centerId, center);

    let currentLayer = new Set<EntityId>([centerId]);

    for (let d = 0; d < depth; d++) {
      const nextLayer = new Set<EntityId>();
      for (const id of currentLayer) {
        const neighbors = await this.storage.getNeighbors(id, { hopLimit: 1 });
        for (const n of neighbors) {
          if (!nodeMap.has(n.node.id)) {
            nodeMap.set(n.node.id, n.node);
            nextLayer.add(n.node.id);
          }
          for (const link of n.links) {
            linkSet.add(link.id);
          }
        }
      }
      currentLayer = nextLayer;
    }

    const links: OntologyLink[] = [];
    for (const linkId of linkSet) {
      const link = await this.storage.getLink(linkId);
      if (link) links.push(link);
    }

    return { nodes: Array.from(nodeMap.values()), links };
  }

  // ==================== 图数据转换 ====================

  async toGraphData(options?: {
    domainFilter?: string[];
    typeFilter?: string[];
    searchQuery?: string;
  }): Promise<GraphData> {
    const query: ObjectQuery = {
      limit: 10000,
    };
    if (options?.domainFilter?.length) query.domains = options.domainFilter as any;
    if (options?.typeFilter?.length) query.typeIds = options.typeFilter;
    if (options?.searchQuery) query.searchQuery = options.searchQuery;

    const [objectsResult, objectTypes, linkTypes] = await Promise.all([
      this.storage.getObjects(query),
      this.getCachedObjectTypes(),
      this.getCachedLinkTypes(),
    ]);

    const objects = objectsResult.items;

    // 构建类型查找表
    const typeColorMap = new Map<string, string>();
    const typeShapeMap = new Map<string, 'circle' | 'rect' | 'diamond' | 'hexagon'>();
    for (const t of objectTypes) {
      typeColorMap.set(t.id, t.color);
      typeShapeMap.set(t.id, t.shape);
    }

    const linkColorMap = new Map<string, string>();
    const linkStyleMap = new Map<string, 'solid' | 'dashed' | 'dotted' | 'double'>();
    const linkNameMap = new Map<string, string>();
    for (const t of linkTypes) {
      linkColorMap.set(t.id, t.color);
      linkStyleMap.set(t.id, t.style);
      linkNameMap.set(t.id, t.displayName);
    }

    const objectIds = new Set(objects.map((o) => o.id));
    const linksResult = await this.storage.getLinks({});
    const links = linksResult.items.filter(
      (l) => objectIds.has(l.sourceId) && objectIds.has(l.targetId)
    );

    const nodes: GraphNode[] = objects.map((obj) => {
      const color = typeColorMap.get(obj.typeId) || '#64748B';
      const shape = typeShapeMap.get(obj.typeId) || 'circle';

      return {
        id: obj.id,
        typeId: obj.typeId,
        label: obj.displayName,
        domain: obj.domain,
        radius: obj.isAggregate ? 24 : obj.importance * 12 + 4,
        color,
        shape,
        isAggregate: obj.isAggregate,
        importance: obj.importance,
        level: obj.level,
        state: 'default',
        childCount: obj.childIds?.length || 0,
        ontologyObject: obj,
      };
    });

    const graphLinks: GraphLink[] = links.map((link) => {
      const linkColor = linkColorMap.get(link.typeId) || '#94A3B8';
      const linkStyle = linkStyleMap.get(link.typeId) || 'solid';
      const linkLabel = linkNameMap.get(link.typeId) || '';

      return {
        id: link.id,
        typeId: link.typeId,
        semantics: (link as any).semantics || 'association',
        source: link.sourceId,
        target: link.targetId,
        label: linkLabel,
        width: 1.5,
        color: linkColor,
        style: linkStyle,
        directed: true,
        state: 'default',
        ontologyLink: link,
      };
    });

    return { nodes, links: graphLinks };
  }
}
