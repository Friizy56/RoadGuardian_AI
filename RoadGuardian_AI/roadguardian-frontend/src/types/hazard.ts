export type HazardType = 'pothole' | 'crack' | 'waterlogging' | 'broken_divider' | 'missing_sign' | 'other';
export type HazardStatus = 'Pending' | 'In Progress' | 'Resolved';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Hazard {
  id: string;
  userId: string;
  type: HazardType;
  location: Location;
  severityScore: number;
  urgency: UrgencyLevel;
  status: HazardStatus;
  mediaUrl: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  aiConfidence?: number;
}
