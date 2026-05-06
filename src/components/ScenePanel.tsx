/**
 * ScenePanel — 场景分析面板
 *
 * 展示5大业务场景的洞察结论：
 * - 场景名称 + 图标 + 描述
 * - 多条结构化洞察（标题/内容/级别/推荐动作）
 * - 关联流程高亮按钮
 */

import { useMemo } from 'react';
import type { EntityId } from '@/types';
import type { SceneResult, BusinessScene } from '@/data/scenes';
import { ALL_SCENES, recommendScenes, getSceneById } from '@/data/scenes';
import type { ProcessFlow } from '@/data/processFlows';
import { X, AlertTriangle, Info, AlertCircle, ChevronRight, Lightbulb } from 'lucide-react';

interface Props {
  /** 当前选中的实体ID */
  entityId: EntityId;
  /** 实体类型ID（用于推荐场景） */
  typeId?: string;
  /** 实体显示名 */
  entityName?: string;
  /** 分析结果 */
  result: SceneResult | null;
  /** 执行场景分析回调 */
  onRunScene: (sceneId: string) => void;
  /** 关闭面板 */
  onClose: () => void;
}

const LEVEL_ICON = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const LEVEL_COLOR = {
  info: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  warning: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  danger: 'text-red-400 border-red-400/30 bg-red-400/5',
};

export function ScenePanel({ entityId, typeId, entityName, result, onRunScene, onClose }: Props) {
  // 根据节点类型推荐可用场景
  const recommendedScenes = useMemo(() => {
    if (typeId) return recommendScenes(typeId);
    return ALL_SCENES;
  }, [typeId]);

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur flex flex-col border-l border-slate-800">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white">场景分析</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{entityName || entityId}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 场景选择器 */}
      {!result && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-xs text-slate-400 mb-2">选择分析场景：</div>
          {recommendedScenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onRunScene(scene.id)}
              className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-850 hover:bg-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">{scene.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                      {scene.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{scene.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors mt-1 flex-shrink-0" />
              </div>
            </button>
          ))}

          {recommendedScenes.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-8">
              该类型暂无匹配场景，可尝试其他场景
            </div>
          )}
        </div>
      )}

      {/* 洞察结果 */}
      {result && (
        <div className="flex-1 overflow-y-auto">
          {/* 场景标题栏 */}
          <div className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-800/50 to-transparent">
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.scene.icon}</span>
              <span className="text-sm font-semibold text-white">{result.scene.name}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{result.scene.description}</p>
          </div>

          {/* 流程关联提示 */}
          {result.flow && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400">
                  关联流程: {result.flow.name}
                  {result.flowStep ? ` (第${result.flowStep}步)` : ''}
                </span>
              </div>
              <p className="text-[10px] text-emerald-500/80">
                图谱已高亮流程路径 · 共{result.flow.steps.length}个步骤
              </p>
            </div>
          )}

          {/* 洞察列表 */}
          <div className="p-4 space-y-3">
            {result.insights.map((insight, idx) => {
              const IconComp = LEVEL_ICON[insight.level];
              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${LEVEL_COLOR[insight.level]}`}
                >
                  <div className="flex items-start gap-2">
                    <IconComp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold mb-1">{insight.title}</div>
                      <div
                        className="text-[11px] leading-relaxed opacity-90"
                        dangerouslySetInnerHTML={{ __html: insight.content }}
                      />
                      {insight.action && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium opacity-100">
                          <Lightbulb className="w-3 h-3" />
                          <span>{insight.action}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 关联节点列表 */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 mb-2">
                关联 {result.highlightIds.length} 个节点已高亮
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
