import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

const COLORS = ['#06b6d4', '#9333ea', '#f59e0b', '#dc2626', '#10b981', '#3b82f6'];

export const AuthorityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/hazards/dashboard');
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const timeData = data?.time_data || [];
  const typeData = data?.type_data || [];

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
            <div className="text-2xl font-bold text-destructive">{data?.total_hazards || 0}</div>
            <p className="text-xs text-muted-foreground">Lifetime reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Repairs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pending_count || 0}</div>
            <p className="text-xs text-muted-foreground">{data?.high_urgency_count || 0} critical urgency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Severity</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.avg_severity?.toFixed(1) || '0.0'} / 10</div>
            <p className="text-xs text-muted-foreground">System-wide average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Hazards</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.resolved_count || 0}</div>
            <p className="text-xs text-muted-foreground">Total fixed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Hazards Reported Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                  <Line type="monotone" dataKey="hazards" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Hazard Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {typeData.length > 0 ? (
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
                    {typeData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
         <CardHeader>
           <CardTitle>Recent Hazards Queue</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {data?.recent_hazards?.map((hazard: any) => (
               <div key={hazard.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 ${
                 hazard.urgency_level === 'critical' || hazard.urgency_level === 'high' 
                  ? 'bg-destructive/10 border-destructive/20' 
                  : 'bg-muted/50 border-border'
               }`}>
                 <div>
                   <div className="flex items-center gap-2">
                     {(hazard.urgency_level === 'critical' || hazard.urgency_level === 'high') && (
                       <span className="bg-destructive text-white text-xs font-bold px-2 py-1 rounded uppercase">{hazard.urgency_level}</span>
                     )}
                     <span className="font-bold text-lg">{hazard.hazard_type.replace('_', ' ').toUpperCase()}</span>
                   </div>
                   <p className="text-sm text-muted-foreground mt-1">
                     Reported on {new Date(hazard.created_at).toLocaleDateString()} • {hazard.location_address || `Lat: ${hazard.latitude.toFixed(2)}, Lng: ${hazard.longitude.toFixed(2)}`}
                   </p>
                 </div>
                 <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-bold w-full md:w-auto transition-colors">
                   View Details
                 </button>
               </div>
             ))}
             {(!data?.recent_hazards || data.recent_hazards.length === 0) && (
               <div className="text-center py-4 text-muted-foreground">
                 No recent hazards to display.
               </div>
             )}
           </div>
         </CardContent>
      </Card>
    </div>
  );
};
