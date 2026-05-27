import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Activity, Map, Trophy } from 'lucide-react';

export const Landing = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Activity, title: 'AI Detection', desc: 'Real-time hazard severity analysis.' },
    { icon: Map, title: 'Live Heatmaps', desc: 'Identify high-risk accident zones.' },
    { icon: Trophy, title: 'Gamification', desc: 'Earn badges and top the leaderboard.' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-3xl"
      >
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
          CoERS Hackathon 2026 Finalist
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          AI-Powered <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300">Road Safety</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Report hazards with voice and vision AI. Earn rewards. Save lives.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 justify-center"
      >
        <Button size="lg" onClick={() => navigate('/report')} className="h-12 px-8 text-lg">
          Report Hazard
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="h-12 px-8 text-lg">
          Authority Login
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-12"
      >
        {features.map((f, i) => (
          <div key={i} className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-shadow">
            <f.icon className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
