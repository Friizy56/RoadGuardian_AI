import { create } from 'zustand';
import { Hazard, HazardType, HazardStatus } from '@/types/hazard';

export interface FilterOptions {
  type: HazardType | 'all';
  status: HazardStatus | 'all';
  minSeverity: number;
}

interface HazardState {
  hazards: Hazard[];
  filters: FilterOptions;
  setHazards: (hazards: Hazard[]) => void;
  addHazard: (hazard: Hazard) => void;
  updateHazard: (id: string, updates: Partial<Hazard>) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
}

export const useHazardStore = create<HazardState>((set) => ({
  hazards: [],
  filters: {
    type: 'all',
    status: 'all',
    minSeverity: 0,
  },
  setHazards: (hazards) => set({ hazards }),
  addHazard: (hazard) => set((state) => ({ hazards: [hazard, ...state.hazards] })),
  updateHazard: (id, updates) => set((state) => ({
    hazards: state.hazards.map(h => h.id === id ? { ...h, ...updates } : h)
  })),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
}));
