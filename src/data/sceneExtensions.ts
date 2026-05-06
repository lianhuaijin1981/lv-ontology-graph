/**
 * S1-S3 场景增强数据
 *
 * 为订单追踪(S1)、成本归因(S2)、质量回溯(S3)三个场景
 * 补充客户、物流、原材料、成本驱动、质量异常、根因分析等深度业务实体
 */

import type { OntologyObject, OntologyLink } from '@/ontology/types';

const _now = new Date().toISOString();

function obj(
  id: string, typeId: string, name: string, domain: string,
  importance: number, level: number,
  props: Record<string, any> = {},
): OntologyObject {
  return {
    id, typeId, displayName: name, domain: domain as any,
    importance, level,
    isAggregate: false,
    createdAt: _now, updatedAt: _now,
    properties: props,
  };
}

function link(
  id: string, typeId: string, source: string, target: string,
  semantics: string,
  props: Record<string, any> = {},
): OntologyLink {
  return { id, typeId, sourceId: source, targetId: target, semantics: semantics as any, properties: props };
}

// ============================================================
// S1 - 订单追踪场景增强 (12实体 + 16关系)
// ============================================================

export const s1ExtendedEntities: OntologyObject[] = [
  // 客户 (4个)
  obj('e1-c01', 'customer', 'ZARA集团', '市场渠道销售', 0.88, 2, {
    customerType: 'VIP海外品牌商', annualOrder: 12000000, country: '西班牙', orderFreq: '季度',
  }),
  obj('e1-c02', 'customer', 'SHEIN快时尚', '市场渠道销售', 0.85, 2, {
    customerType: 'VIP跨境电商', annualOrder: 8500000, country: '新加坡', orderFreq: '月度',
  }),
  obj('e1-c03', 'customer', '国内连锁鞋城', '市场渠道销售', 0.75, 2, {
    customerType: 'Regular批发商', annualOrder: 3200000, country: '中国', orderFreq: '月度',
  }),
  obj('e1-c04', 'customer', '东南亚采购团', '市场渠道销售', 0.65, 2, {
    customerType: 'New潜力客户', annualOrder: 800000, country: '越南', orderFreq: '不定期',
  }),

  // 物流节点 (4个)
  obj('e1-n01', 'logisticsNode', '中央成品仓', '供应链管理', 0.82, 1, {
    nodeType: '中央仓', location: '工厂园区A栋', capacity: 80000, currentStock: 52000,
  }),
  obj('e1-n02', 'logisticsNode', '华南转运中心', '供应链管理', 0.78, 2, {
    nodeType: '转运中心', location: '广州白云区', capacity: 50000,
  }),
  obj('e1-n03', 'logisticsNode', '华东分拨仓', '供应链管理', 0.72, 2, {
    nodeType: '分拨仓', location: '上海嘉定', capacity: 30000,
  }),
  obj('e1-n04', 'logisticsNode', '厦门港口仓', '供应链管理', 0.76, 2, {
    nodeType: '口岸仓', location: '厦门海沧港', capacity: 40000,
  }),

  // 配送路线 (4个)
  obj('e1-r01', 'deliveryRoute', '工厂→中央仓入库线', '订单物流报关', 0.65, 2, {
    routeType: '入库', leadTimeHours: 2, distanceKm: 0.5, carrier: '内部物流',
  }),
  obj('e1-r02', 'deliveryRoute', '中央仓→华南干线', '订单物流报关', 0.68, 2, {
    routeType: '干线运输', leadTimeHours: 12, distanceKm: 120, carrier: '顺丰快运',
  }),
  obj('e1-r03', 'deliveryRoute', '华南→华东干线', '订单物流报关', 0.66, 2, {
    routeType: '干线运输', leadTimeHours: 24, distanceKm: 1300, carrier: '德邦物流',
  }),
  obj('e1-r04', 'deliveryRoute', '厦门港→欧洲海运FCL', '订单物流报关', 0.70, 2, {
    routeType: '海运FCL', leadTimeHours: 720, distanceKm: 10500, carrier: '马士基航运',
  }),
];

