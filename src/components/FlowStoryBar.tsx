/**
 * FlowStoryBar — 核心业务流程故事线
 *
 * 设计目标：
 * - 将3条核心流程从"小按钮"升级为"可视化故事线"
 * - 显示流程步骤进度条（Step 1 → 2 → 3 → ...）
 * - 当前步骤高亮 + 关键指标摘要
 * - 支持自动播放模式（逐步动画推进）
 * - 视觉风格：金色/渐变强调，与场景演示中心呼应
 *
 * 三大核心流程：
 * F1: 订单全生命周期 (12步) — 从客户下单到交付回款
 * F2: 成本风险传导链 (8步)  — 从原材料采购到利润侵蚀
 * F3: 质量管控闭环 (7步)    — 从来料检验到整改闭环
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessFlow } from '@/data/processFlows';
import { ALL_PROCESS_FLOWS } from '@/data/processFlows';
import {
  Play,
  Pause,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  Zap,
} from 'lucide-react';

interface Props {
  /** 当前激活的流程 */
  activeFlow: ProcessFlow | null;
  /** 流程当前步骤 (1-based, 0=不高亮) */
  currentStep: number;
  /** 切换流程回调 */
  onFlowChange: (flow: ProcessFlow) => void;
  /** 切换步骤回调 */
  onStepChange: (step: number) => void;
  /** 关闭流程高亮 */
  onClose: () => void;
}

// 每个流程的视觉主题
const FLOW_THEME: Record<string, {
  name: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  dotActiveBg: string;
  dotDoneBg: string;
  dotPendingClass: string;
  lineDoneColor: string;
  linePendingColor: string;
}> = {
  'order-lifecycle': {
    name: '订单全生命周期',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-500',
    accentColor: 'text-blue-400',
    dotActiveBg: 'bg-blue-400',
    dotDoneBg: 'bg-blue-500',
    dotPendingClass: 'bg-slate-700 border-slate-600',
    lineDoneColor: 'bg-blue-500',
    linePendingColor: 'bg-slate-800',
  },
  'cost-risk-chain': {
    name: '成本风险传导链',
    gradientFrom: 'from-amber-600',
    gradientTo: 'to-orange-500',
    accentColor: 'text-amber-400',
    dotActiveBg: 'bg-amber-400',
    dotDoneBg: 'bg-amber-500',
    dotPendingClass: 'bg-slate-700 border-slate-600',
    lineDoneColor: 'bg-amber-500',
    linePendingColor: 'bg-slate-800',
  },
  'qc-closed-loop': {
    name: '质量管控闭环',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-teal-500',
    accentColor: 'text-emerald-400',
    dotActiveBg: 'bg-emerald-400',
    dotDoneBg: 'bg-emerald-500',
    dotPendingClass: 'bg-slate-700 border-slate-600',
    lineDoneColor: 'bg-emerald-500',
    linePendingColor: 'bg-slate-800',
  },
};

