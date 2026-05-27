import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

const timeData = [
  { name: 'Mon', hazards: 12 },
  { name: 'Tue', hazards: 19 },
  { name: 'Wed', hazards: 15 },
  { name: 'Thu', hazards: 22 },
  { name: 'Fri', hazards: 30 },
  { name: 'Sat', hazards: 45 },
  { name: 'Sun', hazards: 28 },
];

const typeData = [
  { name: 'Potholes', value: 400 },
  { name: 'Cracks', value: 300 },
  { name: 'Waterlogging', value: 300 },
  { name: 'Missing Signs', value: 200 },
];
const COLORS = ['#06b6d4', '#9333ea', '#f59e0b', '#dc2626'];

export const AuthorityDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Authority Analytics</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hazards</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">1,245</div>
            <p className="text-xs text-muted-foreground">+14% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Repairs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">84 critical urgency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2 Days</div>
            <p className="text-xs text-muted-foreground">-0.4 days improvement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">890</div>
            <p className="text-xs text-muted-foreground">Highest repair rate year-to-date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Hazards Reported Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="hazards" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Hazard Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
         <CardHeader>
           <CardTitle>Priority Action Queue</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {[1,2,3].map((i) => (
               <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg gap-4">
                 <div>
                   <div className="flex items-center gap-2">
                     <span className="bg-destructive text-white text-xs font-bold px-2 py-1 rounded">CRITICAL</span>
                     <span className="font-bold text-lg">Massive Sinkhole</span>
                   </div>
                   <p className="text-sm text-muted-foreground mt-1">Reported {i * 2} hours ago • Mount Road Intersection</p>
                 </div>
                 <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-bold w-full md:w-auto">
                   Dispatch Team
                 </button>
               </div>
             ))}
           </div>
         </CardContent>
      </Card>
    </div>
  );
};