export const s1ExtendedLinks: OntologyLink[] = [
  // 客户 → 下订单
  link('l-e1-01', 'placedBy', 'e1-c01', 'ord-02', 'pathAssociation', { description: 'ZARA集团下达外贸大货单' }),
  link('l-e1-02', 'placedBy', 'e1-c02', 'ord-03', 'pathAssociation', { description: 'SHEIN下内销现货单' }),
  link('l-e1-03', 'placedBy', 'e1-c03', 'ord-01', 'pathAssociation', { description: '连锁鞋城下达打样单' }),
  link('l-e1-04', 'placedBy', 'e1-c04', 'ord-04', 'pathAssociation', { description: '采购团信用证订单' }),

  // 销售渠道 → 获取客户
  link('l-e1-05', 'acquiredVia', 'sales-03', 'e1-c01', 'pathAssociation', { description: '广交会获取ZARA' }),
  link('l-e1-06', 'acquiredVia', 'sales-02', 'e1-c02', 'pathAssociation', { description: '抖音获取SHEIN' }),

  // 订单 → 经由物流节点
  link('l-e1-07', 'routesThrough', 'ord-02', 'e1-n01', 'pathAssociation', { description: '外贸大货入中央仓' }),
  link('l-e1-08', 'routesThrough', 'ord-03', 'e1-n01', 'pathAssociation', { description: '内销现货入中央仓' }),
  link('l-e1-09', 'routesThrough', 'e1-n01', 'e1-n02', 'pathAssociation', { description: '中央仓发往华南' }),
  link('l-e1-10', 'routesThrough', 'e1-n02', 'e1-n03', 'pathAssociation', { description: '华南转发华东' }),
  link('l-e1-11', 'routesThrough', 'ord-02', 'e1-n04', 'pathAssociation', { description: '外贸订单集货厦门港' }),
  link('l-e1-12', 'routesThrough', 'ord-05', 'e1-n04', 'pathAssociation', { description: '海运订舱服务对接港口' }),

  // 路线连接节点
  link('l-e1-13', 'connects', 'e1-r01', 'e1-n01', 'association'),
  link('l-e1-14', 'connects', 'e1-r02', 'e1-n02', 'association'),
  link('l-e1-15', 'connects', 'e1-r03', 'e1-n03', 'association'),
  link('l-e1-16', 'deliversTo', 'e1-r04', 'sales-04', 'pathAssociation', { description: '海运配送至海外商超' }),
];

// ============================================================
// S2 - 成本归因场景增强 (18实体 + 22关系)
// ============================================================

