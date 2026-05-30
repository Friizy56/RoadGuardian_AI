import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { AnimatedCounter } from '@/components/gamification/AnimatedCounter';
import { ShieldPlus, Activity, Trophy, MapPin, CalendarClock, Server, AlertTriangle } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const [reports, setReports] = React.useState<any[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/hazards/my-reports');
        setReports(response.data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      }
    };
    if (user) {
      fetchReports();
    }
  }, [user]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-[#138808] pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#000080] dark:text-foreground">Citizen Dashboard</h1>
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider mt-2">Authorized Profile: {user?.fullName} | Node: IND-204-VX</p>
        </div>
        <Button size="lg" onClick={() => navigate('/report')} className="bg-[#FF9933] hover:bg-[#e68a2e] text-white rounded-sm font-black text-sm uppercase shadow-sm border-b-2 border-[#b45309] active:border-b-0 active:translate-y-px px-6 h-12">
          <ShieldPlus className="mr-2 h-5 w-5" /> File Hazard Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-t-4 border-t-[#000080] dark:border-t-primary rounded-sm shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-slate-50 dark:bg-muted/50 border-b border-border p-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#000080] dark:text-primary">Civic Score</CardTitle>
            <Trophy className="h-5 w-5 text-[#FF9933]" />
          </CardHeader>
          <CardContent className="p-6 flex justify-between items-end">
            <div>
              <div className="text-5xl font-black text-[#000080] dark:text-foreground font-mono leading-none">
                <AnimatedCounter from={0} to={user?.points || 0} />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-2">Top 5% bracket</p>
            </div>
            <div className="text-xs font-mono font-bold bg-muted px-3 py-1.5 border border-border">RANK: HERO</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#138808] dark:border-t-success rounded-sm shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-slate-50 dark:bg-muted/50 border-b border-border p-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#000080] dark:text-primary">Logs Submitted</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 flex justify-between items-end">
            <div>
               <div className="text-5xl font-black text-foreground font-mono leading-none">{Array.isArray(reports) ? reports.length : 0}</div>
               <p className="text-xs font-bold text-success uppercase mt-2">Active Tracker</p>
            </div>
            <div className="text-xs font-mono font-bold bg-muted px-3 py-1.5 border border-border text-success">ACTIVE</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#FF9933] rounded-sm shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-slate-50 dark:bg-muted/50 border-b border-border p-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#000080] dark:text-primary">Verified Accuracy</CardTitle>
            <ShieldPlus className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent className="p-6 flex justify-between items-end">
             <div>
                <div className="text-5xl font-black text-foreground font-mono leading-none">8</div>
                <p className="text-xs font-bold text-muted-foreground uppercase mt-2">66% accuracy rate</p>
             </div>
             <div className="text-xs font-mono font-bold bg-muted px-3 py-1.5 border border-border">VERIFIED</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        <Card className="col-span-8 rounded-sm shadow-sm overflow-hidden border-border bg-white dark:bg-card">
          <div className="bg-[#000080] dark:bg-slate-900 text-white py-3 px-5 flex justify-between items-center border-b border-border/50">
            <h2 className="font-black uppercase text-sm tracking-widest flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-[#FF9933]" /> Official Incident Registry</h2>
          </div>
          <CardContent className="p-0">
             <table className="w-full text-left text-sm border-collapse">
               <thead className="bg-slate-50 dark:bg-muted/50 border-b border-border">
                 <tr>
                   <th className="py-3 px-5 font-bold uppercase tracking-wider text-muted-foreground">Log ID</th>
                   <th className="py-3 px-5 font-bold uppercase tracking-wider text-muted-foreground">Classification</th>
                   <th className="py-3 px-5 font-bold uppercase tracking-wider text-muted-foreground">Location Vector</th>
                   <th className="py-3 px-5 font-bold uppercase tracking-wider text-muted-foreground">Status / Severity</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {(Array.isArray(reports) ? reports : []).slice(0, 5).map(report => (
                   <tr key={report?.id} className="hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors">
                     <td className="py-4 px-5 font-mono font-bold text-[#000080] dark:text-primary text-[13px]">HZ-{report?.id}</td>
                     <td className="py-4 px-5 font-bold text-foreground uppercase">{report?.hazard_type?.replace('_', ' ') || 'UNKNOWN'}</td>
                     <td className="py-4 px-5">
                       <div className="flex items-center text-muted-foreground font-medium"><MapPin className="w-4 h-4 mr-1.5" /> {report?.latitude?.toFixed(4) || 'N/A'}, {report?.longitude?.toFixed(4) || 'N/A'}</div>
                       <div className="flex items-center text-muted-foreground text-xs mt-1.5"><CalendarClock className="w-3.5 h-3.5 mr-1.5" /> {report?.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}</div>
                     </td>
                     <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-sm font-bold uppercase tracking-wider border text-xs ${
                          report?.status === 'resolved' ? 'bg-success/10 text-success border-success/30' : 
                          report?.status === 'pending' ? 'bg-destructive/10 text-destructive border-destructive/30' : 
                          'bg-muted text-foreground border-border'
                        }`}>
                          {report?.status || 'UNKNOWN'}
                        </span>
                        <div className="font-mono text-xs mt-2.5 font-bold text-muted-foreground">SEV: {report?.severity_score ?? 0}/10</div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </CardContent>
        </Card>
        
        <div className="col-span-4 flex flex-col gap-6 h-full">
           <Card className="rounded-sm shadow-sm overflow-hidden border-border bg-white dark:bg-card">
              <div className="bg-slate-50 dark:bg-muted/50 border-b border-border py-3 px-5">
                <h4 className="font-bold text-sm uppercase text-[#000080] dark:text-primary tracking-wider flex items-center">
                  <Server className="w-4 h-4 mr-2" /> Clearance Level
                </h4>
              </div>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-3 border border-border p-4 rounded-sm bg-slate-50/50 dark:bg-background">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-[#000080] dark:text-primary">Civic Hero</span>
                    <span className="font-mono text-[#FF9933]">450 / 500 XP</span>
                  </div>
                  <div className="h-3 w-full bg-border rounded-none overflow-hidden border border-border/50">
                    <div className="h-full bg-[#138808]" style={{ width: '90%' }}></div>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-sm font-bold uppercase text-xs tracking-wider border-border hover:bg-slate-50 dark:hover:bg-muted h-10" onClick={() => navigate('/profile')}>
                  Access Full Records
                </Button>
              </CardContent>
           </Card>

           <div className="bg-[#fdf2e9] dark:bg-yellow-950/20 p-4 border border-[#FF9933]/30 rounded-sm mt-auto">
             <p className="text-xs text-[#b45309] dark:text-yellow-500 font-bold uppercase tracking-wider leading-relaxed text-center">
               ⚠️ Falsified reporting is a punishable offense under IT Act Section 43.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};
