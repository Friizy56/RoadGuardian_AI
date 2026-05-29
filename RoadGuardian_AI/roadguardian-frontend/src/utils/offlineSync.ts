import localforage from 'localforage';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export interface OfflineReport {
  id: string;
  type: 'image' | 'voice';
  latitude: string;
  longitude: string;
  hazard_type?: string;
  description?: string;
  mediaBlob: Blob;
  timestamp: number;
}

const OFFLINE_STORE_KEY = 'roadguardian_offline_reports';

export const saveOfflineReport = async (report: OfflineReport) => {
  try {
    const existing: OfflineReport[] = await localforage.getItem(OFFLINE_STORE_KEY) || [];
    existing.push(report);
    await localforage.setItem(OFFLINE_STORE_KEY, existing);
    toast.success('You are offline. Report saved securely and will sync when internet is restored!', { icon: '📶', duration: 5000 });
  } catch (error) {
    console.error('Failed to save offline report:', error);
    toast.error('Failed to save report offline.');
  }
};

export const syncOfflineReports = async () => {
  try {
    const existing: OfflineReport[] = await localforage.getItem(OFFLINE_STORE_KEY) || [];
    if (existing.length === 0) return;

    toast.loading(`Syncing ${existing.length} offline reports...`, { id: 'offline-sync' });

    for (let i = 0; i < existing.length; i++) {
      const report = existing[i];
      const formData = new FormData();
      formData.append('latitude', report.latitude);
      formData.append('longitude', report.longitude);

      if (report.type === 'image') {
        formData.append('image', report.mediaBlob, 'hazard_image.jpg');
        formData.append('hazard_type', report.hazard_type || 'other');
        formData.append('description', report.description || '');
        await api.post('/hazards/upload', formData);
      } else {
        formData.append('audio', report.mediaBlob, 'voice_report.webm');
        await api.post('/hazards/voice-report', formData);
      }
    }

    // Clear the store after successful sync
    await localforage.removeItem(OFFLINE_STORE_KEY);
    toast.success('All offline reports synced successfully!', { id: 'offline-sync' });
  } catch (error) {
    console.error('Sync failed:', error);
    toast.error('Failed to sync offline reports. Will retry later.', { id: 'offline-sync' });
  }
};
