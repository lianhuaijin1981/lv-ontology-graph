/**
 * D3.js 力导向图谱渲染引擎
 * 
 * 核心特性：
 * 1. 力导向物理模拟（d3-force）
 * 2. 状态机渲染（Map / Investigate / Breadcrumb / Search）
 * 3. 视窗裁剪 + LOD 聚合
 * 4. 平滑动画过渡
 * 5. 交互事件系统（点击、悬停、拖拽、缩放）
 * 
 * 可扩展设计：
 * - 节点数量 >500 时启用视窗裁剪（只渲染视窗内节点）
 * - 支持 Web Worker 卸载力计算（Phase 2）
 */

import * as d3 from 'd3';
import type { EntityId, LinkId } from '@/types';
import { DEFAULT_RENDER_CONFIG } from '@/types';
import type { GraphRenderConfig } from '@/types';
import type {
  GraphData,
  GraphNode,
  GraphLink,
  GraphState,
  GraphMode,
  GraphEvent,
  NodeRenderState,
  LinkRenderState,
} from '@/graph/types';

export interface GraphEngineOptions {
  container: SVGSVGElement;
  width: number;
  height: number;
  config?: Partial<GraphRenderConfig>;
  onEvent?: (event: GraphEvent) => void;
}

export class GraphEngine {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private simulation: d3.Simulation<GraphNode, undefined> | null = null;
  private nodes: GraphNode[] = [];
  private links: GraphLink[] = [];
  private state: GraphState = {
    mode: 'map',
    breadcrumbPath: [],
    searchResultIds: [],
    highlightedPathIds: new Set(),
  };
  private config: GraphRenderConfig;
  private width: number;
  private height: number;
  private onEvent?: (event: GraphEvent) => void;
  private isDestroyed = false;

  // D3 selections
  private linkSelection!: d3.Selection<SVGGElement, GraphLink, SVGGElement, unknown>;
  private nodeSelection!: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;

  constructor(options: GraphEngineOptions) {
    this.svg = d3.select(options.container);
    this.width = options.width;
    this.height = options.height;
    this.config = { ...DEFAULT_RENDER_CONFIG, ...options.config };
    this.onEvent = options.onEvent;

    this.initSVG();
  }

