import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, increment, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Bet } from '../types';
import { Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MyBets() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bets'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
    });
  }, [user]);

  const canCancelBet = (bet: Bet) => {
    if (bet.status !== 'LOCKED') return false;
    const now = new Date().getTime();
    // A bet can only be canceled if ALL matches in it haven't started yet.
    // If at least one match has started (startTime <= now), it cannot be canceled.
    return bet.selections.every(s => {
      const startTime = new Date(s.startTime).getTime();
      return startTime > now;
    });
  };

  const handleCancelBet = async (bet: Bet) => {
    if (!user || !bet.id) return;
    
    setIsDeleting(bet.id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'bets', bet.id));
      batch.update(doc(db, 'users', user.uid), {
        points: increment(bet.stake)
      });
      await batch.commit();
      setConfirmCancel(null);
    } catch (error) {
      console.error('Error canceling bet:', error);
      // Ideally we'd have a toast system
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black">Mis Apuestas</h2>
      
      <div className="space-y-4">
        {bets.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 transition-colors duration-300">
            No tienes apuestas registradas.
          </div>
        ) : (
          bets.map((bet, index) => (
            <motion.div 
              key={bet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/2">
                <div className="flex items-center gap-3">
                  <StatusIcon status={bet.status} />
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      {new Date(bet.createdAt).toLocaleDateString()} — {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="font-bold text-sm">Combinada de {bet.selections.length} partidos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {canCancelBet(bet) && (
                    <div className="flex items-center gap-2">
                      {confirmCancel === bet.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-lg border border-red-500/20">
                          <button 
                            onClick={() => handleCancelBet(bet)}
                            disabled={isDeleting === bet.id}
                            className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-600 transition-colors"
                          >
                            {isDeleting === bet.id ? '...' : 'CONFIRMAR'}
                          </button>
                          <button 
                            onClick={() => setConfirmCancel(null)}
                            className="px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white text-[10px] font-bold rounded hover:bg-zinc-300 dark:hover:bg-white/20 transition-colors"
                          >
                            NO
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmCancel(bet.id!)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Cancelar apuesta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Aciertos</p>
                    <p className="font-mono font-bold text-[#ff6321]">+{bet.selections.length} pts</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {bet.selections.map(s => (
                  <div key={s.matchId} className="flex items-center justify-between text-sm">
                    <div className="flex-1 truncate">
                      <span className="text-zinc-500 dark:text-zinc-400 mr-2">{s.homeTeam} vs {s.awayTeam}</span>
                      <span className="bg-zinc-200 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-black">{s.selection}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono">
                      {new Date(s.startTime).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-zinc-100/50 dark:bg-black/20 flex items-center justify-between border-t border-zinc-200 dark:border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Estado</p>
                  <p className="font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                    {bet.status === 'LOCKED' ? 'PENDIENTE' : bet.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Premio</p>
                  <p className={`font-black text-lg ${(bet.status === 'WON' || bet.status === 'LIQUIDATED') ? 'text-green-600 dark:text-green-500' : 'text-[#ff6321]'}`}>
                    {((bet.stake || 0) * (bet.totalOdds || 0)).toLocaleString()} PTS
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'WON': return <CheckCircle2 className="text-green-500 w-6 h-6" />;
    case 'LOST': return <XCircle className="text-red-500 w-6 h-6" />;
    case 'LOCKED': return <Clock className="text-blue-500 w-6 h-6" />;
    case 'IN_PROGRESS': return <RefreshCw className="text-yellow-500 w-6 h-6 animate-spin-slow" />;
    case 'PENDING_API_RETRY': return <AlertTriangle className="text-orange-500 w-6 h-6" />;
    default: return <Clock className="text-zinc-500 w-6 h-6" />;
  }
}
