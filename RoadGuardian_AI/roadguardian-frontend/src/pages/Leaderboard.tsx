import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, BarChart3, AlertTriangle, FileText } from 'lucide-react';

import { api } from '@/services/api';

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = React.useState<any[]>([]);
  const [period, setPeriod] = React.useState('all_time');

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get(`/auth/leaderboard?period=${period}`);
        setLeaderboard(response.data);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      }
    };
    fetchLeaderboard();
  }, [period]);
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-[#138808] pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#000080] dark:text-foreground">Official Civic Leaderboard</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-wider mt-1">Public ranking of verified infrastructure reporters.</p>
        </div>
        <div className="flex gap-2 bg-slate-50 dark:bg-muted p-1 border border-border">
          <button 
            onClick={() => setPeriod('all_time')}
            className={`px-4 py-1.5 text-[10px] uppercase tracking-widest ${period === 'all_time' ? 'font-black bg-white dark:bg-card shadow-sm border border-border text-[#000080] dark:text-primary' : 'font-bold text-muted-foreground hover:text-foreground'}`}
          >
            All Time
          </button>
          <button 
            onClick={() => setPeriod('this_month')}
            className={`px-4 py-1.5 text-[10px] uppercase tracking-widest ${period === 'this_month' ? 'font-black bg-white dark:bg-card shadow-sm border border-border text-[#000080] dark:text-primary' : 'font-bold text-muted-foreground hover:text-foreground'}`}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 0, 2].map((idx) => {
          const user = leaderboard[idx];
          if (!user) return null;
          
          const rankNum = idx + 1;
          const isTop = rankNum === 1;
          
          return (
            <Card key={user.id} className={`rounded-sm shadow-sm bg-white dark:bg-card ${isTop ? 'md:-translate-y-2 border-t-4 border-t-[#FF9933]' : 'border-t-4 border-t-[#000080] dark:border-t-primary'}`}>
              <CardHeader className="bg-slate-50 dark:bg-muted/50 border-b border-border py-2 px-4 flex flex-row items-center justify-between space-y-0">
                 <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Rank #{rankNum}</span>
                 {isTop && <Trophy className="w-4 h-4 text-[#FF9933]" />}
              </CardHeader>
              <CardContent className="flex flex-col items-center p-6 text-center space-y-4">
                <div>
                  <h3 className="font-black uppercase text-lg text-foreground tracking-wider">{user.full_name || user.email.split('@')[0]}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#000080] dark:text-primary mt-1">{user.points >= 2000 ? 'CIVIC HERO' : user.points >= 1000 ? 'ELITE REPORTER' : 'VETERAN'}</p>
                </div>
                
                <table className="w-full text-left text-xs font-mono border border-border">
                   <tbody className="divide-y divide-border bg-slate-50 dark:bg-muted/30">
                     <tr>
                       <td className="py-2 px-3 font-bold text-muted-foreground uppercase w-1/2">Verified Logs</td>
                       <td className="py-2 px-3 font-black">{Math.floor(user.points / 50)}</td>
                     </tr>
                     <tr>
                       <td className="py-2 px-3 font-bold text-muted-foreground uppercase">Civic Points</td>
                       <td className="py-2 px-3 font-black text-[#138808] dark:text-success">{user.points}</td>
                     </tr>
                   </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm rounded-sm bg-white dark:bg-card border-border overflow-hidden">
        <div className="bg-[#000080] dark:bg-slate-900 text-white py-2 px-4 flex justify-between items-center border-b border-border/50">
          <h2 className="font-black uppercase text-xs tracking-widest flex items-center"><BarChart3 className="w-3.5 h-3.5 mr-2 text-[#FF9933]"/> Extended Rankings Directory</h2>
          <span className="text-[10px] font-mono opacity-80 border border-white/30 px-2 py-0.5">REF: LDB-26</span>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-muted-foreground uppercase tracking-widest bg-slate-50 dark:bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-bold border-r border-border w-24 text-center">Rank</th>
                <th className="px-6 py-3 font-bold border-r border-border">Citizen Name</th>
                <th className="px-6 py-3 font-bold border-r border-border">Clearance Level</th>
                <th className="px-6 py-3 font-bold text-right border-r border-border">Verified Reports</th>
                <th className="px-6 py-3 font-bold text-right text-[#000080] dark:text-primary">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.slice(3).map((user, idx) => (
                <tr key={user.id} className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-foreground text-center border-r border-border">
                    {idx + 4}
                  </td>
                  <td className="px-6 py-3 font-bold uppercase tracking-wider text-foreground border-r border-border">
                    {user.full_name || user.email.split('@')[0]}
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border">
                    {user.points >= 2000 ? 'CIVIC HERO' : user.points >= 1000 ? 'ELITE REPORTER' : 'VETERAN'}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-medium text-foreground border-r border-border">
                    {Math.floor(user.points / 50)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-black text-[#138808] dark:text-success">
                    {user.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-[#fdf2e9] dark:bg-yellow-950/20 p-2 border-t border-border">
             <p className="text-[9px] text-center text-[#b45309] dark:text-yellow-500 font-bold uppercase tracking-wider">
               ⚠️ Points are audited weekly. Automated systems detect and penalize fraudulent reporting.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
