import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { AnimatedCounter } from '@/components/gamification/AnimatedCounter';
import { ShieldPlus, Activity, Trophy } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
        </div>
        <Button size="lg" onClick={() => navigate('/report')}>
          <ShieldPlus className="mr-2 h-5 w-5" /> Report New Hazard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              <AnimatedCounter from={0} to={user?.points || 0} />
            </div>
            <p className="text-xs text-muted-foreground">Top 5% in your city</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Submitted</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Reports</CardTitle>
            <ShieldPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">66% accuracy rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">No recent reports found. Start reporting to help your community!</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Gamification Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Level: Civic Hero</span>
                <span className="font-bold text-primary">450 / 500 XP</span>
              </div>
              <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '90%' }}></div>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
              View Badges
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
