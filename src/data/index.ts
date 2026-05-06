/**
 * 统一数据聚合入口
 *
 * 聚合基础鞋厂数据 + S1-S5 场景增强数据
 * 所有数据在此合并后统一导出
 */

// 导入基础鞋厂数据
import {
  allEntities as baseEntities,
  allLinks as baseLinks,
} from './shoeFactoryData';

// 导入 S1-S3 场景增强数据
import {
  s1ExtendedEntities, s1ExtendedLinks,
  s2ExtendedEntities, s2ExtendedLinks,
  s3ExtendedEntities, s3ExtendedLinks,
} from './sceneExtensions';

// 导入 S4-S5 场景数据生成器
import {
  s4Workstations, s4Shifts, s4CapacityPlans, s4BottleneckAlerts, s4Optimizations, s4Links,
  s5RiskEvents, s5RiskImpacts, s5ContingencyPlans, s5AlternativeSuppliers, s5Links,
} from './generators';

// ============================================================
// 合并所有实体
// ============================================================

export const allEntities = [
  ...baseEntities,
  // S1-S3 增强
  ...s1ExtendedEntities,
  ...s2ExtendedEntities,
  ...s3ExtendedEntities,
  // S4 产能瓶颈场景
  ...s4Workstations,
  ...s4Shifts,
  ...s4CapacityPlans,
  ...s4BottleneckAlerts,
  ...s4Optimizations,
  // S5 供应商风险场景
  ...s5RiskEvents,
  ...s5RiskImpacts,
  ...s5ContingencyPlans,
  ...s5AlternativeSuppliers,
];

// ============================================================
// 合并所有关系
// ============================================================

export const allLinks = [
  ...baseLinks,
  // S1-S3 增强
  ...s1ExtendedLinks,
  ...s2ExtendedLinks,
  ...s3ExtendedLinks,
  // S4-S5
  ...s4Links,
  ...s5Links,
];

// ============================================================
// 统计信息（用于验证）
// ============================================================

console.log(`[data/index] 总实体数: ${allEntities.length} (原有~90 + 新增${allEntities.length - 90})`);
console.log(`[data/index] 总关系数: ${allLinks.length} (原有~80 + 新增${allLinks.length - 80})`);

// 导出类型以供其他模块使用
export type { EntityId, LinkId } from '@/types';
export type { OntologyObject, OntologyLink } from '@/ontology/types';
