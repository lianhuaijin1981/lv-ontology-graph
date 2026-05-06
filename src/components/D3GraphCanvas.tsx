/**
 * D3GraphCanvas — 纯 D3.js SVG 渲染（替代 G6）
 *
 * 改进点：
 * 1. SVG DOM 渲染，无 Canvas 过曝模糊
 * 2. 无发光/shadowBlur，只用颜色+描边粗细
 * 3. 标签默认隐藏，悬停 Tooltip 显示，零重叠
 * 4. 右键绑定 SVG 元素，阻止浏览器默认菜单
 * 5. 力导向动画可控，点击后暂停动画防抖动
 * 6. focusNodeId：搜索命中后自动 FitView 定位到目标节点
 * 7. exportRef：暴露 exportPNG / exportJSON 方法给父组件
 */

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import type { EntityId } from '@/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';
import {
  getNodeSemanticConfig,
  getEdgeSemanticConfig,
  isInCoreChain,
  isCoreChainEdge,
} from '@/data/businessSemantic';
import {
  computeDomainZones,
  assignNodePositions,
  createLayeredSimulation,
  type DomainZone,
  TIERS,
} from '@/layout/domainLayout';
import type { ProcessFlow } from '@/data/processFlows';

// ==================== 导出句柄类型（供父组件调用） ====================
export interface GraphExportHandle {
  exportPNG: (filename?: string) => void;
  exportJSON: (filename?: string) => void;
}

interface Props {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick?: (nodeId: EntityId | undefined) => void;
  onNodeContextMenu?: (nodeId: EntityId) => void;
  activeDomains?: string[];
  activeTypes?: string[];
  /** 搜索命中后自动 FitView 定位的节点 ID */
  focusNodeId?: EntityId;
  /** 流程高亮模式：传入流程定义 + 当前步骤(0=不高亮) */
  activeFlow?: ProcessFlow | null;
  /** 流程当前步骤（1-based），用于区分已完成/进行中/待执行 */
  flowCurrentStep?: number;
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

// ==================== 组件（使用 forwardRef 暴露导出句柄） ====================

export const D3GraphCanvas = forwardRef<GraphExportHandle, Props>(function D3GraphCanvas(
  { data, width, height, onNodeClick, onNodeContextMenu, activeDomains = [], activeTypes = [], focusNodeId, activeFlow = null, flowCurrentStep = 0 },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesDataRef = useRef<any[]>([]);
  const lastId = useRef<string | null>(null);
  const cb = useRef({ onNodeClick, onNodeContextMenu });
  cb.current = { onNodeClick, onNodeContextMenu };

  // ==================== 暴露导出方法给父组件 ====================
  useImperativeHandle(ref, () => ({
    exportPNG(filename = 'knowledge-graph.png') {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      // 序列化 SVG
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // 转 canvas → PNG
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 1;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d')!;
        // 背景填充（保持与 SVG 背景一致）
        ctx.fillStyle = '#0B0F19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((b) => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, 'image/png');
      };
      img.src = url;
    },

    exportJSON(filename = 'knowledge-graph.json') {
      const nodes = nodesDataRef.current.map((n: any) => ({
        id: n.id,
        label: n.label,
        typeId: n.typeId,
        domain: n.domain,
        semantic: n.semantic,
        tier: n.tier,
        x: Math.round(n.x ?? 0),
        y: Math.round(n.y ?? 0),
      }));

      const links = data.links.map((l: GraphLink) => {
        const sid = typeof l.source === 'string' ? l.source : l.source.id;
        const tid = typeof l.target === 'string' ? l.target : l.target.id;
        return {
          id: l.id,
          source: sid,
          target: tid,
          typeId: l.typeId,
          semantics: l.semantics,
          label: l.label,
        };
      });

      const json = JSON.stringify({ nodes, links, exportedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
  }), [data, width, height]);

  // ==================== 主渲染 Effect ====================
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

    nodesDataRef.current = nodes;

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
        semantics: l.semantics,
      };
    });

    // 建立 id→node 映射
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const linkObjs = links.map(l => ({
      ...l,
      source: nodeMap.get(l.source)!,
      target: nodeMap.get(l.target)!,
    }));

    // ========== 分层布局：计算板块分区 + 节点初始位置 ==========
    const padding = 60; // 画布边距
    const zones = computeDomainZones(width, height, padding);
    const layoutInfos = assignNodePositions(data.nodes, zones, Date.now() % 1000);

    // 将布局位置写入节点
    const infoMap = new Map(layoutInfos.map(info => [info.id, info]));
    nodes.forEach((n: any) => {
      const info = infoMap.get(n.id);
      if (info) {
        n.x = info.x;
        n.y = info.y;
      }
    });
    console.log('[D3Debug] nodes count:', nodes.length, 'links count:', links.length);

    // 创建组
    const g = svg.append('g');

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoom as any).on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // ========== 绘制板块分区背景 ==========
    const zoneGroup = g.selectAll('.domain-zone')
      .data(zones)
      .enter()
      .append('g')
      .attr('class', 'domain-zone');

