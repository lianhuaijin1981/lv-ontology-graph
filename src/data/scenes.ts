/**
 * 5大业务场景配置
 *
 * 每个场景描述：
 * 1. 触发条件：用户点击什么类型的节点时自动推荐
 * 2. 分析逻辑：图谱如何高亮、追踪、计算
 * 3. 输出洞察：结论面板展示什么内容
 *
 * S1: 订单追踪 — 点击订单节点→沿F1流程高亮当前步骤
 * S2: 成本归因 — 点击成本/利润节点→F2反向追踪Top3驱动因子
 * S3: 质量回溯 — 点击风险/质检节点→F3闭环回溯根因
 * S4: 产能瓶颈 — 生产区热力图分析→瓶颈工序识别
 * S5: 供应商风险 — 展开供应链依赖子图→风险评估
 */

import type { EntityId } from '@/types';
import type { ProcessFlow } from './processFlows';
import {
  ORDER_LIFECYCLE_FLOW, COST_RISK_FLOW, QC_CLOSED_LOOP_FLOW,
  CAPACITY_ANALYSIS_FLOW, SUPPLY_CHAIN_RISK_FLOW, findFlowForNode
} from './processFlows';

// ==================== 场景类型定义 ====================

export interface SceneInsight {
  /** 洞察标题 */
  title: string;
  /** 洞察内容（支持简单HTML标签） */
  content: string;
  /** 严重级别: info / warning / danger */
  level: 'info' | 'warning' | 'danger';
  /** 关联的节点ID列表（用于图谱联动高亮） */
  relatedNodeIds: EntityId[];
  /** 推荐动作 */
  action?: string;
}

export interface BusinessScene {
  /** 场景ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 图标 */
  icon: string;
  /** 简短描述 */
  description: string;
  /** 适用触发节点类型ID列表 */
  triggerTypeIds: string[];
  /** 执行分析，返回洞察结果 */
  analyze: (entityId: EntityId) => SceneResult;
}

export interface SceneResult {
  scene: BusinessScene;
  insights: SceneInsight[];
  /** 关联的流程（可选） */
  flow?: ProcessFlow;
  /** 流程当前步骤（用于步骤高亮） */
  flowStep?: number;
  /** 需要额外高亮的节点集合 */
  highlightIds: EntityId[];
}

// ==================== S1: 订单追踪场景 ====================

const orderTrackingScene: BusinessScene = {
  id: 'order-tracking',
  name: '订单追踪',
  icon: '📦',
  description: '追踪订单从下单到交付的全生命周期状态',
  triggerTypeIds: ['order', 'logistics'],

  analyze(entityId: EntityId): SceneResult {
    // 在订单全生命周期流程中定位该节点
    const flowInfo = findFlowForNode(entityId);
    const currentStep = flowInfo?.stepIndex ?? -1;

    if (currentStep < 0) {
      return {
        scene: orderTrackingScene,
        insights: [{
          title: '未找到匹配流程',
          content: `该订单不在标准生产流程中，可能为特殊订单或独立打样单。`,
          level: 'info',
          relatedNodeIds: [entityId],
          action: '建议手动查看关联的生产计划',
        }],
        highlightIds: [entityId],
      };
    }

    const step = flowInfo!.step;
    const isCompleted = true; // 假设到当前步骤已完成
    const remainingSteps = ORDER_LIFECYCLE_FLOW.steps.slice(currentStep);
    const estimatedDays = remainingSteps.length * 4; // 每步约4天

    const insights: SceneInsight[] = [
      {
        title: `📍 当前步骤: 第${currentStep}步 / ${ORDER_LIFECYCLE_FLOW.steps.length}步`,
        content: `<strong>${step.name}</strong> — ${step.description}`,
        level: isCompleted ? 'info' : 'warning',
        relatedNodeIds: [entityId],
      },
      {
        title: '⏱️ 预计剩余交付周期',
        content: `剩余 <strong>${remainingSteps.length}</strong> 个步骤，预计 <strong>${estimatedDays}</strong> 天`,
        level: estimatedDays > 20 ? 'warning' : 'info',
        relatedNodeIds: remainingSteps.map(s => s.nodeId),
      },
      ...(step.isCritical ? [{
        title: '⚡ 关键决策节点',
        content: `「${step.name}」是流程中的关键决策点，需要特别关注。${step.metric ? `当前指标：${step.metric}` : ''}`,
        level: 'warning' as const,
        relatedNodeIds: [entityId],
        action: '建议确认此环节的资源到位情况',
      }] : []),
      {
        title: '📊 流程健康度',
        content: `整体进度 ${(currentStep / ORDER_LIFECYCLE_FLOW.steps.length * 100).toFixed(0)}%，前序${currentStep}步均已完成`,
        level: 'info',
        relatedNodeIds: ORDER_LIFECYCLE_FLOW.nodeIds,
      },
    ];

    return {
      scene: orderTrackingScene,
      insights,
      flow: ORDER_LIFECYCLE_FLOW,
      flowStep: currentStep + 1,
      highlightIds: ORDER_LIFECYCLE_FLOW.nodeIds,
    };
  },
};

