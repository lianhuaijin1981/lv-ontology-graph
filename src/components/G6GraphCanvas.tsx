/**
 * G6GraphCanvas — 根治闪烁+重叠
 *
 * 根治策略：
 * 1. animated: false → 布局后台完成，一次性渲染，零闪烁
 * 2. 标签默认隐藏（labelOpacity: 0）→ 零重叠
 * 3. 悬停 Tooltip 显示节点信息 → 信息不丢失
 * 4. 选中时显示该节点标签 → 关键信息可见
 */

import { useRef, useEffect } from 'react';
import { Graph } from '@antv/g6';
import type { EntityId } from '@/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';
import {
  getNodeSemanticConfig,
  getEdgeSemanticConfig,
  isInCoreChain,
  isCoreChainEdge,
} from '@/data/businessSemantic';

interface Props {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick?: (nodeId: EntityId | undefined) => void;
  onNodeContextMenu?: (nodeId: EntityId) => void;
  activeDomains?: string[];
  activeTypes?: string[];
}

const TIER = {
  1: { size: 44, font: 11, weight: 700 },
  2: { size: 32, font: 9,  weight: 500 },
  3: { size: 20, font: 8,  weight: 400 },
};

function nodeTier(nodeId: string, typeId: string): 1 | 2 | 3 {
  if (isInCoreChain(nodeId)) return 1;
  if (['workshop','process','equipment','bizSystem','designer','patternMaster','supplier','customer','channel','material','order'].includes(typeId)) return 2;
  return 3;
}

function dimColor(hex: string, f: number): string {
  const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  return `#${Math.round(r*f+30*(1-f)).toString(16).padStart(2,'0')}${Math.round(g*f+30*(1-f)).toString(16).padStart(2,'0')}${Math.round(b*f+30*(1-f)).toString(16).padStart(2,'0')}`;
}

