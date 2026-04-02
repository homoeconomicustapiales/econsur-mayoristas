'use client';

import { create } from 'zustand';
import { DateRange, VariationType } from '@/types';

interface DashboardStore {
  // Filtro de fechas global
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Tipo de variación activo
  variationType: VariationType;
  setVariationType: (type: VariationType) => void;
}

const DEFAULT_FROM = '2019-01-01';
const DEFAULT_TO   = '2026-01-01';

export const useDashboardStore = create<DashboardStore>((set) => ({
  dateRange: { from: DEFAULT_FROM, to: DEFAULT_TO },
  setDateRange: (range) => set({ dateRange: range }),
  variationType: 'interanual',
  setVariationType: (type) => set({ variationType: type }),
}));
