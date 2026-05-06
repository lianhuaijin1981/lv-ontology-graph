/**
 * 分层布局引擎 — 业务板块空间分区
 *
 * 核心设计：
 * - 9大业务板块按"供应链→生产→销售"逻辑分三层排列
 * - 上游层：研发设计 / 供应链管理 / 质量管控
 * - 中游层：生产制造 / 业务系统支撑（核心+支撑）
 * - 下游层：市场渠道销售 / 订单物流报关 / 成本利润核算 / 经营风险管控
 * - 每层内板块按水平位置均匀分布，节点在板块区域内用弱力导向微调
 * - 板块间有明确的视觉分区（背景色块）
 */

import type { GraphNode, GraphLink } from '@/graph/types';

// ==================== 板块分层定义 ====================

export interface DomainZone {
  domain: string;
  label: string;
  tier: number;           // 层级: 1=上游, 2=中游, 3=下游
  cx: number;             // 中心X
  cy: number;             // 中心Y
  width: number;          // 区域宽度
  height: number;         // 区域高度
  color: string;          // 板块主题色(半透明)
  borderColor: string;    // 边框色
}

/** 层级配置 */
export interface TierConfig {
  label: string;
  yRatio: number;         // Y轴位置比例 (0~1)
  heightRatio: number;    // 高度占比
}

export const TIERS: TierConfig[] = [
  { label: '上游：研发·供应·质量', yRatio: 0.08, heightRatio: 0.30 },
  { label: '中游：生产·系统',     yRatio: 0.40, heightRatio: 0.28 },
  { label: '下游：销售·订单·成本·风险', yRatio: 0.70, heightRatio: 0.26 },
];

// ==================== 板块→域映射 ====================

const DOMAIN_TIER_MAP: Record<string, number> = {
  '研发设计': 1,
  '供应链管理': 1,
  '质量管控': 1,
  '生产制造': 2,
  '业务系统支撑': 2,
  '市场渠道销售': 3,
  '订单物流报关': 3,
  '成本利润核算': 3,
  '经营风险管控': 3,
};

const DOMAIN_COLORS: Record<string, { bg: string; border: string }> = {
  '研发设计':       { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.20)' },
  '生产制造':       { bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.20)' },
  '供应链管理':     { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.20)' },
  '质量管控':       { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.20)' },
  '业务系统支撑':   { bg: 'rgba(139,92,246,0.06)',  border: 'rgba(139,92,246,0.20)' },
  '市场渠道销售':   { bg: 'rgba(236,72,153,0.06)',  border: 'rgba(236,72,153,0.20)' },
  '订单物流报关':   { bg: 'rgba(6,182,212,0.06)',   border: 'rgba(6,182,212,0.20)' },
  '成本利润核算':   { bg: 'rgba(249,115,22,0.06)',  border: 'rgba(249,115,22,0.20)' },
  '经营风险管控':   { bg: 'rgba(220,38,38,0.06)',   border: 'rgba(220,38,38,0.20)' },
};

// ==================== 核心算法：计算所有板块区域 ====================

export function computeDomainZones(
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 60
): DomainZone[] {
  const zones: DomainZone[] = [];
  const innerW = canvasWidth - padding * 2;
  const innerH = canvasHeight - padding * 2;

  // 按层级分组
  const domainsByTier: Record<number, string[]> = {};
  Object.entries(DOMAIN_TIER_MAP).forEach(([domain, tier]) => {
    if (!domainsByTier[tier]) domainsByTier[tier] = [];
    domainsByTier[tier].push(domain);
  });

  // 每个层级计算区域
  TIERS.forEach((tierCfg, tierIdx) => {
    const tierNum = tierIdx + 1;
    const domains = domainsByTier[tierNum] || [];
    if (domains.length === 0) return;

    const tierY = padding + innerH * tierCfg.yRatio;
    const tierH = innerH * tierCfg.heightRatio;
    const zoneW = innerW / domains.length;

    domains.forEach((domain, i) => {
      const colors = DOMAIN_COLORS[domain] || { bg: 'rgba(100,116,139,0.05)', border: 'rgba(100,116,139,0.15)' };
      zones.push({
        domain,
        label: domain,
        tier: tierNum,
        cx: padding + zoneW * (i + 0.5),
        cy: tierY + tierH / 2,
        width: zoneW * 0.85,
        height: tierH * 0.85,
        color: colors.bg,
        borderColor: colors.border,
      });
    });
  });

  return zones;
}