export const s2ExtendedEntities: OntologyObject[] = [
  // 原材料 (6种)
  obj('e2-m01', 'rawMaterial', '头层牛皮', '供应链管理', 0.87, 2, {
    category: '主料', unitPrice: 45, unit: '元/尺²', supplierRef: 'scm-01',
    priceTrend: [42.0, 43.5, 45.0, 44.0, 46.5], volatility: 'medium',
  }),
  obj('e2-m02', 'rawMaterial', '二层牛皮', '供应链管理', 0.70, 2, {
    category: '辅料', unitPrice: 18, unit: '元/尺²', supplierRef: 'scm-01',
    priceTrend: [17.0, 17.5, 18.0, 18.0, 19.0], volatility: 'low',
  }),
  obj('e2-m03', 'rawMaterial', '天然橡胶(TPR底)', '供应链管理', 0.78, 2, {
    category: '主料', unitPrice: 12, unit: '元/双底', supplierRef: 'scm-01',
    priceTrend: [11.0, 11.5, 12.0, 12.5, 13.0], volatility: 'high',
  }),
  obj('e2-m04', 'rawMaterial', '涤纶网布', '供应链管理', 0.72, 2, {
    category: '面料', unitPrice: 8, unit: '元/米', supplierRef: 'scm-01',
    priceTrend: [7.5, 7.8, 8.0, 8.2, 8.5], volatility: 'low',
  }),
  obj('e2-m05', 'rawMaterial', 'EVA中底', '供应链管理', 0.65, 2, {
    category: '辅料', unitPrice: 3, unit: '元/双', supplierRef: 'scm-01',
    priceTrend: [2.8, 2.9, 3.0, 3.0, 3.1], volatility: 'stable',
  }),
  obj('e2-m06', 'rawMaterial', '热熔胶水', '供应链管理', 0.73, 2, {
    category: '化工', unitPrice: 85, unit: '元/kg', supplierRef: 'scm-01',
    priceTrend: [80, 82, 85, 88, 90], volatility: 'high',
  }),

  // 成本驱动因子 (4个)
  obj('e2-d01', 'costDriver', '汇率波动(CNY/EUR)', '成本利润核算', 0.85, 2, {
    driverType: '宏观因子', weight: 0.30, currentImpact: '+8.2%', trend: '上升中',
  }),
  obj('e2-d02', 'costDriver', '国际原油价格', '成本利润核算', 0.78, 2, {
    driverType: '大宗商品', weight: 0.20, currentImpact: '+5.5%', trend: '波动',
  }),
  obj('e2-d03', 'costDriver', '环保合规成本', '成本利润核算', 0.70, 2, {
    driverType: '政策因子', weight: 0.15, currentImpact: '+3.0%', trend: '持续增加',
  }),
  obj('e2-d04', 'costDriver', '制鞋工人工资上涨', '成本利润核算', 0.80, 2, {
    driverType: '劳动力市场', weight: 0.25, currentImpact: '+6.8%', trend: '稳步上升',
  }),

  // 供应商合同 (6条)
  obj('e2-ct01', 'supplierContract', '牛皮年度框架协议', '供应链管理', 0.80, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m01', pricingMode: '浮动挂钩',
    basePrice: 42, validPeriod: '2024全年', minOrderQty: 5000,
  }),
  obj('e2-ct02', 'supplierContract', '橡胶季度定价协议', '供应链管理', 0.75, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m03', pricingMode: '市场联动',
    basePrice: 11, validPeriod: 'Q2 2024', minOrderQty: 10000,
  }),
  obj('e2-ct03', 'supplierContract', '化工原料锁价合同', '供应链管理', 0.72, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m06', pricingMode: '固定价格',
    basePrice: 82, validPeriod: 'H1 2024', minOrderQty: 200,
  }),
  obj('e2-ct04', 'supplierContract', '面料JIT供应协议', '供应链管理', 0.70, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m04', pricingMode: '阶梯定价',
    basePrice: 7.5, validPeriod: '2024全年',
  }),
  obj('e2-ct05', 'supplierContract', '辅料打包采购合同', '供应链管理', 0.68, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m02,e2-m05', pricingMode: '固定价格',
    basePrice: 20, validPeriod: '2024全年',
  }),
  obj('e2-ct06', 'supplierContract', '新供应商试单合同', '供应链管理', 0.60, 2, {
    supplierRef: 'scm-01', materialRef: 'e2-m01', pricingMode: '促销价',
    basePrice: 40, validPeriod: '试单期', minOrderQty: 1000,
  }),
];

