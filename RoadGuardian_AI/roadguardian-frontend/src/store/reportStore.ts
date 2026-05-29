import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Report {
  id: string;
  type: string;
  severity: number;
  location: string;
  date: string;
  status: 'Pending' | 'Under Review' | 'Resolved';
  code: string;
  image?: string;
  transcript?: string;
  coords?: { lat: number, lng: number } | null;
}

interface ReportState {
  // Store left empty for potential future client-side states, actual reports are fetched via API.
}

export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      // Cleaned up dummy data
    }),
    {
      name: 'report-storage',
    }
  )
);
