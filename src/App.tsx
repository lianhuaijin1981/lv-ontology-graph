/**
 * App.tsx - 女鞋总厂知识图谱主入口
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { D3GraphCanvas } from '@/components/D3GraphCanvas';
import type { GraphExportHandle } from '@/components/D3GraphCanvas';
import { ObjectExplorer } from '@/components/ObjectExplorer';
import { FilterPanel } from '@/components/FilterPanel';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { ScenePanel } from '@/components/ScenePanel';
import { SceneShowcase } from '@/components/SceneShowcase';
import { FlowStoryBar } from '@/components/FlowStoryBar';
import { InMemoryAdapter } from '@/storage/InMemoryAdapter';
import { QueryEngine } from '@/graph/QueryEngine';
import type { EntityId, BusinessDomain, FilterState } from '@/types';
import type { GraphData, GraphNode, GraphLink, GraphMode } from '@/graph/types';
import type { OntologyObject, OntologyLink } from '@/ontology/types';
import { globalOntologyRegistry, OntologyRegistryImpl } from '@/ontology/Ontology';
import {
  shoeFactoryObjectTypes,
  shoeFactoryLinkTypes,
  shoeFactoryActionTypes,
} from '@/ontology/ShoeFactoryOntology';
import { allEntities, allLinks } from '@/data';
import { RotateCcw, Download, FileJson, Sparkles } from 'lucide-react';
import { SEMANTIC_LEGEND, NODE_SEMANTIC_CONFIG, MAIN_PRODUCTION_CHAIN, ORDER_CHAIN, COST_CHAIN } from '@/data/businessSemantic';
import { ALL_PROCESS_FLOWS, type ProcessFlow, findFlowForNode } from '@/data/processFlows';
import { ALL_SCENES, getSceneById, type SceneResult } from '@/data/scenes';
import './App.css';

export default function App() {
  const [queryEngine, setQueryEngine] = useState<QueryEngine | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<EntityId | undefined>(undefined);
  const [explorerNodeId, setExplorerNodeId] = useState<EntityId | undefined>(undefined); // ObjectExplorer 显示的节点
  const [mode, setMode] = useState<GraphMode>('map');
  const [breadcrumb, setBreadcrumb] = useState<EntityId[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<EntityId[]>([]);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  const [viewMode, setViewMode] = useState<'map' | 'full'>('full'); // 默认全量视图
  const [activeFlow, setActiveFlow] = useState<ProcessFlow | null>(null);
  const [flowCurrentStep, setFlowCurrentStep] = useState<number>(0); // 0=不高亮，>=1表示当前步骤
  const [sceneResult, setSceneResult] = useState<SceneResult | null>(null);
  const [showScenePanel, setShowScenePanel] = useState(false);
  const [showShowcase, setShowShowcase] = useState(true); // 场景演示中心显隐
  const [showcaseCollapsed, setShowcaseCollapsed] = useState(false); // 演示中心收起状态

  // 根据视图模式过滤图谱数据
  const filteredGraphData = useMemo(() => {
    if (viewMode === 'full' || graphData.nodes.length === 0) return graphData;
    // 地图模式：只保留核心链路上的节点
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
  const exportRef = useRef<GraphExportHandle | null>(null);
  // 搜索命中后定位到的节点 ID
  const [focusNodeId, setFocusNodeId] = useState<EntityId | undefined>(undefined);

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
        // 触发图谱 FitView 定位
        setFocusNodeId(firstId);
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
    setFocusNodeId(undefined);
  }, []);

  // ==================== 节点交互（修复版）====================
  const handleNodeClick = useCallback((nodeId: EntityId | undefined) => {
    setSelectedNodeId((prev) => {
      const next = prev === nodeId ? undefined : nodeId;
      if (next) {
        setMode('investigate');
        setBreadcrumb((bp) => (bp.includes(next) ? bp : [...bp, next]));
      } else {
        setMode('map');
      }
      return next;
    });
  }, []);

  const handleNodeContextMenu = useCallback((nodeId: EntityId) => {
    setExplorerNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setBreadcrumb((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
  }, []);

  const handleCloseExplorer = useCallback(() => {
    setExplorerNodeId(undefined);
    setSelectedNodeId(undefined);
    setMode('map');
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedNodeId(undefined);
    setExplorerNodeId(undefined);
    setBreadcrumb([]);
    setMode('map');
    resetFilters();
  }, [resetFilters]);

  const handleNavigateToEntity = useCallback((id: EntityId) => {
    setExplorerNodeId(id);
    setSelectedNodeId(id);
    setBreadcrumb((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumb((prev) => {
      const newPath = prev.slice(0, index + 1);
      setSelectedNodeId(newPath[index]);
      return newPath;
    });
  }, []);

  const clearBreadcrumb = useCallback(() => {
    setBreadcrumb([]);
    setSelectedNodeId(undefined);
    setExplorerNodeId(undefined);
    setMode('map');
  }, []);

  // mode 状态保留用于面包屑逻辑，不再用于视图切换（视图由 viewMode 控制）

  const handleAction = useCallback((actionId: string, entityId: EntityId) => {
    const obj = allEntities.find((e) => e.id === entityId);
    const entityName = obj?.displayName || entityId;

    // 场景分析模式：根据 actionId 匹配场景
    if (actionId.startsWith('scene-')) {
      const sceneId = actionId.replace('scene-', '');
      const scene = getSceneById(sceneId);
      if (!scene) { alert(`未知场景: ${sceneId}`); return; }
      const result = scene.analyze(entityId);
      setSceneResult(result);
      setShowScenePanel(true);
      if (result.flow) {
        setActiveFlow(result.flow);
        setFlowCurrentStep(result.flowStep || result.flow.steps.length);
      }
      console.log(`[Scene] ${scene.name} on ${entityName}`, result);
      return;
    }

    // 兼容旧动作映射
    const actionNameMap: Record<string, string> = {
      drillDown: '穿透分析',
      traceSource: '溯源追踪',
      exportData: '导出数据',
      viewHistory: '查看历史',
      calculateROI: '计算 ROI',
    };
    const actionName = actionNameMap[actionId] || actionId;

    alert(`🎯 执行动作: ${actionName}\n📌 対象: ${entityName}`);
    console.log(`[Action] ${actionId} on ${entityName}`, obj);
  }, []);

  /** 运行指定场景 */
  const handleRunScene = useCallback((sceneId: string, targetEntityId?: EntityId) => {
    const targetId = targetEntityId || selectedNodeId;
    if (!targetId) return;
    const scene = getSceneById(sceneId);
    if (!scene) return;
    const result = scene.analyze(targetId);
    setSceneResult(result);
    setShowScenePanel(true);
    if (result.flow) {
      setActiveFlow(result.flow);
      setFlowCurrentStep(result.flowStep || result.flow.steps.length);
    }
  }, [selectedNodeId]);

  /** 关闭场景面板 */
  const handleCloseScenePanel = useCallback(() => {
    setShowScenePanel(false);
    setSceneResult(null);
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
        {/* 场景演示中心（顶部悬浮） */}
        {showShowcase && (
          <SceneShowcase
            selectedNodeId={selectedNodeId}
            selectedTypeId={allEntities.find(e => e.id === selectedNodeId)?.typeId}
            onLaunchScene={(sceneId) => {
              // 使用默认节点或当前选中节点启动场景
              const targetId = selectedNodeId || 'sales-07'; // 默认用客户下单节点
              handleRunScene(sceneId, targetId);
              setShowShowcase(false); // 启动后收起演示中心
            }}
            onClose={() => setShowShowcase(false)}
            collapsed={showcaseCollapsed}
            onToggleCollapse={() => setShowcaseCollapsed(!showcaseCollapsed)}
          />
        )}
        {filteredGraphData.nodes.length > 0 && (
          <D3GraphCanvas
            ref={exportRef}
            key={`g6-${canvasWidth}x${canvasHeight}`}
            data={filteredGraphData}
            width={canvasWidth}
            height={canvasHeight}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            activeDomains={filters.domains}
            activeTypes={filters.objectTypes}
            focusNodeId={focusNodeId}
            activeFlow={activeFlow}
            flowCurrentStep={flowCurrentStep}
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

        {/* 面包屑导航 */}
        <ViewSwitcher
          breadcrumb={breadcrumb}
          breadcrumbLabels={breadcrumbLabels}
          onBreadcrumbClick={handleBreadcrumbClick}
          onClear={clearBreadcrumb}
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

        {/* 底部统计 + 视图切换 */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400">
                节点 <span className="text-slate-200 font-medium">{filteredGraphData.nodes.length}</span>
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-400">
                关系 <span className="text-slate-200 font-medium">{filteredGraphData.links.length}</span>
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <span className="text-xs text-slate-500">
              池 {allEntities.length}
            </span>
          </div>

          {/* 地图/全量 切换 */}
          <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl flex items-center p-0.5">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="地图模式：只看核心节点+工艺链路"
            >
              地图
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="全量模式：显示所有节点"
            >
              全量
            </button>
          </div>

          {/* 流程故事线（替代原来的小按钮组） */}
          <FlowStoryBar
            activeFlow={activeFlow}
            currentStep={flowCurrentStep}
            onFlowChange={(flow) => { setActiveFlow(flow); setFlowCurrentStep(flow.steps.length); }}
            onStepChange={setFlowCurrentStep}
            onClose={() => { setActiveFlow(null); setFlowCurrentStep(0); }}
          />

          {/* 全局重置视图 */}
          <button
            onClick={handleResetView}
            className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="重置视图：取消选中、关闭面板、恢复全图谱"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-xs">重置</span>
          </button>

          {/* 导出按钮组 */}
          <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl flex items-center p-0.5 gap-0.5">
            <button
              onClick={() => exportRef.current?.exportPNG()}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="导出图谱为 PNG 图片"
            >
              <Download className="w-3 h-3" />
              PNG
            </button>
            <div className="w-px h-4 bg-slate-700" />
            <button
              onClick={() => exportRef.current?.exportJSON()}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="导出图谱数据为 JSON"
            >
              <FileJson className="w-3 h-3" />
              JSON
            </button>
          </div>

          {/* 语义图例：5类业务角色 */}
          <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-3">
            {SEMANTIC_LEGEND.map((item) => {
              const cfg = NODE_SEMANTIC_CONFIG[item.semantic];
              const shapeClass = cfg.shape === 'circle' ? 'rounded-full'
                : cfg.shape === 'rect' ? 'rounded-sm'
                : cfg.shape === 'diamond' ? 'rotate-45 rounded-sm'
                : 'rounded-sm';
              return (
                <div key={item.semantic} className="flex items-center gap-1" title={item.desc}>
                  <div
                    className={`w-2.5 h-2.5 ${shapeClass} border border-white/30`}
                    style={{ backgroundColor: cfg.fill }}
                  />
                  <span className="text-[10px] text-slate-400">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* 场景快捷入口（选中节点时显示） */}
          {selectedNodeId && (
            <div className="bg-slate-900/95 backdrop-blur border border-cyan-500/20 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] text-cyan-400">场景</span>
              {(() => {
                const obj = allEntities.find((e) => e.id === selectedNodeId);
                const typeId = obj?.typeId || '';
                // 推荐场景
                const recScenes = ALL_SCENES.filter(s => s.triggerTypeIds.includes(typeId));
                const displayScenes = recScenes.length > 0 ? recScenes : ALL_SCENES;
                return displayScenes.slice(0, 5).map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => handleRunScene(scene.id)}
                    className="px-2 py-[3px] rounded text-[10px] font-medium bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition-all flex items-center gap-1"
                    title={scene.description}
                  >
                    <span>{scene.icon}</span>
                    <span>{scene.name}</span>
                  </button>
                ));
              })()}
            </div>
          )}

          {/* 右键提示 + 场景入口 */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 text-[10px] text-slate-500">
              左键选中 · 右键详情 · 空白取消
            </div>
            {!showShowcase && (
              <button
                onClick={() => { setShowShowcase(true); setShowcaseCollapsed(false); }}
                className="bg-slate-900/95 backdrop-blur border border-cyan-500/30 rounded-lg shadow-xl px-3 py-2 flex items-center gap-1.5 text-[10px] font-medium text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                场景演示
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 右侧对象浏览器 — 仅右键/主动触发时显示 */}
      {explorerNodeId && (
        <div className="flex-shrink-0" style={{ width: 320 }}>
          <ObjectExplorer
            entityId={explorerNodeId}
            getObject={getObject}
            getLinksForObject={getLinksForObject}
            getObjectType={(id) => registryRef.current.getObjectType(id)}
            getLinkType={(id) => registryRef.current.getLinkType(id)}
            getActionTypesForObject={(typeId) => registryRef.current.listActionTypesForObject(typeId)}
            onNavigateToEntity={handleNavigateToEntity}
            onAction={handleAction}
            onClose={handleCloseExplorer}
          />
        </div>
      )}

      {/* 场景分析面板 */}
      {showScenePanel && sceneResult && selectedNodeId && (
        <div className="flex-shrink-0" style={{ width: 360 }}>
          <ScenePanel
            entityId={selectedNodeId}
            typeId={allEntities.find(e => e.id === selectedNodeId)?.typeId}
            entityName={allEntities.find(e => e.id === selectedNodeId)?.displayName}
            result={sceneResult}
            onRunScene={(sid) => handleRunScene(sid)}
            onClose={handleCloseScenePanel}
          />
        </div>
      )}
    </div>
  );
}