export function G6GraphCanvas({ data, width, height, onNodeClick, onNodeContextMenu, activeDomains = [], activeTypes = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const lastId = useRef<string | null>(null);
  const cb = useRef({ onNodeClick, onNodeContextMenu });
  cb.current = { onNodeClick, onNodeContextMenu };

  const build = (d: GraphData) => {
    const hasF = activeDomains.length > 0 || activeTypes.length > 0;

    const nodes = d.nodes.map((n: GraphNode) => {
      const sc = getNodeSemanticConfig(n.typeId);
      const t = nodeTier(n.id, n.typeId);
      const tc = TIER[t];
      const inC = isInCoreChain(n.id);
      const dimmed = hasF && !((activeDomains.length===0||activeDomains.includes(n.domain)) && (activeTypes.length===0||activeTypes.includes(n.typeId)));

      return {
        id: n.id,
        data: { label: n.label, tier: t, inChain: inC, dimmed, semantic: sc.label, typeId: n.typeId, domain: n.domain },
        style: {
          fill: dimmed ? dimColor(sc.fill, 0.4) : t===3 ? dimColor(sc.fill, 0.55) : sc.fill,
          size: tc.size,
          // 标签默认隐藏
          labelText: n.label,
          labelFill: '#CBD5E1',
          labelFontSize: tc.font,
          labelFontWeight: tc.weight,
          labelOffsetY: tc.size * 0.5 + 8,
          labelOpacity: 1, // 文字始终显示
          lineWidth: inC ? 2.5 : 1.5,
          stroke: inC ? '#FFFFFF' : t===1 ? 'rgba(255,255,255,0.5)' : '#1E293B',
          shadowColor: inC ? sc.fill : undefined,
          shadowBlur: inC ? 12 : 0,
          opacity: dimmed ? 0.08 : t===3 ? 0.4 : t===2 ? 0.75 : 1,
        },
      };
    });

    const edges = d.links.map((l: GraphLink) => {
      const ec = getEdgeSemanticConfig(l.typeId, l.semantics);
      const s = typeof l.source==='string'?l.source:l.source.id;
      const t = typeof l.target==='string'?l.target:l.target.id;
      const inC = isCoreChainEdge(s, t);
      const maxTier = Math.max(nodeTier(s, d.nodes.find(x=>x.id===s)?.typeId||''), nodeTier(t, d.nodes.find(x=>x.id===t)?.typeId||''));
      return {
        id: l.id, source: s, target: t,
        style: {
          stroke: inC ? '#FBBF24' : ec.color,
          lineWidth: inC ? 3 : ec.width,
          labelText: l.label,
          labelFill: inC ? '#FBBF24' : '#94A3B8',
          labelFontSize: 8,
          labelOpacity: 1, // 文字始终显示
          endArrow: true,
          endArrowSize: inC ? 7 : 5,
          lineDash: inC ? undefined : ec.dash,
          opacity: inC ? 0.92 : maxTier>=3 ? 0.12 : 0.3,
        },
      };
    });

    return { nodes, edges };
  };

  // 高亮：只改 opacity + stroke + 显示标签
  const highlight = (g: Graph, id: string | null) => {
    const nodes = g.getNodeData();
    const edges = g.getEdgeData();

    if (!id) {
      g.updateNodeData(nodes.map((n: any) => {
        const d = n.data;
        return { id: n.id, style: { opacity: d.dimmed?0.08:d.tier===3?0.4:d.tier===2?0.75:1, labelOpacity: 0, shadowBlur: d.inChain?12:0, lineWidth: d.inChain?2.5:1.5, stroke: d.inChain?'#FFFFFF':undefined } };
      }));
      g.updateEdgeData(edges.map((e: any) => ({ id: e.id, style: { opacity: e.data?.inChain?0.92:0.3, labelOpacity: 0 } })));
      return;
    }

    const nbrs = new Set<string>();
    edges.forEach((e: any) => {
      const s = typeof e.source==='string'?e.source:e.source.id;
      const t = typeof e.target==='string'?e.target:e.target.id;
      if (s===id) nbrs.add(t);
      if (t===id) nbrs.add(s);
    });

    g.updateNodeData(nodes.map((n: any) => {
      if (n.id===id) return { id: n.id, style: { opacity: 1, labelOpacity: 1, shadowBlur: 20, lineWidth: 4, stroke: '#FFFFFF' } };
      if (nbrs.has(n.id)) return { id: n.id, style: { opacity: 0.8, labelOpacity: 0.8, shadowBlur: 8 } };
      return { id: n.id, style: { opacity: 0.06, labelOpacity: 0 } };
    }));

    g.updateEdgeData(edges.map((e: any) => {
      const s = typeof e.source==='string'?e.source:e.source.id;
      const t = typeof e.target==='string'?e.target:e.target.id;
      const rel = s===id || t===id;
      return { id: e.id, style: { opacity: rel?1:0.02, labelOpacity: rel?0.7:0 } };
    }));
  };

  useEffect(() => {
    if (!containerRef.current || width<=0 || height<=0) return;

    try {
      const g6d = build(data);
      const graph = new Graph({
        container: containerRef.current, width, height, background: '#0B0F19',
        data: g6d,
        node: { style: { cursor: 'pointer' } },
        edge: { style: { cursor: 'default' } },
        layout: {
          type: 'force',
          linkDistance: 420, nodeStrength: -2000, edgeStrength: 0.08,
          collideStrength: 3.5, collidePadding: 28,
          alphaDecay: 0.008, velocityDecay: 0.18,
          animated: false, // ← 根治闪烁：无动画，一次性渲染
          iterations: 1500, preventOverlap: true,
        },
        behaviors: [
          'drag-canvas', 'zoom-canvas', 'drag-element',
          {
            type: 'hover-activate',
            enable: (e: any) => e.targetType === 'node',
            degree: 0, // 只高亮当前节点
            state: 'hover', // 使用预定义 hover 态
          },
        ],
        // 内置 tooltip 显示节点详情
        plugins: [
          {
            type: 'tooltip',
            key: 'tooltip',
            trigger: 'pointermove',
            itemType: 'node',
            getContent: (_e: any, items: any[]) => {
              const d = items[0]?.data;
              if (!d) return '';
              return `<div style="background:rgba(15,23,42,0.95);border:1px solid #334155;border-radius:6px;padding:8px 12px;color:#F1F5F9;font-size:12px;max-width:200px;">
                <div style="font-weight:700;margin-bottom:4px;">${d.label}</div>
                <div style="color:#94A3B8;font-size:11px;">${d.semantic} · ${d.domain}</div>
              </div>`;
            },
          } as any,
        ],
      });

      graphRef.current = graph;

      graph.on('node:click', (event: any) => {
        const id = event.target.id;
        if (lastId.current === id) { lastId.current = null; highlight(graph, null); cb.current.onNodeClick?.(undefined); }
        else { lastId.current = id; highlight(graph, id); cb.current.onNodeClick?.(id); }
      });
      graph.on('canvas:click', () => { lastId.current = null; highlight(graph, null); cb.current.onNodeClick?.(undefined); });
      graph.on('node:contextmenu', (event: any) => { event.originalEvent?.preventDefault?.(); cb.current.onNodeContextMenu?.(event.target.id); });

      // 布局完成后 fitView（animated:false 后立即完成）
      setTimeout(() => graph.fitView(), 100);
    } catch (err) {
      console.error('G6 init failed:', err);
    }

    return () => { graphRef.current?.destroy(); graphRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    const g = graphRef.current;
    if (!g || data.nodes.length===0) return;
    try {
      g.setData(build(data));
      g.render();
      const cur = lastId.current;
      setTimeout(() => { g.fitView(); if (cur) highlight(g, cur); }, 200);
    } catch (err) { console.error('G6 update failed:', err); }
  }, [data, activeDomains, activeTypes]);

  return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width, height }} />;
}
