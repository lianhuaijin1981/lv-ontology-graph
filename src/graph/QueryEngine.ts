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
} from '@/ontology/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';

export class QueryEngine {
  private cache = new Map<string, unknown>();
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  clearCache(): void {
    this.cache.clear();
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

    const objectsResult = await this.storage.getObjects(query);
    const objects = objectsResult.items;

    const objectIds = new Set(objects.map((o) => o.id));
    const linksResult = await this.storage.getLinks({});
    const links = linksResult.items.filter(
      (l) => objectIds.has(l.sourceId) && objectIds.has(l.targetId)
    );

    const typeColors: Record<string, string> = {};
    const typeShapes: Record<string, 'circle' | 'rect' | 'diamond' | 'hexagon'> = {};

    const nodes: GraphNode[] = objects.map((obj) => {
      if (!typeColors[obj.typeId]) {
        // 延迟获取类型颜色
        const type = (this.storage as any).objectTypes?.find?.((t: any) => t.id === obj.typeId);
        typeColors[obj.typeId] = type?.color || '#64748B';
        typeShapes[obj.typeId] = type?.shape || 'circle';
      }

      return {
        id: obj.id,
        typeId: obj.typeId,
        label: obj.displayName,
        domain: obj.domain,
        radius: obj.isAggregate ? 24 : obj.importance * 12 + 4,
        color: typeColors[obj.typeId] || '#64748B',
        shape: typeShapes[obj.typeId] || 'circle',
        isAggregate: obj.isAggregate,
        importance: obj.importance,
        level: obj.level,
        state: 'default',
        childCount: obj.childIds?.length || 0,
        ontologyObject: obj,
      };
    });

    const linkStyles: Record<string, { color: string; style: 'solid' | 'dashed' | 'dotted' | 'double' }> = {};

    const graphLinks: GraphLink[] = links.map((link) => {
      if (!linkStyles[link.typeId]) {
        const type = (this.storage as any).linkTypes?.find?.((t: any) => t.id === link.typeId);
        linkStyles[link.typeId] = {
          color: type?.color || '#94A3B8',
          style: type?.style || 'solid',
        };
      }

      return {
        id: link.id,
        typeId: link.typeId,
        semantics: (link as any).semantics || 'association',
        source: link.sourceId,
        target: link.targetId,
        label: (this.storage as any).linkTypes?.find?.((t: any) => t.id === link.typeId)?.displayName || '',
        width: 1.5,
        color: linkStyles[link.typeId]?.color || '#94A3B8',
        style: linkStyles[link.typeId]?.style || 'solid',
        directed: true,
        state: 'default',
        ontologyLink: link,
      };
    });

    return { nodes, links: graphLinks };
  }
}