export const s2ExtendedLinks: OntologyLink[] = [
  // 驱动因子 → 影响原材料价格
  link('l-e2-01', 'priceImpact', 'e2-d01', 'e2-m01', 'impactTransmission', { description: '汇率影响牛皮进口价' }),
  link('l-e2-02', 'priceImpact', 'e2-d02', 'e2-m03', 'impactTransmission', { description: '原油影响橡胶价格' }),
  link('l-e2-03', 'priceImpact', 'e2-d02', 'e2-m06', 'impactTransmission', { description: '原油影响化工胶水' }),
  link('l-e2-04', 'priceImpact', 'e2-d03', 'e2-m01', 'impactTransmission', { description: '环保增加鞣制成本' }),
  link('l-e2-05', 'priceImpact', 'e2-d04', 'cost-04', 'impactTransmission', { description: '人工影响直接人工成本' }),

  // 合同 → 约定原材料价格
  link('l-e2-06', 'contractedPrice', 'e2-ct01', 'e2-m01', 'supply'),
  link('l-e2-07', 'contractedPrice', 'e2-ct02', 'e2-m03', 'supply'),
  link('l-e2-08', 'contractedPrice', 'e2-ct03', 'e2-m06', 'supply'),
  link('l-e2-09', 'contractedPrice', 'e2-ct04', 'e2-m04', 'supply'),
  link('l-e2-10', 'contractedPrice', 'e2-ct05', 'e2-m02', 'supply'),

  // 供应商签订合同
  link('l-e2-11', 'signsContract', 'scm-01', 'e2-ct01', 'cooperation'),
  link('l-e2-12', 'signsContract', 'scm-01', 'e2-ct02', 'cooperation'),
  link('l-e2-13', 'signsContract', 'scm-01', 'e2-ct03', 'cooperation'),
  link('l-e2-14', 'signsContract', 'scm-01', 'e2-ct04', 'cooperation'),
  link('l-e2-15', 'signsContract', 'scm-01', 'e2-ct05', 'cooperation'),

  // 原材料 → 现有成本实体
  link('l-e2-16', 'costComposition', 'e2-m01', 'cost-01', 'composition', { description: '牛皮构成主料成本' }),
  link('l-e2-17', 'costComposition', 'e2-m03', 'cost-01', 'composition', { description: '橡胶构成主料成本' }),
  link('l-e2-18', 'costComposition', 'e2-m04', 'cost-02', 'composition', { description: '网布构成损耗成本' }),
  link('l-e2-19', 'costComposition', 'e2-m06', 'cost-05', 'composition', { description: '胶水构成模具成本' }),

  // 原材料映射到现有物料实体
  link('l-e2-20', 'sameAs', 'e2-m01', 'scm-02', 'association'),
  link('l-e2-21', 'sameAs', 'e2-m03', 'scm-03', 'association'),
  link('l-e2-22', 'suppliesToCost', 'e2-d01', 'cost-01', 'impactTransmission', { description: '汇率传导至皮料成本' }),
];

// ============================================================
// S3 - 质量回溯场景增强 (18实体 + 20关系)
// ============================================================

