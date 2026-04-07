import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { UserProfile, Bet, Selection } from '../types';
import { ACHIEVEMENTS } from '../constants';
import * as Icons from 'lucide-react';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ArrowLeft,
  Flame,
  Skull,
  Award,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfileViewProps {
  userId: string;
  onAddToSlip: (selection: Selection) => void;
  setView: (view: string) => void;
}

export default function UserProfileView({ userId, onAddToSlip, setView }: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mostBetTeam: 'N/A',
    teamMostWins: 'N/A',
    teamMostLosses: 'N/A',
    mostBetLeague: 'N/A'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileDoc = await getDoc(doc(db, 'users', userId));
        if (profileDoc.exists()) {
          setProfile({ uid: userId, ...profileDoc.data() } as UserProfile);
        }

        // Fetch Bets
        const betsQuery = query(
          collection(db, 'bets'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const betsSnapshot = await getDocs(betsQuery);
        const allBets = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));

        setActiveBets(allBets.filter(b => b.status === 'LOCKED' || b.status === 'IN_PROGRESS'));
        setBetHistory(allBets.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'LIQUIDATED'));

        // Calculate Advanced Stats
        const teamCounts: Record<string, number> = {};
        const teamWins: Record<string, number> = {};
        const teamLosses: Record<string, number> = {};
        const leagueCounts: Record<string, number> = {};

        allBets.forEach(bet => {
          bet.selections.forEach((sel: Selection) => {
            leagueCounts[sel.league] = (leagueCounts[sel.league] || 0) + 1;
            
            let betTeam = '';
            if (sel.selection === '1') betTeam = sel.homeTeam;
            else if (sel.selection === '2') betTeam = sel.awayTeam;
            else return;

            teamCounts[betTeam] = (teamCounts[betTeam] || 0) + 1;
            if (bet.status === 'WON' || bet.status === 'LIQUIDATED') {
              teamWins[betTeam] = (teamWins[betTeam] || 0) + 1;
            } else if (bet.status === 'LOST') {
              teamLosses[betTeam] = (teamLosses[betTeam] || 0) + 1;
            }
          });
        });

        const getTop = (record: Record<string, number>) => {
          return Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        };

        setStats({
          mostBetTeam: getTop(teamCounts),
          teamMostWins: getTop(teamWins),
          teamMostLosses: getTop(teamLosses),
          mostBetLeague: getTop(leagueCounts)
        });

      } catch (error) {
        console.error('Error fetching user profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleCopyBet = (bet: Bet) => {
    const now = new Date().getTime();
    const validSelections = bet.selections.filter(s => new Date(s.startTime).getTime() > now);
    
    if (validSelections.length === 0) {
      alert('No hay selecciones válidas para copiar (todos los partidos han comenzado).');
      return;
    }

    validSelections.forEach(s => onAddToSlip(s));
    alert(`${validSelections.length} selecciones añadidas a tu boleto.`);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">Cargando Perfil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">Usuario no encontrado.</p>
        <button onClick={() => setView('rankings')} className="mt-4 text-[#ff6321] font-bold flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Volver a Rankings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('rankings')}
          className="p-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl transition-all text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#ff6321] rounded-2xl overflow-hidden flex items-center justify-center font-black text-2xl border-2 border-white/10 shadow-lg shadow-[#ff6321]/20 text-white">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">{profile.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                Nivel {profile.level}
              </span>
              <span className="text-[#ff6321] font-mono font-bold text-sm">
                {profile.points.toLocaleString()} PTS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatItem label="Efectividad" value={`${(profile.stats.accuracy || 0).toFixed(1)}%`} icon={<BarChart3 className="text-[#ff6321]" />} />
        <StatItem label="Aciertos" value={(profile.stats.totalHits || 0).toLocaleString()} icon={<Target className="text-[#ff6321]" />} />
        <StatItem label="Racha Actual" value={`${profile.stats.currentStreak || 0} 🔥`} icon={<Flame className="text-orange-500" />} />
        <StatItem label="Racha Máx" value={(profile.stats.maxStreak || 0).toString()} icon={<Award className="text-yellow-500" />} />
      </div>

      {/* Advanced Stats */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-6 transition-colors duration-300">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff6321]" />
          Análisis Avanzado
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalysisBox label="Equipo más apostado" value={stats.mostBetTeam} icon={<Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />} />
          <AnalysisBox label="Talismán (Victorias)" value={stats.teamMostWins} icon={<Trophy className="w-4 h-4 text-green-600 dark:text-green-500" />} />
          <AnalysisBox label="Maldición (Derrotas)" value={stats.teamMostLosses} icon={<Skull className="w-4 h-4 text-red-600 dark:text-red-500" />} />
          <AnalysisBox label="Liga Favorita" value={stats.mostBetLeague} icon={<Award className="w-4 h-4 text-purple-600 dark:text-purple-500" />} />
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-[#ff6321]" />
          Logros Desbloqueados
        </h3>
        {profile.achievements.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 text-zinc-500">
            Este usuario aún no ha desbloqueado logros.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profile.achievements.map(id => {
              const achievement = ACHIEVEMENTS.find(a => a.id === id);
              if (!achievement) return null;
              const IconComponent = (Icons as any)[achievement.icon] || Icons.Award;
              return (
                <div key={id} className="bg-[#ff6321]/10 border border-[#ff6321]/30 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors" title={achievement.description}>
                  <IconComponent className="w-4 h-4 text-[#ff6321]" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{achievement.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Bets */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ff6321]" />
          Apuestas Activas
        </h3>
        {activeBets.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 text-zinc-500">
            No hay apuestas activas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBets.map(bet => (
              <BetCard key={bet.id} bet={bet} onCopy={() => handleCopyBet(bet)} />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-zinc-500" />
          Historial Reciente
        </h3>
        <div className="space-y-3">
          {betHistory.slice(0, 5).map(bet => (
            <div key={bet.id} className="bg-zinc-50 dark:bg-[#111] p-4 rounded-xl border border-zinc-200 dark:border-white/5 flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center gap-3">
                {bet.status === 'WON' || bet.status === 'LIQUIDATED' ? (
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                ) : (
                  <XCircle className="text-red-500 w-5 h-5" />
                )}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date(bet.createdAt).toLocaleDateString()}
                  </p>
                  <p className="font-bold text-sm">Combinada x{bet.selections.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Cuota</p>
                <p className="font-mono font-bold text-[#ff6321]">@{bet.totalOdds.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 dark:bg-[#111] p-4 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-1 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function AnalysisBox({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-100 dark:bg-white/5 p-4 rounded-xl space-y-2 transition-colors duration-300">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-black text-lg truncate">{value}</p>
    </div>
  );
}

function BetCard({ bet, onCopy }: { bet: Bet, onCopy: () => void }) {
  return (
    <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden flex flex-col transition-colors duration-300">
      <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-100 dark:bg-white/2">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cuota Total</p>
          <p className="font-black text-xl text-[#ff6321]">@{bet.totalOdds.toFixed(2)}</p>
        </div>
        <button 
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#ff6321]/10 hover:bg-[#ff6321] text-[#ff6321] hover:text-white rounded-lg transition-all text-xs font-bold border border-[#ff6321]/20"
        >
          <Copy className="w-3 h-3" />
          COPIAR
        </button>
      </div>
      <div className="p-4 space-y-2 flex-1">
        {bet.selections.map(s => (
          <div key={s.matchId} className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 truncate flex-1">{s.homeTeam} vs {s.awayTeam}</span>
            <span className="bg-zinc-200 dark:bg-white/5 px-1.5 py-0.5 rounded font-black ml-2">{s.selection}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
