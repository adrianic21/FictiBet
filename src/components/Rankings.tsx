import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where, doc, writeBatch, increment } from 'firebase/firestore';
import { Trophy, Medal, Star, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Rankings({ onViewProfile }: { onViewProfile: (uid: string) => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'points' | 'hits' | 'accuracy' | 'weekly'>('points');
  const [rankings, setRankings] = useState<any[]>([]);
  const [previousWinner, setPreviousWinner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviousWinner = async () => {
      try {
        const q = query(collection(db, 'rankings'), where('type', '==', 'previous_weekly'), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
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

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        
        if (activeTab === 'weekly') {
          // Weekly ranking is special: sort by (weeklyHits / weeklyPredictions)
          const q = query(
            collection(db, 'users'),
            where('weeklyPredictions', '>', 0),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          data = querySnapshot.docs.map(doc => {
            const userData = doc.data();
            const weeklyHits = userData.weeklyHits || 0;
            const weeklyPredictions = userData.weeklyPredictions || 0;
            const accuracy = weeklyPredictions > 0 ? (weeklyHits / weeklyPredictions) * 100 : 0;
            return {
              uid: doc.id,
              username: userData.username,
              photoURL: userData.photoURL || '',
              points: userData.points || 0,
              hits: weeklyHits,
              accuracy: accuracy.toFixed(1),
              level: userData.level || 1,
              weeklyPredictions
            };
          }).sort((a, b) => Number(b.accuracy) - Number(a.accuracy));
        } else {
          // Map tab to field
          const sortField = activeTab === 'points' ? 'points' : activeTab === 'hits' ? 'stats.totalWon' : 'stats.yield';
          
          const q = query(
            collection(db, 'users'), 
            orderBy(sortField, 'desc'),
            limit(20)
          );
          
          const querySnapshot = await getDocs(q);
          data = querySnapshot.docs.map(doc => {
            const userData = doc.data();
            return {
              uid: doc.id,
              username: userData.username,
              photoURL: userData.photoURL || '',
              points: userData.points || 0,
              hits: userData.stats?.totalWon || 0,
              accuracy: userData.stats?.yield || 0,
              level: userData.level || 1
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

  const handleCloseWeek = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar la semana? Esto otorgará 50 puntos al ganador y reseteará las estadísticas semanales de todos los usuarios.')) return;
    
    setLoading(true);
    try {
      // 1. Find the winner
      const q = query(
        collection(db, 'users'),
        where('weeklyPredictions', '>', 0)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as any));

      if (users.length === 0) {
        alert('No hay usuarios con predicciones esta semana.');
        setLoading(false);
        return;
      }

      const sortedUsers = users.sort((a, b) => {
        const accA = (a.weeklyHits || 0) / (a.weeklyPredictions || 1);
        const accB = (b.weeklyHits || 0) / (b.weeklyPredictions || 1);
        if (accB !== accA) return accB - accA;
        return (b.weeklyHits || 0) - (a.weeklyHits || 0); // Tie-breaker: total hits
      });

      const winner = sortedUsers[0];
      const batch = writeBatch(db);

      // 2. Award 50 points to winner
      const winnerRef = doc(db, 'users', winner.uid);
      batch.update(winnerRef, {
        points: increment(50)
      });

      // 3. Save as previous winner
      const rankingRef = doc(collection(db, 'rankings'), 'previous_weekly');
      batch.set(rankingRef, {
        type: 'previous_weekly',
        data: [{
          uid: winner.uid,
          username: winner.username,
          photoURL: winner.photoURL || '',
          points: 50, // The bonus points
          accuracy: ((winner.weeklyHits / winner.weeklyPredictions) * 100).toFixed(1),
          hits: winner.weeklyHits
        }],
        updatedAt: new Date().toISOString()
      });

      // 4. Reset all users' weekly stats
      // Note: In a real app, this would be a Cloud Function. 
      // Here we reset the users we found in the query.
      users.forEach(u => {
        const uRef = doc(db, 'users', u.uid);
        batch.update(uRef, {
          weeklyHits: 0,
          weeklyPredictions: 0
        });
      });

      await batch.commit();
      setPreviousWinner({
        username: winner.username,
        photoURL: winner.photoURL,
        points: 50
      });
      alert(`¡Semana cerrada! El ganador es ${winner.username} (+50 pts).`);
      setActiveTab('points'); // Refresh
    } catch (error) {
      console.error('Error closing week:', error);
      alert('Error al cerrar la semana.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Trophy className="text-[#ff6321] w-8 h-8" />
            Salón de la Fama
          </h2>
          {user?.email === 'adrianic1993@gmail.com' && (
            <button 
              onClick={handleCloseWeek}
              className="px-3 py-1 bg-zinc-100 dark:bg-white/5 hover:bg-[#ff6321] hover:text-white text-zinc-500 text-[10px] font-bold rounded-lg transition-all border border-zinc-200 dark:border-white/5 uppercase tracking-widest"
            >
              Cerrar Semana (Admin)
            </button>
          )}
        </div>
        <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl transition-colors overflow-x-auto no-scrollbar">
          <TabButton active={activeTab === 'points'} onClick={() => setActiveTab('points')}>Puntos</TabButton>
          <TabButton active={activeTab === 'hits'} onClick={() => setActiveTab('hits')}>Aciertos</TabButton>
          <TabButton active={activeTab === 'accuracy'} onClick={() => setActiveTab('accuracy')}>Efectividad</TabButton>
          <TabButton active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')}>Semanal</TabButton>
        </div>
      </div>

      {/* Previous Week Winner Section */}
      {previousWinner && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/20 to-[#ff6321]/20 border border-amber-500/30 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Trophy className="w-32 h-32" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-[0.2em]">
              <Star className="w-3 h-3 fill-amber-500" />
              Ganador Semana Pasada
              <Star className="w-3 h-3 fill-amber-500" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl overflow-hidden border-2 border-amber-500/30 flex items-center justify-center font-black text-2xl text-amber-500">
                {previousWinner.photoURL ? (
                  <img src={previousWinner.photoURL} alt={previousWinner.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  previousWinner.username[0].toUpperCase()
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-4xl font-black text-white">{previousWinner.username}</h3>
                <span className="text-amber-500 font-mono font-bold">
                  {previousWinner.points.toLocaleString()} pts
                </span>
              </div>
            </div>
          </div>
          <div className="bg-amber-500 text-black p-4 rounded-2xl shadow-xl shadow-amber-500/20 relative z-10">
            <Trophy className="w-8 h-8" />
          </div>
        </motion.div>
      )}

      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
        <div className="grid grid-cols-12 p-4 border-b border-zinc-200 dark:border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-white/2">
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
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-widest">Cargando Ranking...</p>
            </div>
          ) : rankings.length > 0 ? (
            rankings.map((user, index) => (
              <motion.div 
                key={user.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onViewProfile(user.uid)}
                className="grid grid-cols-12 p-4 items-center hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="col-span-1 font-mono font-bold text-[#ff6321]">
                  {index + 1}
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold border border-zinc-300 dark:border-white/10">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user.username[0]
                    )}
                  </div>
                  <span className="font-bold truncate">{user.username}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="bg-zinc-200 dark:bg-white/5 px-2 py-1 rounded text-[10px] font-bold">Lvl {user.level}</span>
                </div>
                <div className="col-span-2 text-right font-mono text-sm">
                  <span className={user.accuracy >= 70 ? 'text-green-600 dark:text-green-500' : 'text-zinc-500 dark:text-zinc-400'}>
                    {user.accuracy}%
                  </span>
                </div>
                <div className="col-span-3 text-right font-mono font-bold text-[#ff6321]">
                  {activeTab === 'points' ? (user.points || 0).toLocaleString() : activeTab === 'hits' ? user.hits : `${user.accuracy}%`}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-800" />
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-widest">No hay usuarios en el ranking todavía</p>
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
      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
        active ? 'bg-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
