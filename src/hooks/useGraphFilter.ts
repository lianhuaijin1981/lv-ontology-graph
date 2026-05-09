/**
 * useGraphFilter - 筛选状态管理 Hook
 * 从 App.tsx 中提取的筛选逻辑
 */

import { useState, useCallback } from 'react';
import type { BusinessDomain, FilterState } from '@/types';

interface UseGraphFilterReturn {
  filters: FilterState;
  toggleDomain: (domain: BusinessDomain) => void;
  toggleType: (typeId: string) => void;
  onImportanceChange: (value: number) => void;
  onSearchChange: (query: string) => void;
  resetFilters: () => void;
}

export function useGraphFilter(): UseGraphFilterReturn {
  const [filters, setFilters] = useState<FilterState>({
    domains: [],
    objectTypes: [],
    searchQuery: '',
    importanceMin: 0,
  });

  const toggleDomain = useCallback((domain: BusinessDomain) => {
    setFilters((prev) => {
      const exists = prev.domains.includes(domain);
      return {
        ...prev,
        domains: exists ? prev.domains.filter((d) => d !== domain) : [...prev.domains, domain],
      };
    });
  }, []);

  const toggleType = useCallback((typeId: string) => {
    setFilters((prev) => {
      const exists = prev.objectTypes.includes(typeId);
      return {
        ...prev,
        objectTypes: exists ? prev.objectTypes.filter((t) => t !== typeId) : [...prev.objectTypes, typeId],
      };
    });
  }, []);

  const onImportanceChange = useCallback((value: number) => {
    setFilters((prev) => ({ ...prev, importanceMin: value }));
  }, []);

  const onSearchChange = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ domains: [], objectTypes: [], searchQuery: '', importanceMin: 0 });
  }, []);

  return {
    filters,
    toggleDomain,
    toggleType,
    onImportanceChange,
    onSearchChange,
    resetFilters,
  };
}
