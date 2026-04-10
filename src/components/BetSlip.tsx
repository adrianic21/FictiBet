import React, { useState } from 'react';
import { Selection, Bet } from '../types';
import { X, ChevronUp, ChevronDown, Ticket, Trash2, CheckCircle2 } from 'lucide-react';
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
  const [settled, setSettled] = useState(false);

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
        totalOdds: potentialHits,
        status: 'LOCKED',
        createdAt: new Date().toISOString(),
        providerUsed: user.provider
      };

      await addDoc(collection(db, 'bets'), bet);
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(-stake)
      });

      // Show brief success state, then clear
      setSettled(true);
      setTimeout(() => {
        setSettled(false);
        onClear();
        setIsExpanded(false);
      }, 1200);
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
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-zinc-50 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden transition-colors duration-300"
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3.5 bg-[#ff6321] flex items-center justify-between text-white"
        >
          <div className="flex items-center gap-2.5">
            <Ticket className="w-4 h-4" />
            <span className="font-bold text-sm">Combinada ({selections.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm">x{potentialHits}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3.5 space-y-3 max-h-[50vh] overflow-y-auto">
                {selections.length < 2 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                    <Trash2 className="w-3.5 h-3.5" />
                    Mínimo 2 partidos para una combinada
                  </div>
                )}
                {selections.map(s => (
                  <div key={s.matchId} className="flex items-start justify-between gap-3 p-2.5 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5 transition-colors duration-300">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">{s.league}</p>
                      <p className="text-sm font-bold truncate text-zinc-900 dark:text-white">{s.homeTeam} vs {s.awayTeam}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="bg-[#ff6321]/20 text-[#ff6321] text-[10px] font-black px-2 py-0.5 rounded">
                          {s.selection}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => onRemove(s.matchId)} className="text-zinc-400 hover:text-red-500 p-1 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-zinc-100/50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/5 space-y-3 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Puntos a apostar</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-sm focus:outline-none focus:border-[#ff6321] text-zinc-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-zinc-500">PTS</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">GANANCIA</span>
                  <div className="text-right">
                    <span className="text-[#ff6321] font-mono font-black text-lg">{(potentialWin || 0).toLocaleString()} PTS</span>
                    <p className="text-[10px] text-zinc-500 uppercase">Si aciertas todos</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onClear}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-200 dark:bg-white/5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors font-bold text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    LIMPIAR
                  </button>
                  <button
                    onClick={handleSettle}
                    disabled={isSubmitting || !canSettle || settled}
                    className={`py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50 ${
                      settled
                        ? 'bg-green-500 text-white shadow-green-500/20'
                        : 'bg-[#ff6321] hover:bg-[#e55a1e] text-white shadow-[#ff6321]/20 disabled:grayscale'
                    }`}
                  >
                    {settled ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> ¡SELLADA!
                      </span>
                    ) : isSubmitting ? 'SELLANDO...' : 'SELLAR'}
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
