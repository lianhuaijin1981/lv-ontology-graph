/**
 * SceneShowcase — 场景演示中心
 *
 * 设计目标：
 * - 让客户一眼看到"知识图谱能做什么"
 * - 5大高价值场景以卡片形式展示，一键启动演示
 * - 每个场景卡片包含：图标、名称、一句话价值描述、关键数据指标
 * - 选中场景后自动联动图谱高亮 + 右侧洞察面板
 *
 * 视觉风格：悬浮于图谱上方，半透明毛玻璃背景，不遮挡核心内容
 */

import { useState, useCallback } from 'react';
import type { EntityId } from '@/types';
import type { SceneResult } from '@/data/scenes';
import { ALL_SCENES, getSceneById, recommendScenes } from '@/data/scenes';
import type { ProcessFlow } from '@/data/processFlows';
import {
  Package,
  DollarSign,
  ShieldCheck,
  Factory,
  Link2,
  Play,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';

interface Props {
  /** 当前选中的节点ID（用于推荐场景） */
  selectedNodeId?: EntityId;
  /** 当前选中节点的类型ID */
  selectedTypeId?: string;
  /** 启动场景演示的回调 */
  onLaunchScene: (sceneId: string) => void;
  /** 关闭演示中心的回调 */
  onClose: () => void;
  /** 是否处于收起状态 */
  collapsed?: boolean;
  /** 切换收起/展开 */
  onToggleCollapse?: () => void;
}

// 场景卡片的元数据增强（用于展示）
const SCENE_META: Record<string, {
  accentColor: string;
  bgColor: string;
  borderColor: string;
  keyMetric: string;
  iconComp: React.ComponentType<{ className?: string }>;
}> = {
  'order-tracking': {
    accentColor: 'text-blue-400',
    bgColor: 'bg-blue-500/8',
    borderColor: 'border-blue-500/25',
    keyMetric: '12步端到端追踪 · 45天交付周期',
    iconComp: Package,
  },
  'cost-attribution': {
    accentColor: 'text-amber-400',
    bgColor: 'bg-amber-500/8',
    borderColor: 'border-amber-500/25',
    keyMetric: '8级成本传导 · Top3驱动因子',
    iconComp: DollarSign,
  },
  'quality-traceback': {
    accentColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/8',
    borderColor: 'border-emerald-500/25',
    keyMetric: '7环质量闭环 · CAPA整改追踪',
    iconComp: ShieldCheck,
  },
  'capacity-bottleneck': {
    accentColor: 'text-violet-400',
    bgColor: 'bg-violet-500/8',
    borderColor: 'border-violet-500/25',
    keyMetric: '3大工序产能 · 瓶颈自动识别',
    iconComp: Factory,
  },
  'supplier-risk': {
    accentColor: 'text-rose-400',
    bgColor: 'bg-rose-500/8',
    borderColor: 'border-rose-500/25',
    keyMetric: '6级供应链依赖 · 风险评估矩阵',
    iconComp: Link2,
  },
};

export function SceneShowcase({
  selectedNodeId,
  selectedTypeId,
  onLaunchScene,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // 根据当前选中的节点类型推荐场景优先排序
  const displayScenes = (() => {
    const rec = selectedTypeId ? recommendScenes(selectedTypeId) : [];
    if (rec.length > 0) {
      // 推荐的场景放前面
      const recIds = new Set(rec.map(s => s.id));
      return [
        ...rec,
        ...ALL_SCENES.filter(s => !recIds.has(s.id)),
      ];
    }
    return ALL_SCENES;
  })();

  const handleLaunch = useCallback((sceneId: string) => {
    setLaunchingId(sceneId);
    onLaunchScene(sceneId);
    setTimeout(() => setLaunchingId(null), 600);
  }, [onLaunchScene]);

  if (collapsed) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={onToggleCollapse}
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:border-cyan-400/50 hover:shadow-cyan-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-medium text-white">业务场景演示</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[720px] max-w-[calc(100vw-32px)]">
      {/* 主容器 */}
      <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden">
        {/* 渐变顶部装饰线 */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60" />

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">知识图谱 · 业务场景演示</h2>
              <p className="text-[10px] text-slate-500 leading-tight">点击任意场景卡片，体验图谱如何赋能鞋厂数字化</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 场景卡片网格 */}
        <div className="p-4 grid grid-cols-5 gap-2.5">
          {displayScenes.map((scene) => {
            const meta = SCENE_META[scene.id] || SCENE_META['order-tracking'];
            const IconComp = meta.iconComp;
            const isHovered = hoveredScene === scene.id;
            const isLaunching = launchingId === scene.id;

            return (
              <button
                key={scene.id}
                onMouseEnter={() => setHoveredScene(scene.id)}
                onMouseLeave={() => setHoveredScene(null)}
                onClick={() => handleLaunch(scene.id)}
                className={`group relative text-left p-3 rounded-xl border transition-all duration-200 ${
                  isLaunching
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[0.97]'
                    : isHovered
                    ? `${meta.borderColor} ${meta.bgColor} scale-[1.02] shadow-lg`
                    : 'border-slate-800/60 bg-slate-850/50 hover:bg-slate-800/50'
                }`}
              >
                {/* 发光效果（悬停时） */}
                {isHovered && !isLaunching && (
                  <div className={`absolute inset-0 rounded-xl ${meta.bgColor} opacity-50 pointer-events-none`} />
                )}

                {/* 图标 */}
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg mb-2 transition-colors ${
                  isLaunching ? 'bg-cyan-500/20' : `${meta.bgColor}`
                }`}>
                  <IconComp className={`w-5 h-5 ${isLaunching ? 'text-cyan-400' : meta.accentColor}`} />
                </div>

                {/* 场景名称 */}
                <div className={`text-xs font-semibold mb-0.5 transition-colors ${
                  isLaunching ? 'text-cyan-300' : isHovered ? 'text-white' : 'text-slate-300'
                }`}>
                  {scene.icon} {scene.name}
                </div>

                {/* 一句话价值 */}
                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 group-hover:text-slate-400 transition-colors">
                  {scene.description}
                </p>

                {/* 关键指标标签 */}
                <div className="mt-2 flex items-center gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    isLaunching ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {meta.keyMetric}
                  </span>
                </div>

                {/* 立即体验按钮（悬停时显示） */}
                {isHovered && !isLaunching && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-cyan-400">
                    <Play className="w-3 h-3" fill="currentColor" />
                    <span>立即体验</span>
                  </div>
                )}

                {/* 启动动画指示器 */}
                {isLaunching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-xl">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 底部提示栏 */}
        <div className="px-5 py-2.5 border-t border-slate-800/60 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">
              💡 提示：也可点击图谱中任意节点 → 底部「场景」按钮触发分析
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-600">共 {displayScenes.length} 个场景</span>
          </div>
        </div>
      </div>
    </div>
  );
}
