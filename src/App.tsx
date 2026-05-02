/**
 * App.tsx - 女鞋总厂知识图谱主入口
 * 
 * 架构层级：
 * App (状态管理) → GraphCanvas (D3渲染) + ObjectExplorer (详情面板) + FilterPanel (筛选) + ViewSwitcher (导航)
 * 
 * 数据流：
 * 1. App 初始化 StorageAdapter + QueryEngine
 * 2. 用户操作 → 状态更新 → 筛选/查询 → GraphData 生成 → GraphCanvas 重新渲染
 * 3. 节点点击 → ObjectExplorer 展示详情
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GraphCanvas } from '@/components/GraphCanvas';
import { ObjectExplorer } from '@/components/ObjectExplorer';
import { FilterPanel } from '@/components/FilterPanel';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { InMemoryAdapter } from '@/storage/InMemoryAdapter';
import { QueryEngine } from '@/graph/QueryEngine';
import type { StorageAdapter } from '@/storage/types';
import type { EntityId, BusinessDomain, FilterState } from '@/types';
import type { GraphMode } from '@/graph/types';
import type { OntologyObject, OntologyLink } from '@/ontology/types';
import { globalOntologyRegistry, OntologyRegistryImpl } from '@/ontology/Ontology';
import {
  shoeFactoryObjectTypes,
  shoeFactoryLinkTypes,
  shoeFactoryActionTypes,
} from '@/ontology/ShoeFactoryOntology';
import { allEntities, allLinks } from '@/data/shoeFactoryData';
import './App.css';

export default function App() {
  const [, setAdapter] = useState<StorageAdapter | null>(null);
  const [queryEngine, setQueryEngine] = useState<QueryEngine | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<EntityId | undefined>(undefined);
  const [mode, setMode] = useState<GraphMode>('map');
  const [breadcrumb, setBreadcrumb] = useState<EntityId[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);

  // 筛选状态
  const [filters, setFilters] = useState<FilterState>({
    domains: [],
    objectTypes: [],
    searchQuery: '',
    importanceMin: 0,
  });

  const registryRef = useRef(new OntologyRegistryImpl());

  // ==================== 初始化 ====================

  useEffect(() => {
    const init = async () => {
      const registry = registryRef.current;

      // 注册本体定义
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

      // 初始化存储适配器
      const memAdapter = new InMemoryAdapter();
      memAdapter.registerObjectTypes(shoeFactoryObjectTypes);
      memAdapter.registerLinkTypes(shoeFactoryLinkTypes);
      memAdapter.registerActionTypes(shoeFactoryActionTypes);
      await memAdapter.initialize();
      await memAdapter.bulkImport(allEntities, allLinks);

      // 初始化查询引擎
      const engine = new QueryEngine(memAdapter);

      setAdapter(memAdapter);
      setQueryEngine(engine);
      setIsLoading(false);
    };

    init();
  }, []);

  // ==================== 图谱数据生成 ====================

  const refreshGraphData = useCallback(async () => {
    if (!queryEngine) return;

    const data = await queryEngine.toGraphData({
      domainFilter: filters.domains.length > 0 ? filters.domains : undefined,
      typeFilter: filters.objectTypes.length > 0 ? filters.objectTypes : undefined,
      searchQuery: filters.searchQuery || undefined,
    });

    // 重要性过滤
    let nodes = data.nodes;
    if (filters.importanceMin > 0) {
      nodes = nodes.filter((n) => n.importance >= filters.importanceMin);
    }

    // 筛选后重新过滤链接
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = data.links.filter(
      (l) => nodeIds.has(typeof l.source === 'string' ? l.source : l.source.id) &&
             nodeIds.has(typeof l.target === 'string' ? l.target : l.target.id)
    );

    setGraphData({ nodes, links });
  }, [queryEngine, filters]);

  useEffect(() => {
    refreshGraphData();
  }, [refreshGraphData]);

  // ==================== 筛选操作 ====================

  const toggleDomain = useCallback((domain: BusinessDomain) => {
    setFilters((prev) => {
      const exists = prev.domains.includes(domain);
      return {
        ...prev,
        domains: exists ? prev.domains.filter((d) => d !== domain) : [...prev.domains, domain],
      };
    });
  }, []);

  const toggleType = useCallback((typeId: string) => {
    setFilters((prev) => {
      const exists = prev.objectTypes.includes(typeId);
      return {
        ...prev,
        objectTypes: exists
          ? prev.objectTypes.filter((t) => t !== typeId)
          : [...prev.objectTypes, typeId],
      };
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setImportanceMin = useCallback((value: number) => {
    setFilters((prev) => ({ ...prev, importanceMin: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ domains: [], objectTypes: [], searchQuery: '', importanceMin: 0 });
  }, []);

  // ==================== 节点交互 ====================

  const handleNodeClick = useCallback(
    async (nodeId: EntityId) => {
      setSelectedNodeId(nodeId);
      setMode('investigate');
      setBreadcrumb((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));

      // 如果搜索模式，清除搜索
      if (mode === 'search') {
        setFilters((prev) => ({ ...prev, searchQuery: '' }));
      }
    },
    [mode]
  );

  const handleNodeHover = useCallback((_nodeId: EntityId | null) => {
    // hover state removed for now
  }, []);

  const handleNavigateToEntity = useCallback(
    async (id: EntityId) => {
      setSelectedNodeId(id);
      setMode('breadcrumb');
      setBreadcrumb((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    []
  );

  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumb((prev) => {
      const newPath = prev.slice(0, index + 1);
      setSelectedNodeId(newPath[index]);
      return newPath;
    });
  }, []);

  const handleModeChange = useCallback((newMode: GraphMode) => {
    setMode(newMode);
    if (newMode === 'map') {
      setSelectedNodeId(undefined);
    }
  }, []);

  const handleAction = useCallback((actionId: string, entityId: EntityId) => {
    console.log(`Action ${actionId} on ${entityId}`);
    // TODO: 实现具体动作
  }, []);

  // ==================== 辅助函数 ====================

  const getObject = useCallback(
    (id: EntityId): OntologyObject | undefined => {
      return allEntities.find((e) => e.id === id);
    },
    []
  );

  const getLinksForObject = useCallback(
    (id: EntityId): OntologyLink[] => {
      return allLinks.filter((l) => l.sourceId === id || l.targetId === id);
    },
    []
  );

  const breadcrumbLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const id of breadcrumb) {
      const obj = allEntities.find((e) => e.id === id);
      if (obj) labels[id] = obj.displayName;
    }
    return labels;
  }, [breadcrumb]);

  const objectTypeOptions = useMemo(() => {
    return shoeFactoryObjectTypes.map((t) => ({
      id: t.id,
      label: t.displayName,
      color: t.color,
    }));
  }, []);

  // ==================== 渲染 ====================

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">加载知识图谱...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      {/* 主画布区域 */}
      <div className="flex-1 relative">
        <GraphCanvas
          data={graphData}
          width={typeof window !== 'undefined' ? window.innerWidth - (selectedNodeId ? 320 : 0) : 1200}
          height={typeof window !== 'undefined' ? window.innerHeight : 800}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          selectedNodeId={selectedNodeId}
        />

        {/* 筛选面板 */}
        <FilterPanel
          domains={Object.values(filters.domains)}
          selectedDomains={filters.domains}
          onDomainToggle={toggleDomain}
          searchQuery={filters.searchQuery}
          onSearchChange={setSearchQuery}
          importanceMin={filters.importanceMin}
          onImportanceChange={setImportanceMin}
          objectTypeOptions={objectTypeOptions}
          selectedTypes={filters.objectTypes}
          onTypeToggle={toggleType}
          onReset={resetFilters}
        />

        {/* 视图切换 */}
        <ViewSwitcher
          mode={mode}
          onModeChange={handleModeChange}
          breadcrumb={breadcrumb}
          breadcrumbLabels={breadcrumbLabels}
          onBreadcrumbClick={handleBreadcrumbClick}
          onFitView={() => {}}
          onResetView={() => {}}
        />

        {/* 底部统计 */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">
              节点 <span className="text-slate-200 font-medium">{graphData.nodes.length}</span>
            </span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">
              关系 <span className="text-slate-200 font-medium">{graphData.links.length}</span>
            </span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <span className="text-xs text-slate-500">
            实体池 {allEntities.length}
          </span>
        </div>
      </div>

      {/* 右侧对象浏览器 */}
      {selectedNodeId && (
        <ObjectExplorer
          entityId={selectedNodeId}
          getObject={getObject}
          getLinksForObject={getLinksForObject}
          getObjectType={(id) => registryRef.current.getObjectType(id)}
          getLinkType={(id) => registryRef.current.getLinkType(id)}
          getActionTypesForObject={(typeId) => registryRef.current.listActionTypesForObject(typeId)}
          onNavigateToEntity={handleNavigateToEntity}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