// ==================== 节点初始位置分配 ====================

export interface NodeLayoutInfo {
  id: string;
  x: number;
  y: number;
  /** 所属板块 */
  domain: string;
  /** 固定力度（板块核心节点更强） */
  fixStrength: number;
}

/**
 * 为每个节点计算基于板块的初始位置
 * 同一板块内的节点采用"中心放射+网格偏移"策略避免重叠
 */
export function assignNodePositions(
  nodes: GraphNode[],
  zones: DomainZone[],
  /** 随机种子偏移（避免每次完全一致） */
  seed: number = 0
): NodeLayoutInfo[] {
  const zoneMap = new Map<string, DomainZone>();
  zones.forEach(z => zoneMap.set(z.domain, z));

  // 按板块分组
  const nodesByDomain: Record<string, GraphNode[]> = {};
  nodes.forEach(n => {
    const d = n.domain || '其他';
    if (!nodesByDomain[d]) nodesByDomain[d] = [];
    nodesByDomain[d].push(n);
  });

  const result: NodeLayoutInfo[] = [];

  Object.entries(nodesByDomain).forEach(([domain, domainNodes]) => {
    const zone = zoneMap.get(domain);
    if (!zone) {
      // 无匹配板块 → 放到画布底部中间
      domainNodes.forEach((n, i) => {
        result.push({
          id: n.id,
          x: 400 + (i % 5) * 80,
          y: 700 + Math.floor(i / 5) * 60,
          domain,
          fixStrength: 0.05,
        });
      });
      return;
    }

    const count = domainNodes.length;
    const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    const cellW = zone.width * 0.7 / Math.max(cols, 1);
    const cellH = zone.height * 0.75 / Math.max(rows, 1);
    const startX = zone.cx - (cols * cellW) / 2;
    const startY = zone.cy - (rows * cellH) / 2;

    domainNodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 网格基础位置 + 小幅抖动
      const jitterX = ((Math.sin(seed + i * 1.7) + 1) * 0.5 - 0.5) * cellW * 0.3;
      const jitterY = ((Math.cos(seed + i * 2.3) + 1) * 0.5 - 0.5) * cellH * 0.3;

      // 核心节点（高重要性）固定力更强
      const isCore = n.importance >= 0.85;
      result.push({
        id: n.id,
        x: startX + col * cellW + cellW / 2 + jitterX,
        y: startY + row * cellH + cellH / 2 + jitterY,
        domain,
        fixStrength: isCore ? 0.35 : 0.15,
      });
    });
  });

  return result;
}

// ==================== D3 力导向增强 ====================

import * as d3 from 'd3';

export interface LayoutForcesConfig {
  nodes: any[];
  linkObjs: any[];
  layoutInfos: NodeLayoutInfo[];
  width: number;
  height: number;
}

/**
 * 创建带有板块约束的 D3 力模拟
 * 在标准力导向基础上增加：
 * 1. forceX/forceY 向各节点所属板块中心吸引
 * 2. 板块内碰撞检测加强
 */
export function createLayeredSimulation(cfg: LayoutForcesConfig): d3.Simulation<any, any> {
  const infoMap = new Map(cfg.layoutInfos.map(info => [info.id, info]));

  return d3.forceSimulation(cfg.nodes as any)
    .force('link', d3.forceLink(cfg.linkObjs as any)
      .id((d: any) => d.id)
      .distance(120)
      .strength(0.5))
    .force('charge', d3.forceManyBody().strength(-1200))
    .force('collide', d3.forceCollide().radius((d: any) => (d.r || 30) + 25))
    // 板块中心吸引力 — 将节点拉向所属板块区域
    .force('domainX', d3.forceX((d: any) => {
      const info = infoMap.get(d.id);
      return info?.x ?? cfg.width / 2;
    }).strength((d: any) => {
      const info = infoMap.get(d.id);
      return info?.fixStrength ?? 0.08;
    }))
    .force('domainY', d3.forceY((d: any) => {
      const info = infoMap.get(d.id);
      return info?.y ?? cfg.height / 2;
    }).strength((d: any) => {
      const info = infoMap.get(d.id);
      return info?.fixStrength ?? 0.08;
    }))
    .alphaDecay(0.035)
    .velocityDecay(0.55);
}