    zoneGroup.append('rect')
      .attr('x', (d: DomainZone) => d.cx - d.width / 2)
      .attr('y', (d: DomainZone) => d.cy - d.height / 2)
      .attr('width', (d: DomainZone) => d.width)
      .attr('height', (d: DomainZone) => d.height)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', (d: DomainZone) => d.color)
      .attr('stroke', (d: DomainZone) => d.borderColor)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .style('opacity', 0.6);

    // 板块标题
    zoneGroup.append('text')
      .attr('x', (d: DomainZone) => d.cx - d.width / 2 + 10)
      .attr('y', (d: DomainZone) => d.cy - d.height / 2 + 20)
      .attr('fill', (d: DomainZone) => d.borderColor.replace(/[\d.]+\)$/, '0.55)'))
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('letter-spacing', '0.5px')
      .text((d: DomainZone) => d.label);

    // 层级分隔线（可选视觉引导）
    const _innerH = height - padding * 2;
    TIERS.forEach((tierCfg, tierIdx) => {
      if (tierIdx < TIERS.length - 1) {
        const y = padding + _innerH * (tierCfg.yRatio + tierCfg.heightRatio);
        g.append('line')
          .attr('x1', padding)
          .attr('y1', y)
          .attr('x2', width - padding)
          .attr('y2', y)
          .attr('stroke', 'rgba(71,85,105,0.25)')
          .attr('stroke-dasharray', '2,8')
          .attr('stroke-width', 1);
        // 层级标签
        g.append('text')
          .attr('x', padding + 6)
          .attr('y', y - 6)
          .attr('fill', 'rgba(100,116,139,0.35)')
          .attr('font-size', '9px')
          .attr('font-family', 'system-ui, -apple-system, sans-serif')
          .text(tierCfg.label);
      }
    });

    // ========== 箭头标记（按边语义分别定义） ==========
    const defs = svg.append('defs');

    // 主流程 flow 箭头（金色）
    defs.append('marker')
      .attr('id', 'arrow-flow-chain')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 40)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#FBBF24');

    // flow 箭头（蓝灰，实线）
    defs.append('marker')
      .attr('id', 'arrow-flow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#60A5FA');

    // support 箭头（绿色）
    defs.append('marker')
      .attr('id', 'arrow-support')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#34D399');

    // impact 箭头（橙色，开放箭头）
    defs.append('marker')
      .attr('id', 'arrow-impact')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'none')
      .attr('stroke', '#FB923C')
      .attr('stroke-width', 1.5);

    // default 箭头（灰色）
    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748B');

    // 搜索高亮节点发光效果 filter
    const filter = defs.append('filter')
      .attr('id', 'glow-focus')
      .attr('x', '-40%').attr('y', '-40%')
      .attr('width', '180%').attr('height', '180%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ========== 绘制边（增强语义差异化） ==========
    const linkG = g.selectAll('.link')
      .data(linkObjs)
      .enter()
      .append('g')
      .attr('class', 'link');

    linkG.append('line')
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-width', (d: any) => d.width)
      .attr('stroke-opacity', (d: any) => d.opacity)
      .attr('stroke-dasharray', (d: any) => {
        if (d.inChain) return null;
        // 按边语义精细化虚线样式
        const s = d.semantics ?? '';
        if (s === 'flow' || s === 'precedence' || s === 'pathAssociation') return null; // 实线
        if (s === 'support' || s === 'capabilitySupport' || s === 'responsibility') return '6,3'; // 长虚线
        if (s === 'impact' || s === 'impactTransmission') return '2,5'; // 点线
        if (s === 'association') return '8,4'; // 中虚线
        if (s === 'dependency') return '3,3,8,3'; // 混合虚线（先短后长）
        return d.dash ? d.dash.join(',') : null;
      })
      .attr('stroke-linecap', (d: any) => {
        const s = d.semantics ?? '';
        // 影响链使用圆形端点，视觉上更"柔和"
        return (s === 'impact' || s === 'impactTransmission') ? 'round' : 'butt';
      })
      .attr('marker-end', (d: any) => {
        if (d.inChain) return 'url(#arrow-flow-chain)';
        const s = d.semantics ?? '';
        if (s === 'flow' || s === 'precedence' || s === 'pathAssociation') return 'url(#arrow-flow)';
        if (s === 'support' || s === 'capabilitySupport' || s === 'responsibility' || s === 'association') return 'url(#arrow-support)';
        if (s === 'impact' || s === 'impactTransmission' || s === 'dependency') return 'url(#arrow-impact)';
        return 'url(#arrow-default)';
      });

    // ========== 绘制节点 ==========
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
      .style('opacity', (d: any) => d.inChain ? 1 : 0)
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

    // ========== 事件 ==========
    nodeG
      .on('mouseenter', function(event: any, d: any) {
        tooltip
          .style('opacity', 1)
          .html(`<div style="font-weight:700">${d.label}</div><div style="color:#94A3B8;font-size:11px">${d.semantic} · ${d.domain}</div>`);
        const [mx, my] = d3.pointer(event, containerRef.current);
        tooltip.style('left', (mx + 12) + 'px').style('top', (my - 12) + 'px');

        d3.select(this).select('.node-label').style('opacity', 1);

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

    // ========== 高亮函数 ==========
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
        .attr('stroke-width', (d: any) => d.strokeWidth)
        .attr('filter', null);

      nodeG.selectAll('.node-label')
        .style('opacity', (d: any) => d.inChain ? 1 : 0);

      linkG.selectAll('line')
        .attr('stroke-opacity', (d: any) => d.opacity)
        .attr('stroke-width', (d: any) => d.width);
    }

    // ========== 流程高亮函数 ==========
    function highlightFlow(flow: ProcessFlow, currentStep?: number) {
      const step = currentStep || flow.steps.length;
      const completedIds = new Set(flow.steps.slice(0, step).map(s => s.nodeId));
      const pendingIds = new Set(flow.steps.slice(step).map(s => s.nodeId));
      const pathSet = new Set(flow.pathSegments.flat());

      // 节点高亮：已完成(亮绿) → 当前步骤(金色脉冲) → 待执行(灰显) → 流程外(极淡)
      nodeG.selectAll('circle')
        .attr('opacity', (d: any) => {
          if (!pathSet.has(d.id)) return 0.08;
          if (completedIds.has(d.id)) return 1;
          if (pendingIds.has(d.id)) return 0.35;
          return 0.5;
        })
        .attr('stroke', (d: any) => {
          const stepInfo = flow.steps.find(s => s.nodeId === d.id);
          const stepIdx = stepInfo?.step || 0;
          if (stepIdx === step && step <= flow.steps.length) return '#FBBF24'; // 当前步骤金色
          if (completedIds.has(d.id)) return '#34D399'; // 已完成绿色
          return 'rgba(255,255,255,0.15)';
        })
        .attr('stroke-width', (d: any) => {
          const stepInfo = flow.steps.find(s => s.nodeId === d.id);
          if (stepInfo?.step === step) return 4;
          if (completedIds.has(d.id)) return 2.5;
          return 1;
        });

      // 步骤序号标签
      nodeG.selectAll('.node-label')
        .style('opacity', (d: any) => pathSet.has(d.id) ? 1 : 0)
        .text((d: any) => {
          const si = flow.steps.find(s => s.nodeId === d.id);
          return si ? `${si.step}. ${d.label}` : d.label;
        })
        .attr('fill', (d: any) => {
          const si = flow.steps.find(s => s.nodeId === d.id);
          if (si?.step === step) return '#FBBF24';
          if (completedIds.has(d.id)) return '#34D399';
          return '#94A3B8';
        });

      // 边高亮：路径上的边亮起，其余暗淡
      linkG.selectAll('line')
        .attr('stroke-opacity', (d: any) => {
          const inPath = flow.pathSegments.some(([s, t]) =>
            (d.source.id === s && d.target.id === t) ||
            (d.source.id === t && d.target.id === s)
          );
          if (!inPath) return 0.04;
          // 判断边是否在已完成区间
          const srcCompleted = completedIds.has(d.source.id) && completedIds.has(d.target.id);
          return srcCompleted ? 1 : 0.5;
        })
        .attr('stroke-width', (d: any) => {
          const inPath = flow.pathSegments.some(([s, t]) =>
            (d.source.id === s && d.target.id === t) ||
            (d.source.id === t && d.target.id === s)
          );
          return inPath ? d.width * 1.6 : d.width;
        })
        .attr('stroke', (d: any) => {
          const inPath = flow.pathSegments.some(([s, t]) =>
            (d.source.id === s && d.target.id === t) ||
            (d.source.id === t && d.target.id === s)
          );
          if (inPath) return '#34D399';
          return d.color;
        });
    }

    // 如果有激活的流程，应用流程高亮
    if (activeFlow) {
      setTimeout(() => highlightFlow(activeFlow, flowCurrentStep), 300);
    }

    // ========== 分层力导向模拟（带板块约束） ==========
    const sim = createLayeredSimulation({
      nodes: nodes as any[],
      linkObjs,
      layoutInfos,
      width,
      height,
    });

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
  }, [data, width, height, activeDomains, activeTypes, activeFlow, flowCurrentStep]);

  // ==================== focusNodeId Effect：搜索定位 ====================
  useEffect(() => {
    if (!focusNodeId || !svgRef.current || !zoomRef.current) return;

    // 等仿真稳定后再定位（延迟 500ms）
    const timer = setTimeout(() => {
      const node = nodesDataRef.current.find((n: any) => n.id === focusNodeId);
      if (!node || node.x == null || node.y == null) return;

      const svg = d3.select(svgRef.current!);
      const zoom = zoomRef.current!;

      // 将目标节点平移到画布中心并放大
      const targetScale = 1.8;
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(targetScale)
        .translate(-node.x, -node.y);

      svg.transition().duration(600).ease(d3.easeCubicInOut)
        .call(zoom.transform as any, transform);

      // 脉冲高亮效果：搜索命中节点闪烁 3 次
      const g = svg.select('g');
      const nodeEl = g.selectAll('.node')
        .filter((d: any) => d.id === focusNodeId);

      let count = 0;
      const pulse = () => {
        if (count >= 6) {
          // 恢复正常样式
          nodeEl.select('circle')
            .attr('stroke', (d: any) => d.stroke)
            .attr('stroke-width', (d: any) => d.strokeWidth)
            .attr('filter', null);
          return;
        }
        const on = count % 2 === 0;
        nodeEl.select('circle')
          .attr('stroke', on ? '#22D3EE' : (d: any) => d.stroke)
          .attr('stroke-width', on ? 5 : (d: any) => d.strokeWidth)
          .attr('filter', on ? 'url(#glow-focus)' : null);
        count++;
        setTimeout(pulse, 300);
      };
      pulse();
    }, 500);

    return () => clearTimeout(timer);
  }, [focusNodeId, width, height]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <svg ref={svgRef} style={{ display: 'block', background: '#0B0F19', cursor: 'grab', width: '100%', height: '100%' }} />
    </div>
  );
});
