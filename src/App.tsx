/**
 * App.tsx - 女鞋总厂知识图谱主入口
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { G6GraphCanvas } from '@/components/G6GraphCanvas';
import { ObjectExplorer } from '@/components/ObjectExplorer';
import { FilterPanel } from '@/components/FilterPanel';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { InMemoryAdapter } from '@/storage/InMemoryAdapter';
import { QueryEngine } from '@/graph/QueryEngine';
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
  const [queryEngine, setQueryEngine] = useState<QueryEngine | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<EntityId | undefined>(undefined);
  const [mode, setMode] = useState<GraphMode>('map');
  const [breadcrumb, setBreadcrumb] = useState<EntityId[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<EntityId[]>([]);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

  const canvasWidth = Math.max(windowSize.width - (selectedNodeId ? 320 : 0), 400);
  const canvasHeight = Math.max(windowSize.height, 400);

  const [filters, setFilters] = useState<FilterState>({
    domains: [],
    objectTypes: [],
    searchQuery: '',
    importanceMin: 0,
  });

  const registryRef = useRef(new OntologyRegistryImpl());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engineRef = useRef<QueryEngine | null>(null);

  // ==================== 窗口尺寸 ====================
  useEffect(() => {
    const update = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

  // ==================== 图谱数据生成 ====================
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
        const links = data.links.filter(
          (l) => {
            const sid = typeof l.source === 'string' ? l.source : l.source.id;
            const tid = typeof l.target === 'string' ? l.target : l.target.id;
            return nodeIds.has(sid) && nodeIds.has(tid);
          }
        );

        setGraphData({ nodes, links });
      } catch (err) {
        console.error('Refresh graph data failed:', err);
      }
    };

    refresh();
  }, [queryEngine, filters]);

  // ==================== 搜索功能 ====================
  const performSearch = useCallback(async (query: string) => {
    if (!engineRef.current || !query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await engineRef.current.toGraphData({
        searchQuery: query,
      });

      const matchedIds = results.nodes.map((n) => n.id);
      setSearchResults(matchedIds);
      setMode('search');

      if (matchedIds.length > 0) {
        const firstId = matchedIds[0];
        setSelectedNodeId(firstId);
        setBreadcrumb((prev) => (prev.includes(firstId) ? prev : [...prev, firstId]));
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

  const onSearchChange = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (query.trim()) {
      searchTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setSearchResults([]);
      setMode('map');
    }
  }, [performSearch]);

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
        objectTypes: exists ? prev.objectTypes.filter((t) => t !== typeId) : [...prev.objectTypes, typeId],
      };
    });
  }, []);

  const onImportanceChange = useCallback((value: number) => {
    setFilters((prev) => ({ ...prev, importanceMin: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ domains: [], objectTypes: [], searchQuery: '', importanceMin: 0 });
    setSearchResults([]);
    setMode('map');
  }, []);

  // ==================== 节点交互 ====================
  const handleNodeClick = useCallback((nodeId: EntityId) => {
    setSelectedNodeId(nodeId);
    setMode('investigate');
    setBreadcrumb((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
  }, []);

  const handleNavigateToEntity = useCallback((id: EntityId) => {
    setSelectedNodeId(id);
    setMode('breadcrumb');
    setBreadcrumb((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

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
      setSearchResults([]);
    }
  }, []);

  const handleAction = useCallback((actionId: string, entityId: EntityId) => {
    console.log(`Action ${actionId} on ${entityId}`);
  }, []);

  // ==================== 辅助函数 ====================
  const getObject = useCallback((id: EntityId): OntologyObject | undefined => {
    return allEntities.find((e) => e.id === id);
  }, []);

  const getLinksForObject = useCallback((id: EntityId): OntologyLink[] => {
    return allLinks.filter((l) => l.sourceId === id || l.targetId === id);
  }, []);

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
      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        {graphData.nodes.length > 0 && (
          <G6GraphCanvas
            key={`g6-${canvasWidth}x${canvasHeight}`}
            data={graphData}
            width={canvasWidth}
            height={canvasHeight}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
          />
        )}

        {/* 筛选面板 */}
        <FilterPanel
          domains={['研发设计', '生产制造', '供应链管理', '质量管控', '业务系统支撑', '市场渠道销售', '订单物流报关', '成本利润核算', '经营风险管控']}
          selectedDomains={filters.domains}
          onDomainToggle={toggleDomain}
          searchQuery={filters.searchQuery}
          onSearchChange={onSearchChange}
          importanceMin={filters.importanceMin}
          onImportanceChange={onImportanceChange}
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

        {/* 搜索结果显示 */}
        {mode === 'search' && searchResults.length > 0 && (
          <div className="absolute top-20 right-4 z-10 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-4 py-3 max-w-xs">
            <p className="text-xs text-slate-400 mb-2">
              搜索结果 <span className="text-slate-200 font-medium">{searchResults.length}</span> 个实体
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.slice(0, 10).map((id) => {
                const obj = getObject(id);
                if (!obj) return null;
                return (
                  <button
                    key={id}
                    className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 transition-colors"
                    onClick={() => handleNodeClick(id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: shoeFactoryObjectTypes.find((t) => t.id === obj.typeId)?.color || '#64748B' }}
                    />
                    <span className="text-xs text-slate-300 truncate">{obj.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
        <div className="flex-shrink-0" style={{ width: 320 }}>
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
        </div>
      )}
    </div>
  );
}
