/**
 * 鞋厂业务三层级划分
 * 
 * 划分逻辑：
 * Tier 1 (核心对象): 业务命脉节点，importance >= 0.85 + 属于生产/供应链/核心系统/关键订单
 * Tier 2 (关键流程): 流程中不可或缺的节点，importance 0.7-0.84
 * Tier 3 (辅助信息): 执行层/支撑层信息，importance < 0.7
 * 
 * 目标：1秒识别核心对象 → 3秒看懂关键流程 → 5秒定位工艺链路
 */

/** 节点业务层级 */
export const NODE_TIER: Record<string, 1 | 2 | 3> = {
  // ===== Tier 1: 核心业务对象（一眼看到）=====
  // 三大车间 - 生产核心
  'mfg-01': 1, // 裁断车间
  'mfg-02': 1, // 针车车间
  'mfg-03': 1, // 成型车间
  // 核心物料 - 供应链命脉
  'scm-02': 1, // 头层牛皮
  // 核心系统 - 业务大脑
  'sys-01': 1, // ERP系统
  'sys-02': 1, // MES系统
  // 核心客户+渠道 - 营收来源
  'sales-02': 1, // 抖音短视频
  'sales-07': 1, // 海外品牌商A
  // 核心订单 - 业务驱动
  'ord-02': 1, // 外贸大货订单
  // 核心成本+指标 - 利润命脉
  'cost-01': 1, // 皮料主料成本
  'cost-06': 1, // 皮料损耗率
  'cost-07': 1, // 成品次品率
  // 核心风险 - 经营底线
  'risk-01': 1, // 模具弃单风险
  'risk-03': 1, // 批量品质风险

  // ===== Tier 2: 关键流程链路（3秒看懂流程）=====
  // 研发设计链
  'rd-01': 2, // 出格设计师
  'rd-02': 2, // 版型师傅
  'rd-03': 2, // 鞋款设计方案
  'rd-04': 2, // 版型出格
  'rd-05': 2, // 初样制作
  // 工艺工序链（前置于三大车间）
  'mfg-04': 2, // 裁断下料
  'mfg-05': 2, // 针车车缝
  'mfg-06': 2, // 贴底工艺
  'mfg-07': 2, // 高温定型
  // 供应链
  'scm-01': 2, // 原材料供应商A
  'scm-03': 2, // 橡胶鞋底
  'scm-04': 2, // 鞋面裁片
  'scm-05': 2, // 皮料专用仓
  'scm-06': 2, // 成品仓库
  // 质检
  'qc-01': 2, // IQC质检员
  'qc-02': 2, // OQC质检员
  'qc-03': 2, // 成品质检标准
  'qc-04': 2, // 来料质检标准
  // 业务系统
  'sys-03': 2, // WMS系统
  'sys-04': 2, // QMS系统
  'sys-05': 2, // APS系统
  // 渠道+客户
  'sales-01': 2, // 1688批发平台
  'sales-03': 2, // 广交会
  'sales-04': 2, // 海外商超
  // 订单+物流
  'ord-01': 2, // 打样订单
  'ord-04': 2, // 信用证订单
  'ord-05': 2, // 海运订舱服务
  'ord-06': 2, // 报关服务
  // 成本+利润
  'cost-02': 2, // 物料损耗成本
  'cost-03': 2, // 库存积压成本
  'cost-08': 2, // 订单翻单率
  // 风险
  'risk-02': 2, // 库存积压风险
  'risk-04': 2, // 环保合规风险
  'risk-05': 2, // 交期违约风险

  // ===== Tier 3: 辅助信息（5秒定位时用到）=====
  // 班组+设备（执行层）
  'mfg-08': 3, // 裁断班组A
  'mfg-09': 3, // 针车班组B
  'mfg-10': 3, // 裁断刀模
  'mfg-11': 3, // 欧码楦头
  // 人员
  'sales-05': 3, // 外贸业务员
  'sales-06': 3, // 内销业务员
  'sales-08': 3, // 国内批发商B
  // 次要订单
  'ord-03': 3, // 内销现货订单
  // 次要成本
  'cost-04': 3, // 直接人工成本
  'cost-05': 3, // 模具开发成本
  'cost-09': 3, // 交期达成率
  // 次要风险
  'risk-06': 3, // 汇率波动风险
  // 次要系统
  'sys-06': 3, // EAM系统
};

/** 核心生产链路（点击高亮时的关键路径） */
export const CORE_PRODUCTION_CHAIN = [
  'scm-02', // 头层牛皮
  'scm-05', // 皮料仓
  'mfg-01', // 裁断车间
  'mfg-04', // 裁断下料
  'mfg-02', // 针车车间
  'mfg-05', // 针车车缝
  'mfg-03', // 成型车间
  'mfg-06', // 贴底工艺
  'mfg-07', // 高温定型
  'rd-03',  // 鞋款设计方案
];

/** 成本传导链路 */
export const COST_TRANSMISSION_CHAIN = [
  'scm-02', // 头层牛皮
  'cost-01', // 皮料主料成本
  'cost-06', // 皮料损耗率
  'cost-02', // 物料损耗成本
  'mfg-01', // 裁断车间
  'cost-07', // 成品次品率
];

/** 订单履约链路 */
export const ORDER_FULFILLMENT_CHAIN = [
  'sales-07', // 海外品牌商
  'ord-02',   // 外贸大货订单
  'ord-05',   // 海运订舱
  'sys-01',   // ERP系统
];

/** 按 tier 获取实体ID列表 */
export function getIdsByTier(tier: 1 | 2 | 3): string[] {
  return Object.entries(NODE_TIER)
    .filter(([, t]) => t === tier)
    .map(([id]) => id);
}

/** 获取实体的业务层级 */
export function getNodeTier(nodeId: string): 1 | 2 | 3 {
  return NODE_TIER[nodeId] || 2; // 默认 Tier 2
}

/** 判断是否为工艺节点 */
export function isProcessNode(typeId: string): boolean {
  return ['process', 'workshop'].includes(typeId);
}

/** 判断是否为系统节点 */
export function isSystemNode(typeId: string): boolean {
  return typeId === 'bizSystem';
}

/** 判断是否为成本/指标节点 */
export function isCostNode(typeId: string): boolean {
  return ['costItem', 'profitFactor'].includes(typeId);
}
