/**
 * GraphCanvas - 直接使用 D3 的图谱画布
 */

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { EntityId } from '@/types';
import type { GraphData, GraphNode, GraphLink } from '@/graph/types';

interface GraphCanvasProps {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick?: (nodeId: EntityId) => void;
  selectedNodeId?: EntityId;
}

export function GraphCanvas({
  data,
  width,
  height,
  onNodeClick,
  selectedNodeId,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedRef = useRef<string | undefined>(selectedNodeId);

  selectedRef.current = selectedNodeId;

  // 完整重建（尺寸变化或首次挂载）
  useEffect(() => {
    if (!containerRef.current || width <= 0 || height <= 0) return;

    // 清理
    containerRef.current.innerHTML = '';
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    // 创建 SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.display = 'block';
    svg.style.cursor = 'grab';
    containerRef.current.appendChild(svg);
    svgRef.current = svg;

    const svgD3 = d3.select(svg);

    // 箭头标记
    const defs = svgD3.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#94A3B8');

    // 主容器
    const g = svgD3.append('g');
    gRef.current = g.node();

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });
    svgD3.call(zoom).on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // 背景点击
    svgD3.on('click', (event) => {
      if (event.target === svg) {
        // 取消选中
        renderHighlight(null);
      }
    });

    // 渲染数据
    if (data.nodes.length > 0) {
      renderGraph(svgD3, g, data, width, height, onNodeClick);
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      svgRef.current = null;
      gRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // 数据更新
  useEffect(() => {
    if (!svgRef.current || !gRef.current || data.nodes.length === 0) return;
    const svgD3 = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    renderGraph(svgD3, g, data, width, height, onNodeClick);
  }, [data, width, height, onNodeClick]);

  // 选中高亮
  useEffect(() => {
    renderHighlight(selectedNodeId || null);
  }, [selectedNodeId]);

  function renderHighlight(activeId: string | null) {
    if (!gRef.current) return;
    const g = d3.select(gRef.current);

    g.selectAll<SVGGElement, any>('.node-group').each(function (d) {
      const el = d3.select(this);
      const isMatch = activeId ? (d.id === activeId || isNeighbor(d.id, activeId)) : false;
      const isActive = !activeId || d.id === activeId || isMatch;
      el.select('.node-shape')
        .attr('opacity', isActive ? 1 : 0.15)
        .attr('stroke-opacity', isActive ? 1 : 0.2);
      el.select('.node-label').attr('opacity', isActive ? 1 : 0.1);
      el.select('.node-label-bg').attr('opacity', isActive ? 0.85 : 0.1);
    });

    g.selectAll<SVGGElement, any>('.link-group').each(function (d) {
      const el = d3.select(this);
      const sid = typeof d.source === 'string' ? d.source : d.source.id;
      const tid = typeof d.target === 'string' ? d.target : d.target.id;
      const isActive = !activeId || sid === activeId || tid === activeId;
      el.select('.link-line').attr('opacity', isActive ? 1 : 0.08);
      el.select('.link-label').attr('opacity', isActive ? 1 : 0.05);
      el.select('.link-label-bg').attr('opacity', isActive ? 0.7 : 0);
    });
  }

  function isNeighbor(nodeId: string, centerId: string): boolean {
    return data.links.some((l) => {
      const sid = typeof l.source === 'string' ? l.source : l.source.id;
      const tid = typeof l.target === 'string' ? l.target : l.target.id;
      return (sid === centerId && tid === nodeId) || (tid === centerId && sid === nodeId);
    });
  }

  function renderGraph(
    _svgD3: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    graphData: GraphData,
    w: number,
    h: number,
    onClick?: (id: EntityId) => void,
  ) {
    // 停止旧模拟
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const nodes = graphData.nodes;
    const links = graphData.links;

    // ==================== 渲染连线 ====================
    const linkGroups = g.selectAll<SVGGElement, GraphLink>('.link-group')
      .data(links, (d: any) => d.id);

    linkGroups.exit().remove();

    const linkEnter = linkGroups.enter().append('g').attr('class', 'link-group');

    linkEnter.append('line')
      .attr('class', 'link-line')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', (d) => d.width)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrow)');

    linkEnter.append('rect')
      .attr('class', 'link-label-bg')
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', 'rgba(15, 23, 42, 0.85)');

    linkEnter.append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#CBD5E1')
      .attr('font-size', '9px')
      .attr('font-family', 'system-ui')
      .text((d) => d.label);

    const linkAll = linkEnter.merge(linkGroups as any);

    // ==================== 渲染节点 ====================
    const nodeGroups = g.selectAll<SVGGElement, GraphNode>('.node-group')
      .data(nodes, (d: any) => d.id);

    nodeGroups.exit().remove();

    const nodeEnter = nodeGroups.enter().append('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer');

    // 根据形状创建
    nodeEnter.each(function (d) {
      const el = d3.select(this);
      if (d.shape === 'circle') {
        el.append('circle').attr('class', 'node-shape');
      } else if (d.shape === 'rect') {
        el.append('rect').attr('class', 'node-shape');
      } else if (d.shape === 'diamond' || d.shape === 'hexagon') {
        el.append('polygon').attr('class', 'node-shape');
      } else {
        el.append('circle').attr('class', 'node-shape');
      }
    });

    nodeEnter.append('rect')
      .attr('class', 'node-label-bg')
      .attr('rx', 3).attr('ry', 3)
      .attr('fill', 'rgba(15, 23, 42, 0.85)');

    nodeEnter.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#F1F5F9')
      .attr('font-size', (d) => d.isAggregate ? '13px' : '11px')
      .attr('font-weight', (d) => d.isAggregate ? '600' : '400')
      .attr('font-family', 'system-ui')
      .text((d) => d.label);

    // 事件绑定
    nodeEnter
      .on('click', function (event, d) {
        event.stopPropagation();
        onClick?.(d.id);
      })
      .on('mouseenter', function (_event, d) {
        renderHighlight(d.id);
      })
      .on('mouseleave', function () {
        renderHighlight(selectedRef.current || null);
      });

    // 拖拽
    nodeEnter.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    const nodeAll = nodeEnter.merge(nodeGroups as any);

    // ==================== 力导向模拟 ====================
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(100).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => d.radius + 15))
      .alphaDecay(0.05)
      .velocityDecay(0.6);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      // 更新连线
      linkAll.select<SVGLineElement>('.link-line')
        .attr('x1', (d) => (typeof d.source !== 'string' ? d.source.x! || 0 : 0))
        .attr('y1', (d) => (typeof d.source !== 'string' ? d.source.y! || 0 : 0))
        .attr('x2', (d) => (typeof d.target !== 'string' ? d.target.x! || 0 : 0))
        .attr('y2', (d) => (typeof d.target !== 'string' ? d.target.y! || 0 : 0));

      linkAll.each(function (d) {
        const sx = typeof d.source !== 'string' ? d.source.x! || 0 : 0;
        const sy = typeof d.source !== 'string' ? d.source.y! || 0 : 0;
        const tx = typeof d.target !== 'string' ? d.target.x! || 0 : 0;
        const ty = typeof d.target !== 'string' ? d.target.y! || 0 : 0;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;

        const group = d3.select(this);
        const text = group.select('.link-label').attr('x', mx).attr('y', my);
        const bg = group.select('.link-label-bg');
        const bbox = (text.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          bg.attr('x', mx - bbox.width / 2 - 4)
            .attr('y', my - bbox.height / 2 - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4);
        }
      });

      // 更新节点位置
      nodeAll.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);

      // 更新节点形状
      nodeAll.each(function (d) {
        const el = d3.select(this).select('.node-shape');
        if (d.shape === 'circle') {
          el.attr('r', d.radius)
            .attr('fill', d.color)
            .attr('stroke', '#0F172A')
            .attr('stroke-width', 1.5);
        } else if (d.shape === 'rect') {
          el.attr('width', d.radius * 2)
            .attr('height', d.radius * 1.6)
            .attr('x', -d.radius)
            .attr('y', -d.radius * 0.8)
            .attr('fill', d.color)
            .attr('stroke', '#0F172A')
            .attr('stroke-width', 1.5)
            .attr('rx', 3);
        } else if (d.shape === 'diamond') {
          const r = d.radius;
          el.attr('points', `0,-${r} ${r},0 0,${r} -${r},0`)
            .attr('fill', d.color)
            .attr('stroke', '#0F172A')
            .attr('stroke-width', 1.5);
        } else if (d.shape === 'hexagon') {
          const r = d.radius;
          const pts = [
            [r, 0], [r / 2, r * 0.866], [-r / 2, r * 0.866],
            [-r, 0], [-r / 2, -r * 0.866], [r / 2, -r * 0.866],
          ].map((p) => p.join(',')).join(' ');
          el.attr('points', pts)
            .attr('fill', d.color)
            .attr('stroke', '#0F172A')
            .attr('stroke-width', 1.5);
        }
      });

      // 更新标签背景
      nodeAll.each(function () {
        const group = d3.select(this);
        const text = group.select('.node-label');
        const textNode = text.node() as SVGTextElement | null;
        if (textNode) {
          const bbox = textNode.getBBox();
          group.select('.node-label-bg')
            .attr('x', bbox.x - 4)
            .attr('y', bbox.y - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4);
        }
      });
    });

    // 初始适应视图
    setTimeout(() => {
      if (!svgRef.current) return;
      const xs = nodes.map((n) => n.x || 0);
      const ys = nodes.map((n) => n.y || 0);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const dx = (maxX - minX) || 1, dy = (maxY - minY) || 1;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const scale = Math.min((w - 80) / dx, (h - 80) / dy, 1.5);
      const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(Math.max(scale, 0.2)).translate(-cx, -cy);
      if (zoomRef.current) {
        d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, t);
      }
    }, 100);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, width: `${width}px`, height: `${height}px` }}
    />
  );
}
