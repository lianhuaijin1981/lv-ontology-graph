/**
 * G6GraphCanvas - AntV G6 v5 渲染引擎
 * 
 * 架构变更：
 * - D3.js 纯渲染层 → G6 v5 (WebGL/Canvas/SVG 自动切换)
 * - G6 内置 force 布局（基于 d3-force 原理）
 * - 保留 QueryEngine 数据层 + 业务交互层
 * 
 * G6 v5 核心特性：
 * - 渲染器自动选择：节点<200用Canvas，>500自动切WebGL
 * - 内置力导向布局 + 多种布局算法
 * - 数据驱动样式（函数式映射）
 * - 内置交互：拖拽、缩放、悬停高亮
 */

import { useRef, useEffect } from 'react';
import { Graph } from '@antv/g6';
import type { EntityId } from '@/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';

interface G6GraphCanvasProps {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick?: (nodeId: EntityId) => void;
  selectedNodeId?: EntityId;
}

export function G6GraphCanvas({
  data,
  width,
  height,
  onNodeClick,
  selectedNodeId,
}: G6GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const selectedRef = useRef<string | undefined>(selectedNodeId);
  const onClickRef = useRef(onNodeClick);

  selectedRef.current = selectedNodeId;
  onClickRef.current = onNodeClick;

  // 转换数据格式
  const convertData = (graphData: GraphData): { nodes: any[]; edges: any[] } => {
    return {
      nodes: graphData.nodes.map((n: GraphNode) => ({
        id: n.id,
        data: {
          typeId: n.typeId,
          domain: n.domain,
          importance: n.importance,
          level: n.level,
          isAggregate: n.isAggregate,
          childCount: n.childCount,
          radius: n.radius,
        },
        style: {
          x: n.x,
          y: n.y,
          fill: n.color,
          size: n.isAggregate ? 48 : n.radius * 2 + 6,
          labelText: n.label,
          labelFill: n.isAggregate ? '#FFFFFF' : '#F1F5F9',
          labelFontSize: n.isAggregate ? 13 : 11,
          labelFontWeight: n.isAggregate ? 600 : 400,
          labelOffsetY: n.isAggregate ? 28 : 18,
          lineWidth: n.isAggregate ? 2 : 1.5,
          stroke: n.isAggregate ? 'rgba(255,255,255,0.4)' : '#0F172A',
          shadowColor: n.color,
          shadowBlur: n.isAggregate ? 12 : 0,
          opacity: 0.95,
          // 形状映射
          type: n.shape === 'rect' ? 'rect' : n.shape === 'diamond' ? 'diamond' : n.shape === 'hexagon' ? 'hexagon' : 'circle',
        },
      })),
      edges: graphData.links.map((l: GraphLink) => ({
        id: l.id,
        source: typeof l.source === 'string' ? l.source : l.source.id,
        target: typeof l.target === 'string' ? l.target : l.target.id,
        data: {
          typeId: l.typeId,
          semantics: l.semantics,
        },
        style: {
          stroke: l.color,
          lineWidth: l.width,
          labelText: l.label,
          labelFill: '#CBD5E1',
          labelFontSize: 9,
          endArrow: l.directed,
          endArrowSize: 6,
          opacity: 0.6,
          lineDash: l.style === 'dashed' ? [4, 2] : l.style === 'dotted' ? [2, 2] : undefined,
        },
      })),
    };
  };

  // 高亮状态更新
  const updateHighlight = (graph: Graph, activeId: string | null) => {
    const allNodes = graph.getNodeData();
    const allEdges = graph.getEdgeData();

    if (!activeId) {
      // 恢复默认
      allNodes.forEach((n: any) => {
        graph.updateNodeData([
          {
            id: n.id,
            style: { opacity: n.data?.isAggregate ? 1 : 0.95, labelOpacity: 1 },
          },
        ]);
      });
      allEdges.forEach((e: any) => {
        graph.updateEdgeData([
          {
            id: e.id,
            style: { opacity: 0.6, labelOpacity: 0.8 },
          },
        ]);
      });
      return;
    }

    // 获取邻居
    const neighbors = new Set<string>();
    allEdges.forEach((e: any) => {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      if (s === activeId) neighbors.add(t);
      if (t === activeId) neighbors.add(s);
    });

    allNodes.forEach((n: any) => {
      const isActive = n.id === activeId || neighbors.has(n.id);
      graph.updateNodeData([
        {
          id: n.id,
          style: {
            opacity: isActive ? 1 : 0.15,
            labelOpacity: isActive ? 1 : 0.1,
            lineWidth: n.id === activeId ? 3 : n.data?.isAggregate ? 2 : 1.5,
            stroke: n.id === activeId ? '#FFFFFF' : n.data?.isAggregate ? 'rgba(255,255,255,0.4)' : '#0F172A',
          },
        },
      ]);
    });

    allEdges.forEach((e: any) => {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      const isActive = s === activeId || t === activeId;
      graph.updateEdgeData([
        {
          id: e.id,
          style: {
            opacity: isActive ? 0.9 : 0.08,
            lineWidth: isActive ? 2.5 : 1.5,
            labelOpacity: isActive ? 1 : 0.05,
          },
        },
      ]);
    });
  };

  // 初始化 G6
  useEffect(() => {
    if (!containerRef.current || width <= 0 || height <= 0) return;

    const g6Data = convertData(data);

    const graph = new Graph({
      container: containerRef.current,
      width,
      height,
      background: '#0B0F19',
      data: g6Data,
      node: {
        style: {
          cursor: 'pointer',
        },
      },
      edge: {
        style: {
          cursor: 'default',
        },
      },
      layout: {
        type: 'force',
        linkDistance: 200,
        nodeStrength: -600,
        edgeStrength: 0.3,
        collideStrength: 1.0,
        alphaDecay: 0.02,
        velocityDecay: 0.4,
        animated: true,
        iterations: 600,
        preventOverlap: true,
        nodeSize: (d: any) => d.data?.isAggregate ? 48 : (d.data?.radius || 10) * 2 + 10,
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        {
          type: 'hover-activate',
          enable: (event: any) => event.targetType === 'node',
          degree: 1,
          state: 'highlight',
          onHover: (event: any) => {
            if (event.targetType === 'node') {
              updateHighlight(graph, event.target.id);
            }
          },
          onHoverEnd: () => {
            updateHighlight(graph, selectedRef.current || null);
          },
        },
      ],
      plugins: [],
    });

    graphRef.current = graph;

    // 事件监听
    graph.on('node:click', (event: any) => {
      const nodeId = event.target.id;
      onClickRef.current?.(nodeId);
      updateHighlight(graph, nodeId);
    });

    graph.on('canvas:click', () => {
      onClickRef.current?.(undefined as any);
      updateHighlight(graph, null);
    });

    // 初始适应视图
    setTimeout(() => {
      graph.fitView();
    }, 200);

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // 数据更新
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || data.nodes.length === 0) return;

    const g6Data = convertData(data);
    graph.setData(g6Data);
    graph.render();
  }, [data]);

  // 选中节点更新
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (selectedNodeId) {
      updateHighlight(graph, selectedNodeId);
      graph.focusElement(selectedNodeId, { duration: 400 });
    } else {
      updateHighlight(graph, null);
    }
  }, [selectedNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
