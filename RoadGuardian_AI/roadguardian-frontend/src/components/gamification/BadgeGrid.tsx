import React from 'react';
import { Badge } from '@/types/user';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export const BadgeGrid = ({ badges }: { badges: Badge[] }) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
        <Trophy className="w-12 h-12 mb-2 opacity-50" />
        <p>No badges earned yet. Start reporting to earn rewards!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="group relative flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary transition-colors cursor-pointer"
        >
          <div className="text-4xl mb-2">{badge.icon}</div>
          <p className="text-xs font-semibold text-center truncate w-full">{badge.name}</p>
          
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs rounded p-2 bottom-full mb-2 w-48 text-center z-10 pointer-events-none shadow-lg">
            <p className="font-bold">{badge.name}</p>
            <p className="text-muted-foreground">{badge.description}</p>
            <p className="mt-1 text-[10px]">Earned: {new Date(badge.earnedAt).toLocaleDateString()}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
