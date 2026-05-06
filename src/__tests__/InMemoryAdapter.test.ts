/**
 * InMemoryAdapter 单元测试
 *
 * 覆盖核心存储操作：
 * - CRUD（创建/读取/更新/删除）
 * - bulkImport 批量导入
 * - getObjects 查询过滤
 * - getLinks 关联查询
 * - getNeighbors 邻居查询
 * - findPaths BFS 路径查找
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAdapter } from '../storage/InMemoryAdapter';
import type { OntologyObject, OntologyLink } from '../ontology/types';

// ========== 测试数据工厂 ==========

function makeObj(id: string, typeId = 'workshop', domain = '生产制造', importance = 0.8): OntologyObject {
  return {
    id,
    typeId,
    displayName: `节点_${id}`,
    domain: domain as OntologyObject['domain'],
    importance,
    level: 1,
    isAggregate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    properties: { name: id },
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

// ========== 测试套件 ==========

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  // ---------- 基础信息 ----------

  it('应具有正确的 name 和 version', () => {
    expect(adapter.name).toBe('InMemoryAdapter');
    expect(adapter.version).toBe('1.0.0');
    expect(adapter.supportsGraphTraversal).toBe(true);
  });

  // ---------- 生命周期 ----------

  it('initialize 和 close 不抛出错误', async () => {
    await expect(adapter.initialize()).resolves.toBeUndefined();
    await expect(adapter.close()).resolves.toBeUndefined();
  });

  // ---------- 对象 CRUD ----------

  it('createObject：创建后可以 getObject 取到', async () => {
    const obj = makeObj('o1');
    await adapter.createObject(obj);
    const got = await adapter.getObject('o1');
    expect(got).not.toBeNull();
    expect(got?.id).toBe('o1');
    expect(got?.displayName).toBe('节点_o1');
  });

  it('getObject：不存在的 id 返回 null', async () => {
    const got = await adapter.getObject('nonexistent');
    expect(got).toBeNull();
  });

  it('updateObject：能更新 properties', async () => {
    const obj = makeObj('o2');
    await adapter.createObject(obj);
    const updated = await adapter.updateObject('o2', { updatedProp: 'new-value' });
    expect(updated.properties['updatedProp']).toBe('new-value');
    // 原有属性保留
    expect(updated.properties['name']).toBe('o2');
  });

  it('updateObject：更新不存在的对象抛出错误', async () => {
    await expect(adapter.updateObject('no_such', { x: 1 })).rejects.toThrow();
  });

  it('deleteObject：删除后 getObject 返回 null', async () => {
    await adapter.createObject(makeObj('o3'));
    await adapter.deleteObject('o3');
    expect(await adapter.getObject('o3')).toBeNull();
  });

  it('deleteObject：删除节点时清理其关联链接', async () => {
    await adapter.createObject(makeObj('a'));
    await adapter.createObject(makeObj('b'));
    await adapter.createLink(makeLink('lab', 'a', 'b'));

    await adapter.deleteObject('a');

    const linksResult = await adapter.getLinks({});
    expect(linksResult.items.find(l => l.id === 'lab')).toBeUndefined();
  });

  // ---------- 链接 CRUD ----------

  it('createLink 和 deleteLink', async () => {
    await adapter.createObject(makeObj('x'));
    await adapter.createObject(makeObj('y'));
    await adapter.createLink(makeLink('l1', 'x', 'y'));

    const linksResult = await adapter.getLinks({});
    expect(linksResult.items.some(l => l.id === 'l1')).toBe(true);

    await adapter.deleteLink('l1');
    const afterDelete = await adapter.getLinks({});
    expect(afterDelete.items.find(l => l.id === 'l1')).toBeUndefined();
  });

  // ---------- bulkImport ----------

  it('bulkImport：返回正确的导入计数', async () => {
    const objs = [makeObj('b1'), makeObj('b2'), makeObj('b3')];
    const links = [makeLink('bl1', 'b1', 'b2'), makeLink('bl2', 'b2', 'b3')];
    const result = await adapter.bulkImport(objs, links);
    expect(result.objects).toBe(3);
    expect(result.links).toBe(2);
  });

  it('bulkImport：导入后可以通过 getObjects 查询', async () => {
    await adapter.bulkImport([makeObj('c1', 'bizSystem'), makeObj('c2', 'workshop')], []);
    const res = await adapter.getObjects({ typeIds: ['bizSystem'], limit: 100 });
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('c1');
  });

  // ---------- getObjects 查询 ----------

  it('getObjects：按 domain 过滤', async () => {
    await adapter.bulkImport([
      makeObj('d1', 'workshop', '生产制造'),
      makeObj('d2', 'designer', '研发设计'),
    ], []);
    const res = await adapter.getObjects({ domains: ['研发设计' as OntologyObject['domain']], limit: 100 });
    expect(res.items.length).toBe(1);
    expect(res.items[0].domain).toBe('研发设计');
  });

  it('getObjects：按 searchQuery 全文搜索', async () => {
    await adapter.bulkImport([
      makeObj('s1', 'workshop', '生产制造'),
      makeObj('s2', 'designer', '研发设计'),
    ], []);
    const res = await adapter.getObjects({ searchQuery: '节点_s1', limit: 100 });
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('s1');
  });

  it('getObjects：按 importanceMin 过滤', async () => {
    await adapter.bulkImport([
      makeObj('i1', 'workshop', '生产制造', 0.9),
      makeObj('i2', 'workshop', '生产制造', 0.3),
    ], []);
    const res = await adapter.getObjects({ importanceMin: 0.5, limit: 100 });
    expect(res.items.every(o => o.importance >= 0.5)).toBe(true);
  });

  it('getObjects：includeAggregates=false 排除聚合节点', async () => {
    const agg: OntologyObject = { ...makeObj('agg1'), isAggregate: true };
    await adapter.bulkImport([agg, makeObj('reg1')], []);
    const res = await adapter.getObjects({ includeAggregates: false, limit: 100 });
    expect(res.items.find(o => o.id === 'agg1')).toBeUndefined();
    expect(res.items.find(o => o.id === 'reg1')).toBeDefined();
  });

  it('getObjects：offset + limit 分页', async () => {
    const objs = Array.from({ length: 10 }, (_, i) => makeObj(`p${i}`));
    await adapter.bulkImport(objs, []);
    const page1 = await adapter.getObjects({ offset: 0, limit: 4 });
    const page2 = await adapter.getObjects({ offset: 4, limit: 4 });
    expect(page1.items.length).toBe(4);
    expect(page2.items.length).toBe(4);
    expect(page1.total).toBe(10);
  });

  // ---------- getLinks 查询 ----------

  it('getLinks：按 sourceId 过滤', async () => {
    await adapter.bulkImport([makeObj('src'), makeObj('tgt1'), makeObj('tgt2')], [
      makeLink('l-s1', 'src', 'tgt1'),
      makeLink('l-s2', 'tgt1', 'tgt2'),
    ]);
    const res = await adapter.getLinks({ sourceId: 'src' });
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('l-s1');
  });

  it('getLinks：按 relatedToNodeId 过滤（双向）', async () => {
    await adapter.bulkImport([makeObj('n1'), makeObj('n2'), makeObj('n3')], [
      makeLink('la', 'n1', 'n2'),
      makeLink('lb', 'n2', 'n3'),
    ]);
    const res = await adapter.getLinks({ relatedToNodeId: 'n2' });
    expect(res.items.length).toBe(2);
  });

  // ---------- getNeighbors 邻居查询 ----------

  it('getNeighbors：1 跳邻居查询（双向）', async () => {
    //   A → B → C
    await adapter.bulkImport([makeObj('A'), makeObj('B'), makeObj('C')], [
      makeLink('AB', 'A', 'B'),
      makeLink('BC', 'B', 'C'),
    ]);
    const neighbors = await adapter.getNeighbors('B', { hopLimit: 1 });
    const ids = neighbors.map(n => n.node.id).sort();
    expect(ids).toEqual(['A', 'C'].sort());
  });

  it('getNeighbors：direction=outgoing 只返回出边邻居', async () => {
    await adapter.bulkImport([makeObj('A'), makeObj('B'), makeObj('C')], [
      makeLink('AB', 'A', 'B'),
      makeLink('CA', 'C', 'A'),
    ]);
    const neighbors = await adapter.getNeighbors('A', { hopLimit: 1, direction: 'outgoing' });
    const ids = neighbors.map(n => n.node.id);
    expect(ids).toContain('B');
    expect(ids).not.toContain('C');
  });

  it('getNeighbors：2 跳邻居查询', async () => {
    //  A → B → C → D
    await adapter.bulkImport([makeObj('A'), makeObj('B'), makeObj('C'), makeObj('D')], [
      makeLink('AB', 'A', 'B'),
      makeLink('BC', 'B', 'C'),
      makeLink('CD', 'C', 'D'),
    ]);
    const neighbors = await adapter.getNeighbors('A', { hopLimit: 2, direction: 'outgoing' });
    const ids = neighbors.map(n => n.node.id);
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).not.toContain('D'); // 超出 hopLimit
  });

  it('getNeighbors：孤立节点返回空数组', async () => {
    await adapter.createObject(makeObj('lone'));
    const neighbors = await adapter.getNeighbors('lone', { hopLimit: 1 });
    expect(neighbors).toHaveLength(0);
  });

  // ---------- findPaths BFS ----------

  it('findPaths：找到最短路径', async () => {
    //  A → B → C
    await adapter.bulkImport([makeObj('A'), makeObj('B'), makeObj('C')], [
      makeLink('AB', 'A', 'B'),
      makeLink('BC', 'B', 'C'),
    ]);
    const paths = await adapter.findPaths({ sourceId: 'A', targetId: 'C', maxDepth: 5 });
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
    expect(paths[0].totalCost).toBe(2);
  });

  it('findPaths：不可达时返回空数组', async () => {
    await adapter.bulkImport([makeObj('A'), makeObj('Z')], []);
    const paths = await adapter.findPaths({ sourceId: 'A', targetId: 'Z', maxDepth: 3 });
    expect(paths).toHaveLength(0);
  });

  it('findPaths：相同源/目标返回空数组', async () => {
    await adapter.createObject(makeObj('A'));
    const paths = await adapter.findPaths({ sourceId: 'A', targetId: 'A', maxDepth: 3 });
    expect(paths).toHaveLength(0);
  });

  // ---------- aggregateCounts ----------

  it('aggregateCounts：按类型统计', async () => {
    await adapter.bulkImport([
      makeObj('t1', 'workshop'),
      makeObj('t2', 'workshop'),
      makeObj('t3', 'bizSystem'),
    ], []);
    const counts = await adapter.aggregateCounts({ byType: true });
    expect(counts['type:workshop']).toBe(2);
    expect(counts['type:bizSystem']).toBe(1);
  });

  it('aggregateCounts：按 domain 统计', async () => {
    await adapter.bulkImport([
      makeObj('d1', 'workshop', '生产制造'),
      makeObj('d2', 'workshop', '生产制造'),
      makeObj('d3', 'designer', '研发设计'),
    ], []);
    const counts = await adapter.aggregateCounts({ byDomain: true });
    expect(counts['domain:生产制造']).toBe(2);
    expect(counts['domain:研发设计']).toBe(1);
  });

  // ---------- 本体类型注册 ----------

  it('registerObjectTypes 和 getObjectTypes', async () => {
    const types = [
      { id: 'workshop', displayName: '车间', color: '#3B82F6', shape: 'circle' as const, category: 'core' as const },
    ];
    adapter.registerObjectTypes(types as never);
    const got = await adapter.getObjectTypes();
    expect(got.length).toBe(1);
    expect(got[0].id).toBe('workshop');
  });
});