// ==================== S2: 成本归因场景 ====================

const costAttributionScene: BusinessScene = {
  id: 'cost-attribution',
  name: '成本归因',
  icon: '💰',
  description: '反向追踪成本驱动因子，定位利润侵蚀根源',
  triggerTypeIds: ['costItem', 'profitFactor', 'risk'],

  analyze(entityId: EntityId): SceneResult {
    const flowInfo = findFlowForNode(entityId);
    const inCostFlow = !!flowInfo && flowInfo.flow.id === COST_RISK_FLOW.id;

    if (!inCostFlow) {
      return {
        scene: costAttributionScene,
        insights: [{
          title: '成本链路分析',
          content: `该节点未直接纳入成本传导链路，但可能存在间接影响。建议展开查看关联的成本项。`,
          level: 'info',
          relatedNodeIds: [entityId],
        }],
        highlightIds: [entityId],
      };
    }

    const pos = flowInfo!.stepIndex;
    const step = flowInfo!.step;

    // Top3 成本驱动因子
    const topDrivers = COST_RISK_FLOW.steps
      .filter((_, i) => i <= pos)
      .slice(-3)
      .map(s => ({ name: s.name, id: s.nodeId, metric: s.metric }));

    const insights: SceneInsight[] = [
      {
        title: `💵 成本位置: 第${pos + 1}级传导节点`,
        content: `<strong>${step.name}</strong> — ${step.description}${step.metric ? `<br/>数值: ${step.metric}` : ''}`,
        level: step.isCritical ? 'danger' : 'warning',
        relatedNodeIds: [entityId],
      },
      {
        title: '🔝 Top3 成本驱动因子',
        content: topDrivers
          .map((d, i) => `${i + 1}. <strong>${d.name}</strong>${d.metric ? ` (${d.metric})` : ''}`)
          .join('<br/>'),
        level: 'danger',
        relatedNodeIds: topDrivers.map(d => d.id),
        action: '建议针对 Top1 因子制定降本措施',
      },
      {
        title: '📈 传导路径可视化',
        content: `从原材料采购到此节点共有 <strong>${pos + 1}</strong> 级传导路径`,
        level: 'info',
        relatedNodeIds: COST_RISK_FLOW.nodeIds.slice(0, pos + 1),
      },
      {
        title: '🛡️ 风险敞口评估',
        content: COST_RISK_FLOW.steps.filter(s => s.isCritical).length > 0
          ? `发现 ${COST_RISK_FLOW.steps.filter(s => s.isCritical).length} 个关键风险节点，需重点关注`
          : '暂无重大风险预警',
        level: COST_RISK_FLOW.steps.some(s => s.isCritical && s.nodeId === entityId) ? 'danger' : 'info',
        relatedNodeIds: COST_RISK_FLOW.steps.filter(s => s.isCritical).map(s => s.nodeId),
      },
    ];

    return {
      scene: costAttributionScene,
      insights,
      flow: COST_RISK_FLOW,
      flowStep: pos + 1,
      highlightIds: COST_RISK_FLOW.nodeIds,
    };
  },
};

// ==================== S3: 质量回溯场景 ====================

