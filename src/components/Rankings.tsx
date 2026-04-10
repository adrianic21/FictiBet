import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where, doc, writeBatch, increment } from 'firebase/firestore';
import { Trophy, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Rankings({ onViewProfile }: { onViewProfile: (uid: string) => void }) {
  const [activeTab, setActiveTab] = useState<'points' | 'hits' | 'accuracy' | 'weekly'>('points');
  const [rankings, setRankings] = useState<any[]>([]);
  const [previousWinner, setPreviousWinner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auto-close week every Monday at 00:00
  const doCloseWeek = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('weeklyPredictions', '>', 0)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as any));

      const batch = writeBatch(db);
      const now = new Date().toISOString();

      if (users.length > 0) {
        const sorted = [...users].sort((a, b) => {
          const accA = (a.weeklyHits || 0) / (a.weeklyPredictions || 1);
          const accB = (b.weeklyHits || 0) / (b.weeklyPredictions || 1);
          if (accB !== accA) return accB - accA;
          return (b.weeklyHits || 0) - (a.weeklyHits || 0);
        });

        const winner = sorted[0];
        batch.update(doc(db, 'users', winner.uid), {
          points: increment(50)
        });

        batch.set(doc(db, 'rankings', 'previous_weekly'), {
          type: 'previous_weekly',
          data: [{
            uid: winner.uid,
            username: winner.username,
            photoURL: winner.photoURL || '',
            points: 50,
            accuracy: ((winner.weeklyHits / winner.weeklyPredictions) * 100).toFixed(1),
            hits: winner.weeklyHits
          }],
          updatedAt: now
        });

        users.forEach(u => {
          batch.update(doc(db, 'users', u.uid), {
            weeklyHits: 0,
            weeklyPredictions: 0
          });
        });

        setPreviousWinner({
          username: winner.username,
          photoURL: winner.photoURL || '',
          points: 50
        });
      } else {
        // No users this week — just update the timestamp to advance the cycle
        batch.set(doc(db, 'rankings', 'previous_weekly'), {
          type: 'previous_weekly',
          data: [],
          updatedAt: now
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error closing week:', error);
    }
  }, []);

  // Check and auto-close on mount
  useEffect(() => {
    const checkAutoClose = async () => {
      try {
        const q = query(collection(db, 'rankings'), where('type', '==', 'previous_weekly'), limit(1));
        const snapshot = await getDocs(q);

        let lastCloseTime: Date;
        if (snapshot.empty) {
          // Never closed — set 8 days ago so next Monday check triggers
          lastCloseTime = new Date();
          lastCloseTime.setDate(lastCloseTime.getDate() - 8);
        } else {
          lastCloseTime = new Date(snapshot.docs[0].data().updatedAt);
        }

        // Calculate next Monday 00:00 after lastCloseTime
        const nextMonday = new Date(lastCloseTime);
        const dayOfWeek = nextMonday.getDay(); // 0=Sun,1=Mon,...6=Sat
        const daysToAdd = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
        nextMonday.setDate(nextMonday.getDate() + daysToAdd);
        nextMonday.setHours(0, 0, 0, 0);

        if (new Date() >= nextMonday) {
          await doCloseWeek();
        }
      } catch (error) {
        console.error('Auto-close check failed:', error);
      }
    };

    checkAutoClose();
  }, [doCloseWeek]);

  // Load previous winner
  useEffect(() => {
    const fetchPreviousWinner = async () => {
      try {
        const q = query(collection(db, 'rankings'), where('type', '==', 'previous_weekly'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          if (data.data && data.data.length > 0) {
            setPreviousWinner(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching previous winner:', error);
      }
    };
    fetchPreviousWinner();
  }, []);

  // Load rankings by tab
  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        let data: any[] = [];

        if (activeTab === 'weekly') {
          const q = query(
            collection(db, 'users'),
            where('weeklyPredictions', '>', 0),
            limit(50)
          );
          const snapshot = await getDocs(q);
          data = snapshot.docs.map(d => {
            const ud = d.data();
            const weeklyHits = ud.weeklyHits || 0;
            const weeklyPredictions = ud.weeklyPredictions || 0;
            const accuracy = weeklyPredictions > 0 ? (weeklyHits / weeklyPredictions) * 100 : 0;
            return {
              uid: d.id,
              username: ud.username,
              photoURL: ud.photoURL || '',
              points: ud.points || 0,
              hits: weeklyHits,
              accuracy: accuracy.toFixed(1),
              level: ud.level || 1,
              weeklyPredictions
            };
          }).sort((a, b) => Number(b.accuracy) - Number(a.accuracy));
        } else {
          const sortField = activeTab === 'points' ? 'points'
            : activeTab === 'hits' ? 'stats.totalWon'
              : 'stats.yield';

          const q = query(
            collection(db, 'users'),
            orderBy(sortField, 'desc'),
            limit(20)
          );
          const snapshot = await getDocs(q);
          data = snapshot.docs.map(d => {
            const ud = d.data();
            return {
              uid: d.id,
              username: ud.username,
              photoURL: ud.photoURL || '',
              points: ud.points || 0,
              hits: ud.stats?.totalWon || 0,
              accuracy: ud.stats?.yield || 0,
              level: ud.level || 1
            };
          });
        }

        setRankings(data);
      } catch (error) {
        console.error('Error fetching rankings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black flex items-center gap-3">
          <Trophy className="text-[#ff6321] w-8 h-8" />
          Salón de la Fama
        </h2>
        <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl transition-colors overflow-x-auto no-scrollbar">
          <TabButton active={activeTab === 'points'} onClick={() => setActiveTab('points')}>Puntos</TabButton>
          <TabButton active={activeTab === 'hits'} onClick={() => setActiveTab('hits')}>Aciertos</TabButton>
          <TabButton active={activeTab === 'accuracy'} onClick={() => setActiveTab('accuracy')}>Efectividad</TabButton>
          <TabButton active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')}>Semanal</TabButton>
        </div>
      </div>

      {/* Previous Week Winner */}
      {previousWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-gradient-to-r from-amber-500/20 to-[#ff6321]/20 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Trophy className="w-28 h-28" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-[0.2em]">
              <Star className="w-3 h-3 fill-amber-500" />
              Ganador Semana Pasada
              <Star className="w-3 h-3 fill-amber-500" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl overflow-hidden border-2 border-amber-500/30 flex items-center justify-center font-black text-xl text-amber-500">
                {previousWinner.photoURL ? (
                  <img src={previousWinner.photoURL} alt={previousWinner.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  previousWinner.username[0].toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-3xl font-black">{previousWinner.username}</h3>
                <span className="text-amber-500 font-mono font-bold text-sm">
                  +{previousWinner.points} pts
                </span>
              </div>
            </div>
          </div>
          <div className="bg-amber-500 text-black p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 relative z-10">
            <Trophy className="w-7 h-7" />
          </div>
        </motion.div>
      )}

      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
        <div className="grid grid-cols-12 p-3.5 border-b border-zinc-200 dark:border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-white/2">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Usuario</div>
          <div className="col-span-2 text-center">Nivel</div>
          <div className="col-span-2 text-right">Efectividad</div>
          <div className="col-span-3 text-right">
            {activeTab === 'points' ? 'Puntos' : activeTab === 'hits' ? 'Aciertos' : 'Efectividad'}
          </div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-white/5">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-widest">Cargando...</p>
            </div>
          ) : rankings.length > 0 ? (
            rankings.map((u, index) => (
              <motion.div
                key={u.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                onClick={() => onViewProfile(u.uid)}
                className="grid grid-cols-12 p-3.5 items-center hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="col-span-1 font-mono font-bold text-[#ff6321] text-sm">
                  {index + 1}
                </div>
                <div className="col-span-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold border border-zinc-300 dark:border-white/10 shrink-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      u.username[0]
                    )}
                  </div>
                  <span className="font-bold text-sm truncate">{u.username}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="bg-zinc-200 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-bold">Lvl {u.level}</span>
                </div>
                <div className="col-span-2 text-right font-mono text-sm">
                  <span className={Number(u.accuracy) >= 70 ? 'text-green-600 dark:text-green-500' : 'text-zinc-500 dark:text-zinc-400'}>
                    {u.accuracy}%
                  </span>
                </div>
                <div className="col-span-3 text-right font-mono font-bold text-[#ff6321] text-sm">
                  {activeTab === 'points' ? (u.points || 0).toLocaleString()
                    : activeTab === 'hits' ? u.hits
                      : `${u.accuracy}%`}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-800" />
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-widest">Sin datos aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${active
        ? 'bg-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20'
        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
        }`}
    >
      {children}
    </button>
  );
}
