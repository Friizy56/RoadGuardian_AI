import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { User as UserIcon } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuthStore();

  const mockBadges = [
    { id: '1', name: 'First Report', description: 'Submitted your first hazard report.', icon: '🌟', earnedAt: new Date().toISOString() },
    { id: '2', name: 'Pothole Hunter', description: 'Reported 10 potholes successfully.', icon: '🕳️', earnedAt: new Date().toISOString() },
    { id: '3', name: 'Night Owl', description: 'Reported a hazard between 12AM and 4AM.', icon: '🦉', earnedAt: new Date().toISOString() }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 text-center flex flex-col items-center p-6 space-y-4">
          <div className="w-32 h-32 rounded-full bg-secondary/30 border-4 border-primary flex items-center justify-center">
            <UserIcon className="w-16 h-16 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.fullName}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
              {user?.role.toUpperCase()}
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeGrid badges={user?.badges?.length ? user.badges : mockBadges} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
