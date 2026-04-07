import React, { useState } from 'react';
import { Selection, Bet } from '../types';
import { X, ChevronUp, ChevronDown, Ticket, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';

export default function BetSlip({ selections, onRemove, onClear }: { 
  selections: Selection[], 
  onRemove: (id: string) => void,
  onClear: () => void
}) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stake, setStake] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const potentialHits = selections.length;
  const potentialWin = stake * potentialHits;
  const canSettle = selections.length >= 2 && stake > 0;

  const handleSettle = async () => {
    if (!user || !canSettle || isSubmitting) return;
    if (stake > user.points) {
      alert('Puntos insuficientes');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'bets'),
        where('userId', '==', user.uid),
        where('createdAt', '>=', today.toISOString()),
        where('createdAt', '<', tomorrow.toISOString())
      );

      const snapshot = await getDocs(q);
      if (snapshot.size >= 3) {
        alert('Has alcanzado el límite máximo de 3 apuestas por día. ¡Vuelve mañana!');
        setIsSubmitting(false);
        return;
      }

      const bet: Omit<Bet, 'id'> = {
        userId: user.uid,
        selections,
        stake,
        totalOdds: potentialHits, // Points multiplier = number of hits
        status: 'LOCKED',
        createdAt: new Date().toISOString(),
        providerUsed: user.provider
      };

      await addDoc(collection(db, 'bets'), bet);
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(-stake)
      });

      onClear();
      setIsExpanded(false);
      alert('¡Combinada sellada con éxito! Si aciertas todos, ganarás ' + potentialWin + ' puntos.');
    } catch (error) {
      console.error(error);
      alert('Error al sellar la apuesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selections.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-50">
      <motion.div 
        layout
        className="bg-zinc-50 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden transition-colors duration-300"
      >
        {/* Header */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 bg-[#ff6321] flex items-center justify-between text-white"
        >
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5" />
            <span className="font-bold">Combinada ({selections.length})</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold">x{potentialHits}</span>
            {isExpanded ? <ChevronDown /> : <ChevronUp />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {selections.length < 2 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
                    <Trash2 className="w-4 h-4" />
                    Mínimo 2 partidos para una combinada
                  </div>
                )}
                {selections.map(s => (
                  <div key={s.matchId} className="flex items-start justify-between gap-4 p-3 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5 transition-colors duration-300">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">{s.league}</p>
                      <p className="text-sm font-bold truncate text-zinc-900 dark:text-white">{s.homeTeam} vs {s.awayTeam}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-[#ff6321]/20 text-[#ff6321] text-[10px] font-black px-2 py-0.5 rounded">
                          {s.selection}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => onRemove(s.matchId)} className="text-zinc-400 hover:text-red-500 p-1 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-zinc-100 dark:bg-black/40 border-t border-zinc-200 dark:border-white/5 space-y-4 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Puntos a apostar</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(Number(e.target.value))}
                      className="w-24 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1 text-right font-mono font-bold focus:outline-none focus:border-[#ff6321] text-zinc-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-zinc-500">PTS</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-lg font-black">
                  <span className="text-zinc-500 dark:text-zinc-400">GANANCIA</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[#ff6321] font-mono">{(potentialWin || 0).toLocaleString()} PTS</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Si aciertas todos ({potentialHits} aciertos)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={onClear}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-200 dark:bg-white/5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors font-bold text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    LIMPIAR
                  </button>
                  <button 
                    onClick={handleSettle}
                    disabled={isSubmitting || !canSettle}
                    className="py-3 rounded-xl bg-[#ff6321] hover:bg-[#e55a1e] text-white font-bold text-sm shadow-lg shadow-[#ff6321]/20 disabled:opacity-50 disabled:grayscale"
                  >
                    {isSubmitting ? 'SELLANDO...' : 'SELLAR COMBINADA'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
