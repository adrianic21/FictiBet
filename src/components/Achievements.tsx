import React from 'react';
import { ACHIEVEMENTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

export default function Achievements() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-black">Logros y Medallas</h2>
        <p className="text-zinc-500">Demuestra tu valía y desbloquea recompensas exclusivas.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map((achievement, index) => {
          const IconComponent = (Icons as any)[achievement.icon] || Icons.Award;
          const isUnlocked = user?.achievements.includes(achievement.id);

          return (
            <motion.div 
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.01, 1) }}
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isUnlocked 
                  ? 'bg-[#ff6321]/10 border-[#ff6321]/30 dark:bg-[#ff6321]/10 dark:border-[#ff6321]/30' 
                  : 'bg-zinc-50 dark:bg-[#111] border-zinc-200 dark:border-white/5 opacity-60 grayscale'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-[#ff6321] text-white' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-600'}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recompensa</span>
                  <p className="text-[#ff6321] font-mono font-bold">+{achievement.points} pts</p>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{achievement.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-tight">{achievement.description}</p>
              </div>
              {isUnlocked && (
                <div className="mt-4 pt-4 border-t border-[#ff6321]/20 flex items-center gap-2 text-[10px] font-bold text-[#ff6321] uppercase">
                  <Icons.CheckCircle2 className="w-3 h-3" />
                  Desbloqueado
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