export function FlowStoryBar({
  activeFlow,
  currentStep,
  onFlowChange,
  onStepChange,
  onClose,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 自动播放逻辑：每1.5秒推进一步
  const startAutoPlay = useCallback(() => {
    if (!activeFlow || isPlaying) return;
    setIsPlaying(true);
    // 如果当前步骤已经到最后，从头开始
    if (currentStep >= activeFlow.steps.length) {
      onStepChange(1);
    }
    autoPlayTimer.current = setInterval(() => {
      onStepChange(prev => {
        if (!activeFlow) return prev;
        const next = prev + 1;
        if (next > activeFlow.steps.length) {
          stopAutoPlay();
          return activeFlow.steps.length; // 停在最后一步
        }
        return next;
      });
    }, 1500);
  }, [activeFlow, isPlaying, currentStep, onStepChange]);

  const stopAutoPlay = useCallback(() => {
    setIsPlaying(false);
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  }, [isPlaying, stopAutoPlay, startAutoPlay]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, []);

  const theme = activeFlow ? FLOW_THEME[activeFlow.id] : null;

  // 步骤显示数量（根据屏幕宽度自适应）
  const maxVisibleDots = activeFlow ? Math.min(activeFlow.steps.length, 12) : 12;

  return (
    <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl rounded-lg border border-slate-700/60 shadow-lg shadow-black/20 px-3 py-1.5">
      {/* ========== 左侧：播放控制 + 流程选择 ========== */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/50">
        {/* 播放/暂停按钮 */}
        {activeFlow && (
          <>
            <button
              onClick={togglePlayPause}
              title={isPlaying ? '暂停播放' : '自动播放'}
              className={`p-1.5 rounded-md transition-all ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
            </button>
            {/* 单步前进 */}
            <button
              onClick={() => {
                if (!activeFlow) return;
                const next = currentStep >= activeFlow.steps.length ? 1 : currentStep + 1;
                onStepChange(next);
              }}
              title="单步前进"
              className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* 关闭 */}
        <button
          onClick={onClose}
          title="关闭流程高亮"
          className={`p-1.5 rounded-md transition-all ${
            activeFlow ? 'text-slate-500 hover:text-red-400' : 'bg-slate-700 text-slate-300'
          }`}
        >
          ✕
        </button>
      </div>

      {/* ========== 中间：流程选择标签页 ========== */}
      <div className="flex items-center gap-1">
        {ALL_PROCESS_FLOWS.map((flow) => {
          const fTheme = FLOW_THEME[flow.id];
          const isActive = activeFlow?.id === flow.id;

          return (
            <button
              key={flow.id}
              onClick={() => { onFlowChange(flow); onStepChange(flow.steps.length); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                isActive
                  ? `bg-gradient-to-r ${fTheme.gradientFrom} ${fTheme.gradientTo} text-white shadow-md`
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={`${flow.name}: ${flow.description}`}
            >
              <span>{flow.icon}</span>
              <span className="hidden xl:inline">{flow.name.slice(0, 4)}</span>
            </button>
          );
        })}
      </div>

      {/* ========== 右侧：当前步骤信息（激活时显示） ========== */}
      {activeFlow && theme && showSteps && (
        <>
          <div className="w-px h-6 bg-slate-700/50 mx-1" />

          {/* 进度指示 */}
          <div className="flex items-center gap-2">
            {/* Step N/M 文字 */}
            <span className={`text-[10px] font-bold tabular-nums ${theme.accentColor}`}>
              Step {currentStep}/{activeFlow.steps.length}
            </span>

            {/* 迷你步骤点（紧凑版） */}
            <div className="hidden lg:flex items-center">
              {activeFlow.steps.slice(0, maxVisibleDots).map((step, idx) => {
                const stepNum = idx + 1;
                const isCurrent = stepNum === currentStep;
                const isDone = stepNum < currentStep;
                const isCritical = step.isCritical;

                return (
                  <div key={step.nodeId} className="relative flex items-center">
                    {/* 连接线 */}
                    {idx > 0 && (
                      <div
                        className={`w-4 h-[2px] ${
                          isDone ? theme.lineDoneColor : theme.linePendingColor
                        }`}
                      />
                    )}

                    {/* 步骤点 */}
                    <div
                      className={`w-[7px] h-[7px] rounded-full transition-all duration-300 cursor-pointer relative ${
                        isCurrent
                          ? `${theme.dotActiveBg} ring-2 ring-offset-1 ring-offset-slate-900 scale-125 shadow-lg`
                          : isDone
                          ? theme.dotDoneBg
                          : theme.dotPendingClass
                      } ${isCritical ? 'ring-1 ring-amber-400/50' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onStepChange(stepNum); }}
                      title={`${stepNum}. ${step.name}${step.metric ? ` (${step.metric})` : ''}${step.isCritical ? ' ⚡关键' : ''}`}
                    />
                  </div>
                );
              })}
              {activeFlow.steps.length > maxVisibleDots && (
                <span className="text-[9px] text-slate-600 ml-1">+{activeFlow.steps.length - maxVisibleDots}</span>
              )}
            </div>

            {/* 当前步骤名称 + 关键指标 */}
            {currentStep > 0 && currentStep <= activeFlow.steps.length && (() => {
              const step = activeFlow.steps[currentStep - 1];
              return (
                <div className="flex items-center gap-1.5 min-w-0 max-w-[180px]">
                  {step.isCritical && <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  <span className={`text-[10px] font-semibold truncate ${theme.accentColor}`}>
                    {step.name}
                  </span>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* 无激活流程时的提示文字 */}
      {!activeFlow && (
        <span className="text-[10px] text-slate-600 italic px-1">
          选择流程查看故事线 →
        </span>
      )}
    </div>
  );
}