const qualityTracebackScene: BusinessScene = {
  id: 'quality-traceback',
  name: '质量回溯',
  icon: '✅',
  description: '沿质量管控闭环回溯问题根因并给出整改建议',
  triggerTypeIds: ['qcInspector', 'qcStandard', 'risk'],

  analyze(entityId: EntityId): SceneResult {
    const flowInfo = findFlowForNode(entityId);
    const inQCFlow = !!flowInfo && flowInfo.flow.id === QC_CLOSED_LOOP_FLOW.id;

    if (!inQCFlow) {
      return {
        scene: qualityTracebackScene,
        insights: [{
          title: '质量链路分析',
          content: `该节点可关联质量管控流程中的对应环节。`,
          level: 'info',
          relatedNodeIds: [entityId],
        }],
        highlightIds: [entityId],
      };
    }

    const pos = flowInfo!.stepIndex;
    const step = flowInfo!.step;

    // 根因分析：往前追溯所有已完成的步骤
    const upstreamSteps = QC_CLOSED_LOOP_FLOW.steps.slice(0, pos);
    const rootCauses = upstreamSteps.filter(s => s.isCritical);

    const insights: SceneInsight[] = [
      {
        title: `🔍 质检位置: 第${pos + 1}环 / ${QC_CLOSED_LOOP_FLOW.steps.length}环`,
        content: `<strong>${step.name}</strong> — ${step.description}${step.metric ? `<br/>指标: ${step.metric}` : ''}`,
        level: step.isCritical ? 'danger' : 'info',
        relatedNodeIds: [entityId],
      },
      ...(rootCauses.length > 0 ? [{
        title: '🔬 可能根因 (上游关键节点)',
        content: rootCauses
          .map(r => `• <strong>${r.name}</strong>: ${r.description}`)
          .join('<br/>'),
        level: 'warning' as const,
        relatedNodeIds: rootCauses.map(r => r.nodeId),
        action: '建议对以上根因节点逐一排查验证',
      }] : []),
      {
        title: '🔄 整改建议',
        content: pos >= QC_CLOSED_LOOP_FLOW.steps.length - 1
          ? '已到达整改闭环阶段，建议：<br/>1. 记录不良品数量和类型<br/>2. 对应到具体工序/批次<br/>3. 制定纠正预防措施(CAPA)<br/>4. 更新检验标准'
          : `${step.name}环节建议加强抽检频次，完善过程记录`,
        level: pos >= QC_CLOSED_LOOP_FLOW.steps.length - 1 ? 'warning' : 'info',
        relatedNodeIds: [entityId],
      },
      {
        title: '📋 质量闭环状态',
        content: `质量管控闭环完成度: <strong>${Math.round(((pos + 1) / QC_CLOSED_LOOP_FLOW.steps.length) * 100)}%</strong>`,
        level: 'info',
        relatedNodeIds: QC_CLOSED_LOOP_FLOW.nodeIds,
      },
    ];

    return {
      scene: qualityTracebackScene,
      insights,
      flow: QC_CLOSED_LOOP_FLOW,
      flowStep: pos + 1,
      highlightIds: QC_CLOSED_LOOP_FLOW.nodeIds,
    };
  },
};

// ==================== S4: 产能瓶颈场景 (使用F4流程) ====================

const capacityBottleneckScene: BusinessScene = {
  id: 'capacity-bottleneck',
  name: '产能瓶颈',
  icon: '📊',
  description: '沿产能分析流程识别瓶颈工序，提出扩产优化建议',
  triggerTypeIds: ['workshop', 'process', 'equipment', 'team', 'workstation', 'shift'],

  analyze(entityId: EntityId): SceneResult {
    // 在F4产能分析流程中定位该节点
    const flowInfo = findFlowForNode(entityId);
    const inCapacityFlow = !!flowInfo && flowInfo.flow.id === CAPACITY_ANALYSIS_FLOW.id;

    if (!inCapacityFlow) {
      // 节点不在F4流程中，但仍可展示产能相关信息
      return {
        scene: capacityBottleneckScene,
        insights: [{
          title: '产能分析',
          content: `该节点可关联产能分析流程中的对应环节，查看整体OEE监控与瓶颈识别结果。`,
          level: 'info',
          relatedNodeIds: [entityId],
        }],
        highlightIds: [entityId],
      };
    }

    const pos = flowInfo!.stepIndex;
    const step = flowInfo!.step;
    const flow = CAPACITY_ANALYSIS_FLOW;

    // 已完成步骤 + 待处理步骤
    const completed = flow.steps.slice(0, pos);
    const pending = flow.steps.slice(pos);

    const insights: SceneInsight[] = [
      {
        title: `📊 产能分析: 第${pos + 1}步 / ${flow.steps.length}步`,
        content: `<strong>${step.name}</strong> — ${step.description}${step.metric ? `<br/>指标: ${step.metric}` : ''}`,
        level: step.isCritical ? 'danger' : 'info',
        relatedNodeIds: [entityId],
      },
      ...(step.isCritical ? [{
        title: '⚡ 关键瓶颈节点',
        content: `「${step.name}」是产能分析中的关键决策点。${step.metric ? `当前指标：${step.metric}` : ''}`,
        level: 'danger' as const,
        relatedNodeIds: [entityId],
        action: '建议立即查看优化建议并制定改进计划',
      }] : []),
      {
        title: '📈 已完成分析步骤',
        content: completed.length > 0
          ? completed.map((s, i) => `${i + 1}. <strong>${s.name}</strong>`).join('<br/>')
          : '当前处于流程起始点',
        level: 'info',
        relatedNodeIds: completed.map(s => s.nodeId),
      },
      {
        title: '🔜 待执行分析步骤',
        content: pending.length > 1
          ? pending.slice(1).map((s, i) => `${pos + 2 + i}. ${s.name}`).join('<br/>')
          : '分析流程已执行完毕',
        level: 'info',
        relatedNodeIds: pending.slice(1).map(s => s.nodeId),
      },
      {
        title: '🏭 流程健康度',
        content: `产能分析完成度: <strong>${(pos / flow.steps.length * 100).toFixed(0)}%</strong>`,
        level: 'info',
        relatedNodeIds: flow.nodeIds,
      },
    ];

    return {
      scene: capacityBottleneckScene,
      insights,
      flow: CAPACITY_ANALYSIS_FLOW,
      flowStep: pos + 1,
      highlightIds: CAPACITY_ANALYSIS_FLOW.nodeIds,
    };
  },
};

