/**
 * ViewSwitcher - 视图切换 + 面包屑导航
 */

import { Button } from '@/components/ui/button';
import type { EntityId } from '@/types';
import type { GraphMode } from '@/graph/types';
import { Layers, Network, Search, Footprints, ZoomOut, Maximize } from 'lucide-react';

interface ViewSwitcherProps {
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
  breadcrumb: EntityId[];
  breadcrumbLabels: Record<EntityId, string>;
  onBreadcrumbClick: (index: number) => void;
  onFitView: () => void;
  onResetView: () => void;
}

export function ViewSwitcher({
  mode,
  onModeChange,
  breadcrumb,
  breadcrumbLabels,
  onBreadcrumbClick,
  onFitView,
  onResetView,
}: ViewSwitcherProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
      {/* 视图控制栏 */}
      <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl flex items-center p-1">
        <Button
          variant={mode === 'map' ? 'secondary' : 'ghost'}
          size="sm"
          className={`gap-1.5 text-xs ${mode === 'map' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          onClick={() => onModeChange('map')}
        >
          <Layers className="w-3.5 h-3.5" />
          地图
        </Button>
        <Button
          variant={mode === 'investigate' ? 'secondary' : 'ghost'}
          size="sm"
          className={`gap-1.5 text-xs ${mode === 'investigate' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          onClick={() => onModeChange('investigate')}
        >
          <Network className="w-3.5 h-3.5" />
          侦查
        </Button>
        <Button
          variant={mode === 'search' ? 'secondary' : 'ghost'}
          size="sm"
          className={`gap-1.5 text-xs ${mode === 'search' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          onClick={() => onModeChange('search')}
        >
          <Search className="w-3.5 h-3.5" />
          搜索
        </Button>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400"
          onClick={onFitView}
          title="适应视图"
        >
          <Maximize className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400"
          onClick={onResetView}
          title="重置视图"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 面包屑 */}
      {breadcrumb.length > 0 && (
        <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-1.5 max-w-md flex-wrap">
          <Footprints className="w-3 h-3 text-amber-500" />
          {breadcrumb.map((id, index) => (
            <div key={id} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-slate-600 text-xs">→</span>}
              <button
                onClick={() => onBreadcrumbClick(index)}
                className="text-xs text-slate-300 hover:text-amber-400 transition-colors"
              >
                {breadcrumbLabels[id] || id}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
