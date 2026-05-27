import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

const mockLeaderboard = [
  { id: '1', name: 'Alex Johnson', points: 2450, reports: 128 },
  { id: '2', name: 'Sarah Smith', points: 2100, reports: 104 },
  { id: '3', name: 'Michael Chen', points: 1950, reports: 89 },
  { id: '4', name: 'Emily Davis', points: 1800, reports: 76 },
  { id: '5', name: 'David Wilson', points: 1650, reports: 62 },
];

export const Leaderboard = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <div className="flex gap-2 bg-secondary/20 p-1 rounded-lg">
          <button className="px-4 py-1 text-sm font-medium bg-background shadow-sm rounded-md">All Time</button>
          <button className="px-4 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">This Month</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 0, 2].map((idx) => {
          const user = mockLeaderboard[idx];
          if (!user) return null;
          
          const colors = [
            'border-yellow-400 bg-yellow-400/10 text-yellow-500', 
            'border-gray-400 bg-gray-400/10 text-gray-400',       
            'border-amber-700 bg-amber-700/10 text-amber-700'     
          ];
          const position = idx;
          const color = colors[position];
          const heightClass = position === 0 ? 'md:-translate-y-4' : '';

          return (
            <Card key={user.id} className={`border-2 ${color} ${heightClass} transition-transform`}>
              <CardContent className="flex flex-col items-center p-6 text-center space-y-2">
                <Trophy className="w-12 h-12 mb-2" />
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="font-bold text-2xl">{user.points} <span className="text-sm font-normal">pts</span></p>
                <p className="text-xs opacity-80">{user.reports} verified reports</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {mockLeaderboard.slice(3).map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center font-bold text-muted-foreground">{idx + 4}</span>
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex gap-8 text-right">
                  <div>
                    <p className="font-bold">{user.points} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
