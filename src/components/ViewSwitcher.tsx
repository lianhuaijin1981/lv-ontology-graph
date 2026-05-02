/**
 * ViewSwitcher - 面包屑导航（带清空按钮）
 */

import type { EntityId } from '@/types';
import { Footprints, X } from 'lucide-react';

interface ViewSwitcherProps {
  breadcrumb: EntityId[];
  breadcrumbLabels: Record<EntityId, string>;
  onBreadcrumbClick: (index: number) => void;
  onClear?: () => void;
}

export function ViewSwitcher({ breadcrumb, breadcrumbLabels, onBreadcrumbClick, onClear }: ViewSwitcherProps) {
  if (breadcrumb.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2 max-w-md flex-wrap">
        <Footprints className="w-3 h-3 text-amber-500 flex-shrink-0" />
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
        {onClear && (
          <button
            onClick={onClear}
            className="ml-1 p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
            title="清空路径"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
