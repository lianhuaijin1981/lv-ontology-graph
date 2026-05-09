/**
 * useGraphData - 图谱数据加载与刷新 Hook
 * 从 App.tsx 中提取的数据初始化与筛选刷新逻辑
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InMemoryAdapter } from '@/storage/InMemoryAdapter';
import { QueryEngine } from '@/graph/QueryEngine';
import {
  shoeFactoryObjectTypes,
  shoeFactoryLinkTypes,
  shoeFactoryActionTypes,
} from '@/ontology/ShoeFactoryOntology';
import {
  globalOntologyRegistry,
  OntologyRegistryImpl,
} from '@/ontology/Ontology';
import { allEntities, allLinks } from '@/data';
import { MAIN_PRODUCTION_CHAIN, ORDER_CHAIN, COST_CHAIN } from '@/data/businessSemantic';
import type { FilterState, EntityId } from '@/types';
import type { GraphData, GraphNode, GraphLink, GraphMode } from '@/graph/types';

interface UseGraphDataReturn {
  queryEngine: QueryEngine | null;
  graphData: GraphData;
  isLoading: boolean;
  registryRef: React.MutableRefObject<OntologyRegistryImpl>;
  engineRef: React.MutableRefObject<QueryEngine | null>;
}

export function useGraphData(filters: FilterState, viewMode: 'map' | 'full'): UseGraphDataReturn {
  const [queryEngine, setQueryEngine] = useState<QueryEngine | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);

  const registryRef = useRef(new OntologyRegistryImpl());
  const engineRef = useRef<QueryEngine | null>(null);

  // ==================== 初始化 ====================
  useEffect(() => {
    const init = async () => {
      try {
        const registry = registryRef.current;

        for (const ot of shoeFactoryObjectTypes) {
          registry.registerObjectType(ot);
          globalOntologyRegistry.registerObjectType(ot);
        }
        for (const lt of shoeFactoryLinkTypes) {
          registry.registerLinkType(lt);
          globalOntologyRegistry.registerLinkType(lt);
        }
        for (const at of shoeFactoryActionTypes) {
          registry.registerActionType(at);
          globalOntologyRegistry.registerActionType(at);
        }

        const memAdapter = new InMemoryAdapter();
        memAdapter.registerObjectTypes(shoeFactoryObjectTypes);
        memAdapter.registerLinkTypes(shoeFactoryLinkTypes);
        memAdapter.registerActionTypes(shoeFactoryActionTypes);
        await memAdapter.initialize();
        await memAdapter.bulkImport(allEntities, allLinks);

        const engine = new QueryEngine(memAdapter);
        engineRef.current = engine;
        setQueryEngine(engine);
        setIsLoading(false);
      } catch (err) {
        console.error('Init failed:', err);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ==================== 图谱数据刷新 ====================
  useEffect(() => {
    if (!engineRef.current) return;

    const refresh = async () => {
      try {
        const data = await engineRef.current!.toGraphData({
          domainFilter: filters.domains.length > 0 ? filters.domains : undefined,
          typeFilter: filters.objectTypes.length > 0 ? filters.objectTypes : undefined,
          searchQuery: filters.searchQuery || undefined,
        });

        let nodes = data.nodes;
        if (filters.importanceMin > 0) {
          nodes = nodes.filter((n) => n.importance >= filters.importanceMin);
        }

        const nodeIds = new Set(nodes.map((n) => n.id));
        const links = data.links.filter((l) => {
          const sid = typeof l.source === 'string' ? l.source : l.source.id;
          const tid = typeof l.target === 'string' ? l.target : l.target.id;
          return nodeIds.has(sid) && nodeIds.has(tid);
        });

        setGraphData({ nodes, links });
      } catch (err) {
        console.error('Refresh graph data failed:', err);
      }
    };

    refresh();
  }, [queryEngine, filters]);

  // ==================== 视图模式过滤 ====================
  const filteredGraphData = useMemo(() => {
    if (viewMode === 'full' || graphData.nodes.length === 0) return graphData;
    const coreIds = new Set([...MAIN_PRODUCTION_CHAIN, ...ORDER_CHAIN, ...COST_CHAIN]);
    const filteredNodes = graphData.nodes.filter((n: GraphNode) => coreIds.has(n.id));
    const nodeIds = new Set(filteredNodes.map((n: GraphNode) => n.id));
    const filteredLinks = graphData.links.filter((l: GraphLink) => {
      const sid = typeof l.source === 'string' ? l.source : l.source.id;
      const tid = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(sid) && nodeIds.has(tid);
    });
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, viewMode]);

  return {
    queryEngine,
    graphData: filteredGraphData,
    isLoading,
    registryRef,
    engineRef,
  };
}
