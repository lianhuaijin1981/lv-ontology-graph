/**
 * FilterPanel - 筛选面板
 * 支持按业务板块、对象类型、重要性、关键词搜索筛选
 */

import { useState } from 'react';
import type { BusinessDomain } from '@/types';
import { BusinessDomains } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface FilterPanelProps {
  domains: BusinessDomain[];
  selectedDomains: BusinessDomain[];
  onDomainToggle: (domain: BusinessDomain) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  importanceMin: number;
  onImportanceChange: (value: number) => void;
  objectTypeOptions: { id: string; label: string; color: string }[];
  selectedTypes: string[];
  onTypeToggle: (typeId: string) => void;
  onReset: () => void;
}

export function FilterPanel({
  selectedDomains,
  onDomainToggle,
  searchQuery,
  onSearchChange,
  importanceMin,
  onImportanceChange,
  objectTypeOptions,
  selectedTypes,
  onTypeToggle,
  onReset,
}: FilterPanelProps) {
  const [isOpen] = useState(true);

  const hasActiveFilters =
    selectedDomains.length > 0 ||
    searchQuery ||
    importanceMin > 0 ||
    selectedTypes.length > 0;

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-xl overflow-hidden w-64">
        {/* 头部 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">筛选</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-violet-600 text-white">
                已激活
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-slate-300"
                onClick={onReset}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {isOpen && (
          <ScrollArea className="max-h-[70vh]">
            <div className="p-3 space-y-4">
              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="搜索实体..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8 h-8 text-sm bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600"
                />
              </div>

              {/* 业务板块 */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">业务板块</p>
                <div className="flex flex-wrap gap-1.5">
                  {BusinessDomains.map((domain) => {
                    const isActive = selectedDomains.includes(domain);
                    const domainColors: Record<string, string> = {
                      '研发设计': '#F59E0B',
                      '生产制造': '#3B82F6',
                      '供应链管理': '#10B981',
                      '质量管控': '#EF4444',
                      '业务系统支撑': '#8B5CF6',
                      '市场渠道销售': '#EC4899',
                      '订单物流报关': '#06B6D4',
                      '成本利润核算': '#F97316',
                      '经营风险管控': '#DC2626',
                    };
                    return (
                      <button
                        key={domain}
                        onClick={() => onDomainToggle(domain)}
                        className={`px-2 py-1 rounded text-[11px] transition-all border ${
                          isActive
                            ? 'text-white border-transparent'
                            : 'text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                        style={
                          isActive
                            ? { backgroundColor: domainColors[domain], borderColor: domainColors[domain] }
                            : {}
                        }
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 对象类型 */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">对象类型</p>
                <div className="flex flex-wrap gap-1.5">
                  {objectTypeOptions.map((type) => {
                    const isActive = selectedTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => onTypeToggle(type.id)}
                        className={`px-2 py-1 rounded text-[11px] transition-all border ${
                          isActive
                            ? 'text-white border-transparent'
                            : 'text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                        style={
                          isActive
                            ? { backgroundColor: type.color, borderColor: type.color }
                            : {}
                        }
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 重要性 */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">
                  重要性 ≥ {Math.round(importanceMin * 100)}%
                </p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={importanceMin * 100}
                  onChange={(e) => onImportanceChange(Number(e.target.value) / 100)}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