  private initSVG(): void {
    this.svg.selectAll('*').remove();
    this.svg.attr('width', this.width).attr('height', this.height);

    // 定义箭头标记
    const defs = this.svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94A3B8');

    // 主容器（缩放层）
    this.g = this.svg.append('g');

    // 缩放行为
    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        if (this.isDestroyed) return;
        this.g.attr('transform', event.transform.toString());
        this.onEvent?.({ type: 'zoom', payload: { transform: event.transform } });
      });

    this.svg.call(this.zoomBehavior).on('dblclick.zoom', null);

    // 背景点击
    this.svg.on('click', (event) => {
      if (this.isDestroyed) return;
      if (event.target === this.svg.node()) {
        this.onEvent?.({
          type: 'backgroundClick',
          payload: { position: { x: event.offsetX, y: event.offsetY } },
        });
        this.setSelectedNode(undefined);
      }
    });
  }

  // ==================== 数据加载 ====================

  setData(data: GraphData): void {
    if (this.isDestroyed) return;
    this.nodes = data.nodes;
    this.links = data.links;
    this.render();
    this.startSimulation();
  }

  updateData(data: GraphData): void {
    if (this.isDestroyed) return;
    this.nodes = data.nodes;
    this.links = data.links;
    this.render();
    this.restartSimulation();
  }

  // ==================== 力导向模拟 ====================

  private startSimulation(): void {
    if (this.simulation) this.simulation.stop();
    if (this.isDestroyed) return;

    this.simulation = d3
      .forceSimulation<GraphNode>(this.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(this.links)
          .id((d) => d.id)
          .distance(this.config.linkDistance)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(this.config.chargeStrength))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force(
        'collide',
        d3.forceCollide<GraphNode>().radius((d) => d.radius + this.config.collideRadius)
      )
      .alphaDecay(this.config.alphaDecay)
      .velocityDecay(this.config.velocityDecay)
      .on('tick', () => this.onTick());
  }

  private restartSimulation(): void {
    if (!this.simulation) {
      this.startSimulation();
      return;
    }
    this.simulation.nodes(this.nodes);
    const linkForce = this.simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>;
    linkForce.links(this.links);
    this.simulation.alpha(1).restart();
  }

  // ==================== 渲染层 ====================

  private render(): void {
    if (this.isDestroyed) return;

    // 渲染连线组
    const linkGroups = this.g
      .selectAll<SVGGElement, GraphLink>('.link-group')
      .data(this.links, (d: any) => d.id);

    linkGroups.exit().transition().duration(200).attr('opacity', 0).remove();

    const linkGroupsEnter = linkGroups
      .enter()
      .append('g')
      .attr('class', 'link-group')
      .attr('cursor', 'pointer');

    linkGroupsEnter
      .append('line')
      .attr('class', 'link-line')
      .attr('stroke-width', (d) => d.width)
      .attr('stroke', (d) => d.color)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', (d) => (d.directed ? 'url(#arrow)' : ''));

    linkGroupsEnter
      .append('rect')
      .attr('class', 'link-label-bg')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(15, 23, 42, 0.85)')
      .attr('stroke', 'none');

    linkGroupsEnter
      .append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#CBD5E1')
      .attr('font-size', '9px')
      .attr('font-family', 'system-ui')
      .text((d) => d.label);

    this.linkSelection = linkGroupsEnter.merge(linkGroups as any);

    // 渲染节点组
    const nodeGroups = this.g
      .selectAll<SVGGElement, GraphNode>('.node-group')
      .data(this.nodes, (d: any) => d.id);

    nodeGroups.exit().transition().duration(200).attr('opacity', 0).remove();

    const nodeGroupsEnter = nodeGroups
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (this.isDestroyed) return;
            if (!event.active && this.simulation) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            this.onEvent?.({ type: 'dragStart', payload: { nodeId: d.id } });
          })
          .on('drag', (event, d) => {
            if (this.isDestroyed) return;
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (this.isDestroyed) return;
            if (!event.active && this.simulation) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            this.onEvent?.({ type: 'dragEnd', payload: { nodeId: d.id } });
          })
      );

    // 节点形状（按 shape 类型）
    nodeGroupsEnter.each(function (d) {
      const el = d3.select(this);
      if (d.shape === 'circle') {
        el.append('circle').attr('class', 'node-shape');
      } else if (d.shape === 'rect') {
        el.append('rect').attr('class', 'node-shape');
      } else if (d.shape === 'diamond') {
        el.append('polygon').attr('class', 'node-shape');
      } else if (d.shape === 'hexagon') {
        el.append('polygon').attr('class', 'node-shape');
      } else {
        el.append('circle').attr('class', 'node-shape');
      }
    });

    // 节点标签背景
    nodeGroupsEnter
      .append('rect')
      .attr('class', 'node-label-bg')
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', 'rgba(15, 23, 42, 0.85)')
      .attr('stroke', 'none');

    // 节点标签
    nodeGroupsEnter
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#F1F5F9')
      .attr('font-size', (d) => (d.isAggregate ? '13px' : '11px'))
      .attr('font-weight', (d) => (d.isAggregate ? '600' : '400'))
      .attr('font-family', 'system-ui')
      .text((d) => d.label);

    // 事件绑定
    nodeGroupsEnter
      .on('click', (event, d) => {
        if (this.isDestroyed) return;
        event.stopPropagation();
        this.onEvent?.({
          type: 'nodeClick',
          payload: { node: d, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey },
        });
        this.setSelectedNode(d.id);
      })
      .on('mouseenter', (event, d) => {
        if (this.isDestroyed) return;
        this.onEvent?.({
          type: 'nodeHover',
          payload: { node: d, position: { x: event.offsetX, y: event.offsetY } },
        });
        this.setHoveredNode(d.id);
      })
      .on('mouseleave', (_, d) => {
        if (this.isDestroyed) return;
        this.onEvent?.({ type: 'nodeLeave', payload: { nodeId: d.id } });
        this.setHoveredNode(undefined);
      });

    this.nodeSelection = nodeGroupsEnter.merge(nodeGroups as any);

    this.updateVisuals();
  }

  // ==================== 每帧更新 ====================

  private onTick(): void {
    if (this.isDestroyed) return;

    // 更新连线
    this.linkSelection.selectAll<SVGLineElement, GraphLink>('.link-line')
      .attr('x1', (d) => (typeof d.source !== 'string' ? d.source.x! || 0 : 0))
      .attr('y1', (d) => (typeof d.source !== 'string' ? d.source.y! || 0 : 0))
      .attr('x2', (d) => (typeof d.target !== 'string' ? d.target.x! || 0 : 0))
      .attr('y2', (d) => (typeof d.target !== 'string' ? d.target.y! || 0 : 0));

    // 更新连线标签位置
    this.linkSelection.each(function (d) {
      const sx = typeof d.source !== 'string' ? d.source.x! || 0 : 0;
      const sy = typeof d.source !== 'string' ? d.source.y! || 0 : 0;
      const tx = typeof d.target !== 'string' ? d.target.x! || 0 : 0;
      const ty = typeof d.target !== 'string' ? d.target.y! || 0 : 0;
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;

      const group = d3.select(this);
      const text = group.select('.link-label');
      const bg = group.select('.link-label-bg');
      text.attr('x', mx).attr('y', my);

      const textNode = text.node() as SVGTextElement | null;
      if (textNode) {
        const bbox = textNode.getBBox();
        bg.attr('x', mx - bbox.width / 2 - 4)
          .attr('y', my - bbox.height / 2 - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);
      }
    });

    // 更新节点位置
    this.nodeSelection.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);

    // 更新节点形状
    this.nodeSelection.each(function (d) {
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
        const points = [
          [r, 0],
          [r / 2, r * 0.866],
          [-r / 2, r * 0.866],
          [-r, 0],
          [-r / 2, -r * 0.866],
          [r / 2, -r * 0.866],
        ]
          .map((p) => p.join(','))
          .join(' ');
        el.attr('points', points)
          .attr('fill', d.color)
          .attr('stroke', '#0F172A')
          .attr('stroke-width', 1.5);
      }
    });

    // 更新节点标签背景
    this.nodeSelection.each(function () {
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
  }

  // ==================== 状态管理 ====================

  setMode(mode: GraphMode): void {
    this.state.mode = mode;
    this.updateVisuals();
  }

  setSelectedNode(nodeId: EntityId | undefined): void {
    this.state.selectedNodeId = nodeId;
    this.state.mode = nodeId ? 'investigate' : 'map';
    this.updateVisuals();
  }

  setHoveredNode(nodeId: EntityId | undefined): void {
    this.state.hoveredNodeId = nodeId;
    if (!this.state.selectedNodeId) {
      this.updateVisuals();
    }
  }

  addBreadcrumb(nodeId: EntityId): void {
    if (!this.state.breadcrumbPath.includes(nodeId)) {
      this.state.breadcrumbPath.push(nodeId);
    }
    this.state.mode = 'breadcrumb';
    this.updateVisuals();
  }

  setSearchResults(nodeIds: EntityId[]): void {
    this.state.searchResultIds = nodeIds;
    this.state.mode = 'search';
    this.updateVisuals();
  }

  clearSearch(): void {
    this.state.searchResultIds = [];
    if (this.state.mode === 'search') {
      this.state.mode = this.state.selectedNodeId ? 'investigate' : 'map';
    }
    this.updateVisuals();
  }

  // ==================== 视觉状态更新 ====================

  private updateVisuals(): void {
    const { mode, selectedNodeId, hoveredNodeId, breadcrumbPath, searchResultIds, highlightedPathIds } = this.state;

    const nodeStates = new Map<EntityId, NodeRenderState>();
    const linkStates = new Map<LinkId, LinkRenderState>();

    for (const n of this.nodes) nodeStates.set(n.id, 'default');
    for (const l of this.links) linkStates.set(l.id, 'default');

    if (mode === 'map') {
      for (const n of this.nodes) {
        if (n.isAggregate) {
          nodeStates.set(n.id, 'highlighted');
        } else if (n.level >= 2) {
          nodeStates.set(n.id, 'dimmed');
        }
      }
      for (const l of this.links) {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        const s = this.nodes.find((n) => n.id === sourceId);
        const t = this.nodes.find((n) => n.id === targetId);
        if (s?.isAggregate || t?.isAggregate) {
          linkStates.set(l.id, 'default');
        } else {
          linkStates.set(l.id, 'hidden');
        }
      }
    } else if (mode === 'investigate' && selectedNodeId) {
      nodeStates.set(selectedNodeId, 'selected');
      const hop1 = new Set<EntityId>();
      const hop2 = new Set<EntityId>();

      for (const l of this.links) {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;

        if (sourceId === selectedNodeId) {
          hop1.add(targetId);
          linkStates.set(l.id, 'highlighted');
        } else if (targetId === selectedNodeId) {
          hop1.add(sourceId);
          linkStates.set(l.id, 'highlighted');
        }
      }

      for (const l of this.links) {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        if (hop1.has(sourceId) && targetId !== selectedNodeId) {
          hop2.add(targetId);
          if (linkStates.get(l.id) === 'default') linkStates.set(l.id, 'dimmed');
        }
        if (hop1.has(targetId) && sourceId !== selectedNodeId) {
          hop2.add(sourceId);
          if (linkStates.get(l.id) === 'default') linkStates.set(l.id, 'dimmed');
        }
      }

      for (const id of hop1) {
        if (nodeStates.get(id) === 'default') nodeStates.set(id, 'highlighted');
      }
      for (const id of hop2) {
        if (nodeStates.get(id) === 'default') nodeStates.set(id, 'dimmed');
      }
      for (const n of this.nodes) {
        if (nodeStates.get(n.id) === 'default') nodeStates.set(n.id, 'dimmed');
      }
      for (const l of this.links) {
        if (linkStates.get(l.id) === 'default') linkStates.set(l.id, 'hidden');
      }
    } else if (mode === 'breadcrumb') {
      for (const id of breadcrumbPath) {
        nodeStates.set(id, 'visited');
      }
      if (selectedNodeId) {
        nodeStates.set(selectedNodeId, 'selected');
      }
      for (const l of this.links) {
        if (highlightedPathIds.has(l.id)) {
          linkStates.set(l.id, 'path');
        } else {
          linkStates.set(l.id, 'dimmed');
        }
      }
    } else if (mode === 'search' && searchResultIds.length > 0) {
      for (const id of searchResultIds) {
        nodeStates.set(id, 'highlighted');
      }
      for (const n of this.nodes) {
        if (!searchResultIds.includes(n.id)) {
          nodeStates.set(n.id, 'dimmed');
        }
      }
    }

    if (hoveredNodeId && !selectedNodeId) {
      nodeStates.set(hoveredNodeId, 'hovered');
    }

    this.applyNodeStates(nodeStates);
    this.applyLinkStates(linkStates);
  }

  private applyNodeStates(states: Map<EntityId, NodeRenderState>): void {
    this.nodeSelection.each((d) => {
      const state = states.get(d.id) || 'default';
      d.state = state;

      const group = d3.select<SVGGElement, GraphNode>(this.nodeSelection.nodes()[this.nodes.indexOf(d)] as SVGGElement);
      const shape = group.select('.node-shape');
      const label = group.select('.node-label');
      const labelBg = group.select('.node-label-bg');

      switch (state) {
        case 'selected':
          shape.attr('stroke', '#FFFFFF').attr('stroke-width', 3).attr('opacity', 1);
          label.attr('fill', '#FFFFFF').attr('font-weight', '700').attr('opacity', 1);
          labelBg.attr('fill', 'rgba(139, 92, 246, 0.9)').attr('opacity', 1);
          break;
        case 'highlighted':
          shape.attr('stroke-opacity', 1).attr('opacity', 1);
          label.attr('opacity', 1);
          labelBg.attr('opacity', 1);
          break;
        case 'dimmed':
          shape.attr('stroke-opacity', 0.2).attr('opacity', 0.25);
          label.attr('opacity', 0.3);
          labelBg.attr('opacity', 0.2);
          break;
        case 'hidden':
          shape.attr('opacity', 0);
          label.attr('opacity', 0);
          labelBg.attr('opacity', 0);
          break;
        case 'visited':
          shape.attr('stroke', '#F59E0B').attr('stroke-width', 2).attr('stroke-dasharray', '4,2').attr('opacity', 1);
          label.attr('fill', '#F59E0B').attr('opacity', 1);
          labelBg.attr('opacity', 0.8);
          break;
        case 'hovered':
          shape.attr('stroke', '#FFFFFF').attr('stroke-width', 2).attr('opacity', 1);
          label.attr('opacity', 1);
          labelBg.attr('opacity', 1);
          break;
        default:
          shape
            .attr('stroke', '#0F172A')
            .attr('stroke-width', 1.5)
            .attr('opacity', d.isAggregate ? 1 : 0.85)
            .attr('stroke-opacity', 1)
            .attr('stroke-dasharray', null);
          label
            .attr('opacity', d.isAggregate ? 1 : 0.92)
            .attr('fill', '#F1F5F9')
            .attr('font-weight', d.isAggregate ? '600' : '400');
          labelBg.attr('opacity', d.isAggregate ? 0.85 : 0.6);
      }
    });
  }

  private applyLinkStates(states: Map<LinkId, LinkRenderState>): void {
    this.linkSelection.each((d) => {
      const state = states.get(d.id) || 'default';
      d.state = state;

      const group = d3.select<SVGGElement, GraphLink>(this.linkSelection.nodes()[this.links.indexOf(d)] as SVGGElement);
      const line = group.select('.link-line');
      const label = group.select('.link-label');
      const labelBg = group.select('.link-label-bg');

      switch (state) {
        case 'highlighted':
          line.attr('stroke-opacity', 0.9).attr('stroke-width', d.width * 1.8).attr('opacity', 1);
          label.attr('opacity', 1);
          labelBg.attr('opacity', 1);
          break;
        case 'path':
          line.attr('stroke', '#F59E0B').attr('stroke-opacity', 0.9).attr('stroke-width', d.width * 2).attr('opacity', 1);
          label.attr('opacity', 1).attr('fill', '#F59E0B');
          labelBg.attr('opacity', 0.9).attr('fill', 'rgba(15, 23, 42, 0.95)');
          break;
        case 'dimmed':
          line.attr('stroke-opacity', 0.15).attr('opacity', 1);
          label.attr('opacity', 0.15);
          labelBg.attr('opacity', 0);
          break;
        case 'hidden':
          line.attr('opacity', 0);
          label.attr('opacity', 0);
          labelBg.attr('opacity', 0);
          break;
        default:
          line.attr('stroke-opacity', 0.5).attr('stroke-width', d.width).attr('stroke', d.color).attr('opacity', 1);
          label.attr('opacity', 0.6).attr('fill', '#CBD5E1');
          labelBg.attr('opacity', 0.7).attr('fill', 'rgba(15, 23, 42, 0.85)');
      }
    });
  }

  // ==================== 视图控制 ====================

  fitView(): void {
    if (!this.nodes.length || this.isDestroyed) return;
    const xs = this.nodes.map((n) => n.x || 0);
    const ys = this.nodes.map((n) => n.y || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const scale = Math.min(
      (this.width - 80) / dx,
      (this.height - 80) / dy,
      1.5
    );

    const transform = d3.zoomIdentity
      .translate(this.width / 2, this.height / 2)
      .scale(Math.max(scale, 0.2))
      .translate(-cx, -cy);

    this.svg.transition().duration(750).call(this.zoomBehavior.transform as any, transform);
  }

  resetView(): void {
    if (this.isDestroyed) return;
    this.svg.transition().duration(750).call(this.zoomBehavior.transform as any, d3.zoomIdentity);
  }

  focusNode(nodeId: EntityId): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.x == null || node.y == null || this.isDestroyed) return;

    const transform = d3.zoomIdentity
      .translate(this.width / 2, this.height / 2)
      .scale(1.5)
      .translate(-node.x, -node.y);

    this.svg.transition().duration(450).call(this.zoomBehavior.transform as any, transform);
  }

  // ==================== 生命周期 ====================

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.svg.attr('width', width).attr('height', height);
    if (this.simulation && !this.isDestroyed) {
      this.simulation.force('center', d3.forceCenter(width / 2, height / 2));
      this.simulation.alpha(0.3).restart();
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
    this.svg.selectAll('*').remove();
    this.nodes = [];
    this.links = [];
  }
}
