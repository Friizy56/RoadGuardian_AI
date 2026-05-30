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
  mediaFilename: string;
  mediaMimeType: string;
  mediaBase64: string;
  timestamp: number;
}

export type OfflineReportPayload = Omit<OfflineReport, 'mediaBase64'> & {
  mediaBlob: Blob;
};

const OFFLINE_STORE_KEY = 'roadguardian_offline_reports';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const base64ToBlob = (base64: string, type: string) => {
  const parts = base64.split(',');
  const raw = atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type });
};

export const saveOfflineReport = async (report: OfflineReportPayload): Promise<boolean> => {
  try {
    const existing: OfflineReport[] = (await localforage.getItem(OFFLINE_STORE_KEY)) || [];
    const mediaBase64 = await blobToBase64(report.mediaBlob);
    existing.push({
      ...report,
      mediaBase64,
    });
    await localforage.setItem(OFFLINE_STORE_KEY, existing);
    toast.success('You are offline. Report saved securely and will sync when internet is restored!', { icon: '📶', duration: 5000 });
    return true;
  } catch (error) {
    console.error('Failed to save offline report:', error);
    toast.error('Failed to save report offline.');
    return false;
  }
};

export const syncOfflineReports = async () => {
  try {
    const existing: OfflineReport[] = (await localforage.getItem(OFFLINE_STORE_KEY)) || [];
    if (existing.length === 0) return;

    toast.loading(`Syncing ${existing.length} offline reports...`, { id: 'offline-sync' });

    for (const report of existing) {
      const formData = new FormData();
      formData.append('latitude', report.latitude);
      formData.append('longitude', report.longitude);

      const blob = base64ToBlob(report.mediaBase64, report.mediaMimeType);

      if (report.type === 'image') {
        formData.append('image', blob, report.mediaFilename);
        formData.append('hazard_type', report.hazard_type || 'other');
        formData.append('description', report.description || '');
        await api.post('/hazards/upload', formData);
      } else {
        formData.append('audio', blob, report.mediaFilename);
        await api.post('/hazards/voice-report', formData);
      }
    }

    await localforage.removeItem(OFFLINE_STORE_KEY);
    toast.success('All offline reports synced successfully!', { id: 'offline-sync' });
  } catch (error) {
    console.error('Sync failed:', error);
    toast.error('Failed to sync offline reports. Will retry later.', { id: 'offline-sync' });
  }
};