// ==================== S5: 供应商风险场景 (使用F5流程) ====================

const supplierRiskScene: BusinessScene = {
  id: 'supplier-risk',
  name: '供应商风险',
  icon: '🔗',
  description: '沿供应链风险流程展开依赖子图，评估供应风险与替代方案',
  triggerTypeIds: ['supplier', 'material', 'warehouse', 'riskEvent', 'alternativeSupplier'],

  analyze(entityId: EntityId): SceneResult {
    // 在F5供应链风险流程中定位该节点
    const flowInfo = findFlowForNode(entityId);
    const inRiskFlow = !!flowInfo && flowInfo.flow.id === SUPPLY_CHAIN_RISK_FLOW.id;

    if (!inRiskFlow) {
      // 节点不在F5流程中，展示供应链风险相关信息
      return {
        scene: supplierRiskScene,
        insights: [{
          title: '供应链风险分析',
          content: `该节点可关联供应链风险流程中的对应环节，查看风险识别、传导分析与应急预案。`,
          level: 'info',
          relatedNodeIds: [entityId],
        }],
        highlightIds: [entityId],
      };
    }

    const pos = flowInfo!.stepIndex;
    const step = flowInfo!.step;
    const flow = SUPPLY_CHAIN_RISK_FLOW;

    // 已完成步骤 + 待处理步骤
    const completed = flow.steps.slice(0, pos);
    const pending = flow.steps.slice(pos);

    const insights: SceneInsight[] = [
      {
        title: `🔗 供应链风险: 第${pos + 1}步 / ${flow.steps.length}步`,
        content: `<strong>${step.name}</strong> — ${step.description}${step.metric ? `<br/>指标: ${step.metric}` : ''}`,
        level: step.isCritical ? 'danger' : 'warning',
        relatedNodeIds: [entityId],
      },
      ...(step.isCritical ? [{
        title: '⚠️ 关键风险节点',
        content: `「${step.name}」是风险管控中的关键决策点。${step.metric ? `当前指标：${step.metric}` : ''}`,
        level: 'danger' as const,
        relatedNodeIds: [entityId],
        action: '建议立即查看应急预案并启动风险缓解措施',
      }] : []),
      {
        title: '📈 风险传导路径',
        content: completed.length > 0
          ? `已识别风险路径：<br/>${completed.map((s, i) => `${i + 1}. <strong>${s.name}</strong>`).join('<br/>')}`
          : '风险识别起始点，尚未触发传导分析',
        level: 'info',
        relatedNodeIds: completed.map(s => s.nodeId),
      },
      {
        title: '🔜 待执行风险应对',
        content: pending.length > 1
          ? `后续应对步骤：<br/>${pending.slice(1).map((s, i) => `${pos + 2 + i}. ${s.name}`).join('<br/>')}`
          : '风险应对流程已执行完毕',
        level: 'warning',
        relatedNodeIds: pending.slice(1).map(s => s.nodeId),
      },
      {
        title: '📊 风险管控健康度',
        content: `供应链风险管控完成度: <strong>${(pos / flow.steps.length * 100).toFixed(0)}%</strong>`,
        level: 'info',
        relatedNodeIds: flow.nodeIds,
      },
    ];

    return {
      scene: supplierRiskScene,
      insights,
      flow: SUPPLY_CHAIN_RISK_FLOW,
      flowStep: pos + 1,
      highlightIds: SUPPLY_CHAIN_RISK_FLOW.nodeIds,
    };
  },
};

// ==================== 全部场景导出 ====================

export const ALL_SCENES: BusinessScene[] = [
  orderTrackingScene,
  costAttributionScene,
  qualityTracebackScene,
  capacityBottleneckScene,
  supplierRiskScene,
];

/** 根据节点类型ID推荐适用场景 */
export function recommendScenes(typeId: EntityId): BusinessScene[] {
  return ALL_SCENES.filter(scene => scene.triggerTypeIds.includes(typeId));
}

/** 根据场景ID获取场景 */
export function getSceneById(id: string): BusinessScene | undefined {
  return ALL_SCENES.find(s => s.id === id);
}
