export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'citizen' | 'authority';
  points: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}
