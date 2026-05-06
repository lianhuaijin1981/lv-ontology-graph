/**
 * QueryEngine 单元测试
 *
 * 覆盖：
 * - 基础查询（getObject / getObjectsByType / getObjectsByDomain）
 * - 邻居查询（getNeighbors + 缓存）
 * - 路径查询（findPaths）
 * - 子图抽取（extractSubgraph）
 * - 图数据转换（toGraphData + 筛选/搜索）
 * - 缓存行为（clearCache）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryEngine } from '../graph/QueryEngine';
import { InMemoryAdapter } from '../storage/InMemoryAdapter';
import type { OntologyObject, OntologyLink, ObjectType, LinkType } from '../ontology/types';

// ========== 测试数据工厂 ==========

function makeObj(
  id: string,
  typeId = 'workshop',
  domain: OntologyObject['domain'] = '生产制造',
  importance = 0.8
): OntologyObject {
  return {
    id,
    typeId,
    displayName: `${id}_显示名`,
    domain,
    importance,
    level: 1,
    isAggregate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    properties: { tag: id },
  };
}

function makeLink(id: string, sourceId: string, targetId: string, typeId = 'precedes'): OntologyLink {
  return {
    id,
    typeId,
    sourceId,
    targetId,
    semantics: 'precedence',
    properties: {},
  };
}

const OBJECT_TYPES = [
  { id: 'workshop', displayName: '车间', color: '#3B82F6', shape: 'circle', category: 'core' },
  { id: 'bizSystem', displayName: '系统', color: '#7C3AED', shape: 'rect', category: 'core' },
] as unknown as ObjectType[];

const LINK_TYPES = [
  { id: 'precedes', displayName: '前置', color: '#3B82F6', style: 'solid', directionality: 'directed' },
  { id: 'supports', displayName: '支撑', color: '#8B5CF6', style: 'dashed', directionality: 'directed' },
] as unknown as LinkType[];

// ========== 基础 Setup ==========

async function buildEngine(
  objs: OntologyObject[] = [],
  links: OntologyLink[] = []
): Promise<QueryEngine> {
  const adapter = new InMemoryAdapter();
  adapter.registerObjectTypes(OBJECT_TYPES);
  adapter.registerLinkTypes(LINK_TYPES);
  await adapter.initialize();
  await adapter.bulkImport(objs, links);
  return new QueryEngine(adapter);
}

// ========== 测试套件 ==========

describe('QueryEngine', () => {
  // ---------- 基础查询 ----------

  describe('getObject', () => {
    it('返回存在的对象', async () => {
      const engine = await buildEngine([makeObj('A')], []);
      const obj = await engine.getObject('A');
      expect(obj).not.toBeNull();
      expect(obj?.id).toBe('A');
    });

    it('不存在时返回 null', async () => {
      const engine = await buildEngine([], []);
      const obj = await engine.getObject('nonexistent');
      expect(obj).toBeNull();
    });
  });

  describe('getObjectsByType', () => {
    it('按类型过滤', async () => {
      const engine = await buildEngine([
        makeObj('w1', 'workshop'),
        makeObj('s1', 'bizSystem'),
        makeObj('w2', 'workshop'),
      ], []);
      const workshops = await engine.getObjectsByType('workshop');
      expect(workshops.length).toBe(2);
      expect(workshops.every(o => o.typeId === 'workshop')).toBe(true);
    });

    it('不存在的类型返回空数组', async () => {
      const engine = await buildEngine([makeObj('w1')], []);
      const result = await engine.getObjectsByType('nonexistent_type');
      expect(result).toHaveLength(0);
    });
  });

  describe('getObjectsByDomain', () => {
    it('按域过滤', async () => {
      const engine = await buildEngine([
        makeObj('a', 'workshop', '生产制造'),
        makeObj('b', 'designer', '研发设计'),
      ], []);
      const mfg = await engine.getObjectsByDomain('生产制造');
      expect(mfg.length).toBe(1);
      expect(mfg[0].id).toBe('a');
    });
  });

  // ---------- 邻居查询 ----------

  describe('getNeighbors', () => {
    it('1 跳邻居查询', async () => {
      const engine = await buildEngine(
        [makeObj('A'), makeObj('B'), makeObj('C')],
        [makeLink('AB', 'A', 'B'), makeLink('BC', 'B', 'C')]
      );
      const neighbors = await engine.getNeighbors('B', 1);
      const ids = neighbors.map(n => n.node.id).sort();
      expect(ids).toEqual(['A', 'C']);
    });

    it('结果被缓存，第二次调用不重复执行', async () => {
      const adapter = new InMemoryAdapter();
      adapter.registerObjectTypes(OBJECT_TYPES);
      adapter.registerLinkTypes(LINK_TYPES);
      await adapter.initialize();
      await adapter.bulkImport([makeObj('A'), makeObj('B')], [makeLink('AB', 'A', 'B')]);

      const getNeighborsSpy = vi.spyOn(adapter, 'getNeighbors');
      const engine = new QueryEngine(adapter);

      await engine.getNeighbors('A', 1);
      await engine.getNeighbors('A', 1); // 第二次应走缓存

      expect(getNeighborsSpy).toHaveBeenCalledTimes(1);
    });

    it('clearCache 后不使用旧缓存', async () => {
      const adapter = new InMemoryAdapter();
      adapter.registerObjectTypes(OBJECT_TYPES);
      adapter.registerLinkTypes(LINK_TYPES);
      await adapter.initialize();
      await adapter.bulkImport([makeObj('A'), makeObj('B')], [makeLink('AB', 'A', 'B')]);

      const getNeighborsSpy = vi.spyOn(adapter, 'getNeighbors');
      const engine = new QueryEngine(adapter);

      await engine.getNeighbors('A', 1);
      engine.clearCache();
      await engine.getNeighbors('A', 1); // 缓存已清，重新查询

      expect(getNeighborsSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ---------- 路径查询 ----------

  describe('findPaths', () => {
    it('找到 A→B→C 最短路径', async () => {
      const engine = await buildEngine(
        [makeObj('A'), makeObj('B'), makeObj('C')],
        [makeLink('AB', 'A', 'B'), makeLink('BC', 'B', 'C')]
      );
      const paths = await engine.findPaths('A', 'C', 5);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].nodes.map(n => n.id)).toContain('B');
    });

    it('不可达时返回空数组', async () => {
      const engine = await buildEngine([makeObj('A'), makeObj('Z')], []);
      const paths = await engine.findPaths('A', 'Z', 3);
      expect(paths).toHaveLength(0);
    });

    it('路径查询结果被缓存', async () => {
      const adapter = new InMemoryAdapter();
      adapter.registerObjectTypes(OBJECT_TYPES);
      adapter.registerLinkTypes(LINK_TYPES);
      await adapter.initialize();
      await adapter.bulkImport(
        [makeObj('A'), makeObj('B'), makeObj('C')],
        [makeLink('AB', 'A', 'B'), makeLink('BC', 'B', 'C')]
      );

      const findPathsSpy = vi.spyOn(adapter, 'findPaths');
      const engine = new QueryEngine(adapter);

      await engine.findPaths('A', 'C', 5);
      await engine.findPaths('A', 'C', 5);

      expect(findPathsSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------- 子图抽取 ----------

  describe('extractSubgraph', () => {
    it('从中心节点抽取 1 跳子图', async () => {
      const engine = await buildEngine(
        [makeObj('center'), makeObj('n1'), makeObj('n2'), makeObj('n3')],
        [
          makeLink('l1', 'center', 'n1'),
          makeLink('l2', 'center', 'n2'),
          makeLink('l3', 'n2', 'n3'),
        ]
      );
      const { nodes, links } = await engine.extractSubgraph('center', 1);
      const nodeIds = nodes.map(n => n.id);
      expect(nodeIds).toContain('center');
      expect(nodeIds).toContain('n1');
      expect(nodeIds).toContain('n2');
      expect(nodeIds).not.toContain('n3'); // 超出 depth=1
      expect(links.length).toBeGreaterThan(0);
    });

    it('不存在的节点返回空结果', async () => {
      const engine = await buildEngine([], []);
      const result = await engine.extractSubgraph('nonexistent', 2);
      expect(result.nodes).toHaveLength(0);
      expect(result.links).toHaveLength(0);
    });

    it('抽取 depth=2 时包含两跳节点', async () => {
      const engine = await buildEngine(
        [makeObj('A'), makeObj('B'), makeObj('C'), makeObj('D')],
        [
          makeLink('AB', 'A', 'B'),
          makeLink('BC', 'B', 'C'),
          makeLink('CD', 'C', 'D'),
        ]
      );
      const { nodes } = await engine.extractSubgraph('A', 2);
      const nodeIds = nodes.map(n => n.id);
      expect(nodeIds).toContain('A');
      expect(nodeIds).toContain('B');
      expect(nodeIds).toContain('C');
      expect(nodeIds).not.toContain('D'); // depth=2 只到 C
    });
  });

  // ---------- 图数据转换 ----------

  describe('toGraphData', () => {
    let engine: QueryEngine;

    beforeEach(async () => {
      engine = await buildEngine(
        [
          makeObj('w1', 'workshop', '生产制造', 0.9),
          makeObj('s1', 'bizSystem', '业务系统支撑', 0.85),
          makeObj('w2', 'workshop', '生产制造', 0.6),
        ],
        [makeLink('l1', 'w1', 'w2'), makeLink('l2', 's1', 'w1')]
      );
    });

    it('无过滤时返回全部节点和边', async () => {
      const graph = await engine.toGraphData();
      expect(graph.nodes.length).toBe(3);
      expect(graph.links.length).toBe(2);
    });

    it('按 domainFilter 过滤节点', async () => {
      const graph = await engine.toGraphData({ domainFilter: ['生产制造'] });
      expect(graph.nodes.every(n => n.domain === '生产制造')).toBe(true);
    });

    it('按 typeFilter 过滤节点', async () => {
      const graph = await engine.toGraphData({ typeFilter: ['bizSystem'] });
      expect(graph.nodes.length).toBe(1);
      expect(graph.nodes[0].typeId).toBe('bizSystem');
    });

    it('searchQuery 过滤出匹配节点', async () => {
      const graph = await engine.toGraphData({ searchQuery: 'w1_显示名' });
      expect(graph.nodes.some(n => n.id === 'w1')).toBe(true);
    });

    it('节点 radius 与 importance 成比例', async () => {
      const graph = await engine.toGraphData();
      const w1 = graph.nodes.find(n => n.id === 'w1')!;
      const w2 = graph.nodes.find(n => n.id === 'w2')!;
      // importance 越高，radius 应越大
      expect(w1.radius).toBeGreaterThan(w2.radius);
    });

    it('edges 使用链接类型颜色', async () => {
      const graph = await engine.toGraphData();
      expect(graph.links.length).toBeGreaterThan(0);
      // 所有 link 有 color 字段
      expect(graph.links.every(l => typeof l.color === 'string')).toBe(true);
    });

    it('domainFilter 过滤后 links 中的节点一致', async () => {
      const graph = await engine.toGraphData({ domainFilter: ['生产制造'] });
      const nodeIds = new Set(graph.nodes.map(n => n.id));
      for (const link of graph.links) {
        const srcId = typeof link.source === 'string' ? link.source : link.source.id;
        const tgtId = typeof link.target === 'string' ? link.target : link.target.id;
        expect(nodeIds.has(srcId)).toBe(true);
        expect(nodeIds.has(tgtId)).toBe(true);
      }
    });
  });
});