export const s3ExtendedEntities: OntologyObject[] = [
  // 质量异常案例 (6个)
  obj('e3-i01', 'qualityIssue', 'IQC-皮料色差超标', '质量管控', 0.85, 2, {
    severity: 'major', status: '已关闭', affectedQty: 320,
    discoveredAt: 'IQC检验站', discoveredDate: '2024-03-10', rootCauseCategory: '物料',
  }),
  obj('e3-i02', 'qualityIssue', 'IPQC-针车跳线缺陷', '质量管控', 0.72, 2, {
    severity: 'minor', status: '处理中', affectedQty: 156,
    discoveredAt: '针车巡检点', discoveredDate: '2024-03-15', rootCauseCategory: '人员',
  }),
  obj('e3-i03', 'qualityIssue', 'FQC-帮底脱胶不良', '质量管控', 0.90, 2, {
    severity: 'critical', status: '整改执行中', affectedQty: 89,
    discoveredAt: 'OQC终检站', discoveredDate: '2024-03-18', rootCauseCategory: '方法',
  }),
  obj('e3-i04', 'qualityIssue', 'OQC-尺寸偏差超标', '质量管控', 0.68, 2, {
    severity: 'minor', status: '已关闭', affectedQty: 78,
    discoveredAt: 'OQC测量站', discoveredDate: '2024-03-08', rootCauseCategory: '设备',
  }),
  obj('e3-i05', 'qualityIssue', '客诉-包装破损', '质量管控', 0.75, 2, {
    severity: 'medium', status: '待确认', affectedQty: 45,
    discoveredAt: '客户退货', discoveredDate: '2024-03-20', rootCauseCategory: '方法',
  }),
  obj('e3-i06', 'qualityIssue', 'IQC-胶水VOC超标', '质量管控', 0.92, 2, {
    severity: 'critical', status: '紧急处理中', affectedQty: 520,
    discoveredAt: 'IQC检验站', discoveredDate: '2024-03-22', rootCauseCategory: '物料',
  }),

  // 根因分析 (6个) — 使用5Why分析法
  obj('e3-rc01', 'rootCause', '皮料色差5Why分析', '质量管控', 0.80, 2, {
    issueRef: 'e3-i01',
    whyChain: ['为什么有色差?→批次染色差异', '为什么批次差异?→供应商换染厂',
      '为什么换染厂?→原厂环保不达标', '为什么不达标?→废水排放超标', '为什么超标?→缺乏预处理设备'],
    rootCause: '供应商染整工艺变更未通知', category: '供应链管理', verified: true, analyst: '质检经理',
  }),
  obj('e3-rc02', 'rootCause', '针车跳线5Why分析', '质量管控', 0.75, 2, {
    issueRef: 'e3-i02',
    whyChain: ['为什么会跳线?→张力不一致', '为什么张力不同?→新员工操作不熟练',
      '为什么新人上岗?→老员工离职', '为什么离职?→薪资竞争力不足', '为什么不足?→地区平均工资上涨'],
    rootCause: '关键技工流失导致技能断层', category: '人力资源管理', verified: true,
  }),
  obj('e3-rc03', 'rootCause', '帮底脱胶5Why分析', '质量管控', 0.85, 2, {
    issueRef: 'e3-i03',
    whyChain: ['为什么脱胶?→粘合强度不够', '为什么不够?→刷胶厚度不足',
      '为什么不足?→作业指导书模糊', '为什么模糊?→无量化标准', '为什么无标准?→工艺参数未固化'],
    rootCause: '刷胶工序缺少量化工艺标准', category: '工艺管理', verified: false, analyst: '工艺工程师',
  }),
  obj('e3-rc04', 'rootCause', '尺寸偏差5Why分析', '质量管控', 0.70, 2, {
    issueRef: 'e3-i04',
    whyChain: ['为什么偏差?→楦头磨损', '为什么磨损?→使用频次过高',
      '为什么过高?→缺少备用楦头', '为什么缺少?→采购周期长', '为什么长?→定制件需进口'],
    rootCause: '欧码楦头备品策略不当', category: '设备管理', verified: true,
  }),
  obj('e3-rc05', 'rootCause', '包装破损5Why分析', '质量管控', 0.72, 2, {
    issueRef: 'e3-i05',
    whyChain: ['为什么破损?→纸箱强度不足', '为什么不足?→降级采购纸箱',
      '为什么降级?→控制包材成本', '为什么控成本?→利润压力', '为什么压力?→原材料涨价'],
    rootCause: '过度压缩包材成本导致防护不足', category: '采购策略', verified: true,
  }),
  obj('e3-rc06', 'rootCause', '胶水VOC超标5Why分析', '质量管控', 0.88, 2, {
    issueRef: 'e3-i06',
    whyChain: ['为什么超标?→新批号胶水问题', '为什么有问题?→供应商更换配方',
      '为什么换配方?→降低成本', '为什么低成本?→市场竞争激烈', '为什么激烈?→行业产能过剩'],
    rootCause: '供应商为降本私自更改胶水配方', category: '供应链质量', verified: false, analyst: 'SQE工程师',
  }),

  // 纠正措施 (6个) — CAPA
  obj('e3-ca01', 'correctiveAction', '加强来料色度检验', '质量管控', 0.78, 2, {
    actionType: '纠正措施', issueRef: 'e3-i01', responsibleParty: 'IQC团队',
    deadline: '2024-03-20', effectiveness: '有效', actualCost: 2000,
  }),
  obj('e3-ca02', 'correctiveAction', '建立技工分级激励体系', '质量管控', 0.74, 2, {
    actionType: '系统改善', issueRef: 'e3-i02', responsibleParty: 'HR+生产部',
    deadline: '2024-04-30', effectiveness: '部分有效', actualCost: 15000,
  }),
  obj('e3-ca03', 'correctiveAction', '固化刷胶工艺参数SOP', '质量管控', 0.80, 2, {
    actionType: '预防措施', issueRef: 'e3-i03', responsibleParty: '工艺部',
    deadline: '2024-04-05', effectiveness: '待验证', actualCost: 3000,
  }),
  obj('e3-ca04', 'correctiveAction', '建立楦头备品安全库存', '质量管控', 0.71, 2, {
    actionType: '预防措施', issueRef: 'e3-i04', responsibleParty: '设备部+采购部',
    deadline: '2024-04-15', effectiveness: '有效', actualCost: 35000,
  }),
  obj('e3-ca05', 'correctiveAction', '重新评估包材规格标准', '质量管控', 0.69, 2, {
    actionType: '系统改善', issueRef: 'e3-i05', responsibleParty: '采购+品质',
    deadline: '2024-05-01', effectiveness: '待实施', actualCost: 5000,
  }),
  obj('e3-ca06', 'correctiveAction', '启动供应商4M变更审核机制', '质量管控', 0.86, 2, {
    actionType: '纠正措施', issueRef: 'e3-i06', responsibleParty: 'SQE+采购',
    deadline: '2024-03-25(紧急)', effectiveness: '进行中', actualCost: 8000,
  }),
];

