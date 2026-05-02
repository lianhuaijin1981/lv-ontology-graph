/**
 * D3GraphCanvas — 纯 D3.js SVG 渲染（替代 G6）
 *
 * 改进点：
 * 1. SVG DOM 渲染，无 Canvas 过曝模糊
 * 2. 无发光/shadowBlur，只用颜色+描边粗细
 * 3. 标签默认隐藏，悬停 Tooltip 显示，零重叠
 * 4. 右键绑定 SVG 元素，阻止浏览器默认菜单
 * 5. 力导向动画可控，点击后暂停动画防抖动
 */

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
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
  1: { size: 28, font: 14, weight: 700 },
  2: { size: 20, font: 12, weight: 500 },
  3: { size: 14, font: 10, weight: 400 },
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

export function D3GraphCanvas({ data, width, height, onNodeClick, onNodeContextMenu, activeDomains = [], activeTypes = [] }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const lastId = useRef<string | null>(null);
  const cb = useRef({ onNodeClick, onNodeContextMenu });
  cb.current = { onNodeClick, onNodeContextMenu };

  useEffect(() => {
    if (!svgRef.current || width <= 0 || height <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const hasF = activeDomains.length > 0 || activeTypes.length > 0;

    // 准备数据
    const nodes = data.nodes.map((n: GraphNode) => {
      const sc = getNodeSemanticConfig(n.typeId);
      const t = nodeTier(n.id, n.typeId);
      const tc = TIER[t];
      const inC = isInCoreChain(n.id);
      const dimmed = hasF && !((activeDomains.length===0||activeDomains.includes(n.domain)) && (activeTypes.length===0||activeTypes.includes(n.typeId)));
      return {
        id: n.id,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        r: tc.size,
        fill: dimmed ? dimColor(sc.fill, 0.4) : t === 3 ? dimColor(sc.fill, 0.55) : sc.fill,
        stroke: inC ? '#FBBF24' : t === 1 ? 'rgba(255,255,255,0.6)' : '#1E293B',
        strokeWidth: inC ? 3 : 1.5,
        label: n.label,
        labelColor: inC ? '#FBBF24' : t === 1 ? '#FFFFFF' : '#CBD5E1',
        fontSize: tc.font,
        fontWeight: tc.weight,
        tier: t,
        dimmed,
        inChain: inC,
        typeId: n.typeId,
        domain: n.domain,
        semantic: sc.label,
      };
    });

    const links = data.links.map((l: GraphLink) => {
      const ec = getEdgeSemanticConfig(l.typeId, l.semantics);
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      const inC = isCoreChainEdge(s, t);
      const maxTier = Math.max(
        nodeTier(s, data.nodes.find(x => x.id === s)?.typeId || ''),
        nodeTier(t, data.nodes.find(x => x.id === t)?.typeId || '')
      );
      return {
        id: l.id,
        source: s,
        target: t,
        color: inC ? '#FBBF24' : ec.color,
        width: inC ? 4 : ec.width,
        label: l.label,
        dash: inC ? undefined : ec.dash,
        opacity: inC ? 1 : maxTier >= 3 ? 0.15 : 0.4,
        inChain: inC,
      };
    });

    // 建立 id→node 映射
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const linkObjs = links.map(l => ({
      ...l,
      source: nodeMap.get(l.source)!,
      target: nodeMap.get(l.target)!,
    }));

    // 创建组
    const g = svg.append('g');

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoom as any).on('dblclick.zoom', null);

    // 箭头标记（主流程箭头更醒目）
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748B');
    defs.append('marker')
      .attr('id', 'arrow-gold')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 40)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#FBBF24');

    // 绘制边
    const linkG = g.selectAll('.link')
      .data(linkObjs)
      .enter()
      .append('g')
      .attr('class', 'link');

    linkG.append('line')
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-width', (d: any) => d.width)
      .attr('stroke-opacity', (d: any) => d.opacity)
      .attr('stroke-dasharray', (d: any) => d.dash ? d.dash.join(',') : null)
      .attr('marker-end', (d: any) => d.inChain ? 'url(#arrow-gold)' : 'url(#arrow)');

    // 绘制节点
    const nodeG = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer');

    nodeG.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => d.fill)
      .attr('stroke', (d: any) => d.stroke)
      .attr('stroke-width', (d: any) => d.strokeWidth);

    // 标签（核心链路默认显示，其余悬停显示）
    nodeG.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => d.r + 16)
      .attr('fill', (d: any) => d.labelColor)
      .attr('font-size', (d: any) => d.fontSize)
      .attr('font-weight', (d: any) => d.fontWeight)
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('pointer-events', 'none')
      .style('opacity', (d: any) => d.inChain ? 1 : 0) // 核心链路默认显示
      .style('text-shadow', (d: any) => d.inChain ? '0 1px 3px rgba(0,0,0,0.8)' : 'none')
      .text((d: any) => d.label);

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('border', '1px solid #334155')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('color', '#F1F5F9')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.15s')
      .style('z-index', '100')
      .style('white-space', 'nowrap');

    // 事件
    nodeG
      .on('mouseenter', function(event: any, d: any) {
        // 显示 Tooltip
        tooltip
          .style('opacity', 1)
          .html(`<div style="font-weight:700">${d.label}</div><div style="color:#94A3B8;font-size:11px">${d.semantic} · ${d.domain}</div>`);
        const [mx, my] = d3.pointer(event, containerRef.current);
        tooltip.style('left', (mx + 12) + 'px').style('top', (my - 12) + 'px');

        // 显示标签
        d3.select(this).select('.node-label').style('opacity', 1);

        // 未选中时高亮邻居
        if (!lastId.current) {
          highlight(d.id);
        }
      })
      .on('mousemove', function(event: any) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        tooltip.style('left', (mx + 12) + 'px').style('top', (my - 12) + 'px');
      })
      .on('mouseleave', function(_event: any, d: any) {
        tooltip.style('opacity', 0);
        if (!lastId.current || lastId.current !== d.id) {
          // 核心链路节点保持显示标签，其余隐藏
          d3.select(this).select('.node-label').style('opacity', d.inChain ? 1 : 0);
        }
        if (!lastId.current) restoreAll();
      })
      .on('click', function(event: any, d: any) {
        event.stopPropagation();
        const id = d.id;
        if (lastId.current === id) {
          lastId.current = null;
          restoreAll();
          cb.current.onNodeClick?.(undefined);
        } else {
          lastId.current = id;
          highlight(id);
          cb.current.onNodeClick?.(id);
        }
      })
      .on('contextmenu', function(event: any, d: any) {
        event.preventDefault();
        event.stopPropagation();
        cb.current.onNodeContextMenu?.(d.id);
      });

    // 空白点击
    svg.on('click', () => {
      lastId.current = null;
      restoreAll();
      cb.current.onNodeClick?.(undefined);
    });

    // 高亮函数
    function highlight(activeId: string) {
      const nbrs = new Set<string>();
      linkObjs.forEach((l: any) => {
        if (l.source.id === activeId) nbrs.add(l.target.id);
        if (l.target.id === activeId) nbrs.add(l.source.id);
      });

      nodeG.selectAll('circle')
        .attr('opacity', (d: any) => {
          if (d.id === activeId) return 1;
          if (nbrs.has(d.id)) return 0.85;
          return 0.1;
        })
        .attr('stroke-width', (d: any) => {
          if (d.id === activeId) return 4;
          if (nbrs.has(d.id)) return 2.5;
          return d.strokeWidth;
        });

      nodeG.selectAll('.node-label')
        .style('opacity', (d: any) => {
          if (d.id === activeId || nbrs.has(d.id)) return 1;
          return 0;
        });

      linkG.selectAll('line')
        .attr('stroke-opacity', (d: any) => {
          const rel = d.source.id === activeId || d.target.id === activeId;
          return rel ? 1 : 0.03;
        })
        .attr('stroke-width', (d: any) => {
          const rel = d.source.id === activeId || d.target.id === activeId;
          return rel ? d.width * 1.5 : d.width;
        });
    }

    function restoreAll() {
      nodeG.selectAll('circle')
        .attr('opacity', (d: any) => d.dimmed ? 0.12 : d.tier === 3 ? 0.65 : d.tier === 2 ? 0.85 : 1)
        .attr('stroke-width', (d: any) => d.strokeWidth);

      nodeG.selectAll('.node-label')
        .style('opacity', (d: any) => d.inChain ? 1 : 0);

      linkG.selectAll('line')
        .attr('stroke-opacity', (d: any) => d.opacity)
        .attr('stroke-width', (d: any) => d.width);
    }

    // 力导向
    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(linkObjs as any).id((d: any) => d.id).distance(130).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-1400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.r + 30))
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .alphaDecay(0.04)
      .velocityDecay(0.6);

    simRef.current = sim;

    sim.on('tick', () => {
      linkG.selectAll('line')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // 初始 fit
    setTimeout(() => {
      const xs = nodes.map((d: any) => d.x);
      const ys = nodes.map((d: any) => d.y);
      const dx = Math.max(...xs) - Math.min(...xs) || 1;
      const dy = Math.max(...ys) - Math.min(...ys) || 1;
      const scale = Math.min((width - 80) / dx, (height - 80) / dy, 1.2);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.max(scale, 0.3))
        .translate(-cx, -cy);
      svg.transition().duration(400).call(zoom.transform as any, transform);
    }, 400);

    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, [data, width, height, activeDomains, activeTypes]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <svg ref={svgRef} style={{ display: 'block', background: '#0B0F19', cursor: 'grab', width: '100%', height: '100%' }} />
    </div>
  );
}