export const s3ExtendedLinks: OntologyLink[] = [
  // 工序/物料 → 存在质量问题
  link('l-e3-01', 'hasIssue', 'qc-01', 'e3-i01', 'controlConstraint', { description: 'IQC发现皮料色差' }),
  link('l-e3-02', 'hasIssue', 'mfg-05', 'e3-i02', 'controlConstraint', { description: '针车巡检发现跳线' }),
  link('l-e3-03', 'hasIssue', 'mfg-06', 'e3-i03', 'controlConstraint', { description: '贴底工序脱胶不良' }),
  link('l-e3-04', 'hasIssue', 'qc-02', 'e3-i04', 'controlConstraint', { description: 'OQC发现尺寸偏差' }),
  link('l-e3-05', 'hasIssue', 'scm-06', 'e3-i05', 'controlConstraint', { description: '成品仓客诉包装破' }),
  link('l-e3-06', 'hasIssue', 'qc-01', 'e3-i06', 'controlConstraint', { description: 'IQC发现胶水VOC超标' }),

  // 质量异常 → 根因
  link('l-e3-07', 'rootCausedBy', 'e3-i01', 'e3-rc01', 'impactTransmission'),
  link('l-e3-08', 'rootCausedBy', 'e3-i02', 'e3-rc02', 'impactTransmission'),
  link('l-e3-09', 'rootCausedBy', 'e3-i03', 'e3-rc03', 'impactTransmission'),
  link('l-e3-10', 'rootCausedBy', 'e3-i04', 'e3-rc04', 'impactTransmission'),
  link('l-e3-11', 'rootCausedBy', 'e3-i05', 'e3-rc05', 'impactTransmission'),
  link('l-e3-12', 'rootCausedBy', 'e3-i06', 'e3-rc06', 'impactTransmission'),

  // 问题 → 通过措施解决
  link('l-e3-13', 'resolvedBy', 'e3-i01', 'e3-ca01', 'responsibility'),
  link('l-e3-14', 'resolvedBy', 'e3-i02', 'e3-ca02', 'responsibility'),
  link('l-e3-15', 'resolvedBy', 'e3-i03', 'e3-ca03', 'responsibility'),
  link('l-e3-16', 'resolvedBy', 'e3-i04', 'e3-ca04', 'responsibility'),
  link('l-e3-17', 'resolvedBy', 'e3-i05', 'e3-ca05', 'responsibility'),
  link('l-e3-18', 'resolvedBy', 'e3-i06', 'e3-ca06', 'responsibility'),

  // 措施 → 预防风险
  link('l-e3-19', 'preventsRisk', 'e3-ca06', 'risk-03', 'controlConstraint', { description: '4M变更审核防批量品质风险' }),
  link('l-e3-20', 'preventsRisk', 'e3-ca01', 'risk-03', 'controlConstraint', { description: '加强来料检验防品质风险' }),
];

// ============================================================
// 统一导出
// ============================================================

export const s1ExtendedData = { entities: s1ExtendedEntities, links: s1ExtendedLinks };
export const s2ExtendedData = { entities: s2ExtendedEntities, links: s2ExtendedLinks };
export const s3ExtendedData = { entities: s3ExtendedEntities, links: s3ExtendedLinks };

/** 合并所有S1-S3增强数据 */
export function getAllExtendedSceneData() {
  return {
    entities: [
      ...s1ExtendedEntities,
      ...s2ExtendedEntities,
      ...s3ExtendedEntities,
    ],
    links: [
      ...s1ExtendedLinks,
      ...s2ExtendedLinks,
      ...s3ExtendedLinks,
    ],
  };
}
