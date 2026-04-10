import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Bet, Selection } from '../types';
import { ACHIEVEMENTS } from '../constants';
import * as Icons from 'lucide-react';
import {
  Settings,
  Key,
  CheckCircle2,
  BarChart3,
  Target,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  AlertTriangle,
  Trash2,
  Trophy,
  Skull,
  Flame,
  Clock,
  History as HistoryIcon,
  Award,
  XCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile({ setView }: { setView: (v: string) => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [analyticalStats, setAnalyticalStats] = useState({
    mostBetTeam: 'N/A',
    teamMostWins: 'N/A',
    teamMostLosses: 'N/A'
  });

  useEffect(() => {
    const fetchAnalyticalStats = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'bets'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const bets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet));

        setActiveBets(bets.filter(b => b.status === 'LOCKED' || b.status === 'IN_PROGRESS'));
        setBetHistory(bets.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'LIQUIDATED'));

        const teamCounts: Record<string, number> = {};
        const teamWins: Record<string, number> = {};
        const teamLosses: Record<string, number> = {};

        bets.forEach(bet => {
          bet.selections.forEach((sel: any) => {
            let betTeam = '';
            if (sel.selection === '1') betTeam = sel.homeTeam;
            else if (sel.selection === '2') betTeam = sel.awayTeam;
            else return;

            teamCounts[betTeam] = (teamCounts[betTeam] || 0) + 1;
            if (bet.status === 'WON') {
              teamWins[betTeam] = (teamWins[betTeam] || 0) + 1;
            } else if (bet.status === 'LOST') {
              teamLosses[betTeam] = (teamLosses[betTeam] || 0) + 1;
            }
          });
        });

        const getTop = (record: Record<string, number>) =>
          Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        setAnalyticalStats({
          mostBetTeam: getTop(teamCounts),
          teamMostWins: getTop(teamWins),
          teamMostLosses: getTop(teamLosses)
        });
      } catch (error) {
        console.error('Error calculating analytical stats:', error);
      }
    };

    fetchAnalyticalStats();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!username.trim()) {
      alert('El nombre de usuario no puede estar vacío');
      return;
    }
    setIsSavingProfile(true);
    try {
      if (username !== user.username) {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert('Este nombre de usuario ya está en uso');
          setIsSavingProfile(false);
          return;
        }
      }
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        photoURL: photoURL.trim()
      });
      alert('Perfil actualizado con éxito');
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveApi = async () => {
    if (!user) return;
    if (!apiKey.trim()) {
      alert('Introduce tu API Key');
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        provider: 'API-Football',
        apiKey: apiKey.trim()
      });
      alert('API Key guardada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAccount = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const betsSnapshot = await getDocs(betsQuery);
      const batch = writeBatch(db);
      betsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      batch.update(doc(db, 'users', user.uid), {
        points: 500,
        level: 1,
        stats: {
          totalBets: 0, wonBets: 0, totalPredictions: 0, totalHits: 0,
          accuracy: 0, avgParlaySize: 0, maxWin: 0, currentStreak: 0,
          maxStreak: 0, favoriteLeague: '', talismanLeague: ''
        },
        achievements: [],
        weeklyPoints: 0,
        weeklyHits: 0,
        weeklyPredictions: 0
      });
      await batch.commit();
      setShowResetConfirm(false);
      alert('Cuenta reseteada con éxito. ¡Empieza de nuevo!');
    } catch (error) {
      console.error('Error resetting account:', error);
      alert('Error al resetear la cuenta');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    setIsDeletingAccount(true);
    try {
      const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const betsSnapshot = await getDocs(betsQuery);
      const batch = writeBatch(db);
      betsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', user.uid));
      await batch.commit();
      await deleteUser(auth.currentUser);
    } catch (error: any) {
      console.error('Error al eliminar la cuenta:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Por seguridad, cierra sesión e inicia de nuevo antes de eliminar tu cuenta.');
      } else {
        alert(`Error: ${error.message || 'Error desconocido'}`);
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Editing */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-6 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden border-2 border-[#ff6321]/30 shrink-0">
            {photoURL ? (
              <img src={photoURL} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-400 dark:text-zinc-700">
                {username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">Editar Perfil</h3>
            <p className="text-sm text-zinc-500">Personaliza tu identidad en FictiBET</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre de Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario..."
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#ff6321] dark:text-white transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase">URL de Foto de Perfil</label>
            <input
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#ff6321] dark:text-white transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="px-8 py-2.5 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white font-bold rounded-xl transition-all disabled:opacity-50 border border-zinc-200 dark:border-white/10 text-sm"
        >
          {isSavingProfile ? 'ACTUALIZANDO...' : 'ACTUALIZAR PERFIL'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Efectividad" value={`${(user.stats.accuracy || 0).toFixed(1)}%`} icon={<BarChart3 className="text-[#ff6321] w-5 h-5" />} trend={(user.stats.accuracy || 0) >= 70 ? 'up' : 'down'} />
        <StatCard label="Aciertos" value={(user.stats.totalHits || 0).toLocaleString()} icon={<Target className="text-[#ff6321] w-5 h-5" />} />
        <StatCard label="Nivel" value={user.level.toString()} icon={<CheckCircle2 className="text-[#ff6321] w-5 h-5" />} subtext={`Siguiente: ${user.level * 50} aciertos`} />
        <StatCard label="Ef. Semanal" value={`${(user.weeklyPredictions > 0 ? (user.weeklyHits / user.weeklyPredictions) * 100 : 0).toFixed(1)}%`} icon={<Trophy className="text-[#ff6321] w-5 h-5" />} subtext={`${user.weeklyHits}/${user.weeklyPredictions} pred.`} />
      </div>

      {/* Advanced Stats */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-4 transition-colors duration-300">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff6321]" />
          Análisis de Rendimiento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AnalysisItem label="Combinadas Ganadas" value={(user.stats.wonBets || 0).toString()} />
          <AnalysisItem label="Racha Actual" value={`${user.stats.currentStreak || 0} 🔥`} color="text-orange-500" />
          <AnalysisItem label="Racha Máxima" value={(user.stats.maxStreak || 0).toString()} color="text-yellow-500" />
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-100 dark:bg-white/5 p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Más apostado</span>
            </div>
            <p className="font-black truncate">{analyticalStats.mostBetTeam}</p>
          </div>
          <div className="bg-green-500/5 p-3.5 rounded-xl border border-green-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Talismán</span>
            </div>
            <p className="font-black truncate text-green-600 dark:text-green-500">{analyticalStats.teamMostWins}</p>
          </div>
          <div className="bg-red-500/5 p-3.5 rounded-xl border border-red-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500">
              <Skull className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Maldición</span>
            </div>
            <p className="font-black truncate text-red-600 dark:text-red-500">{analyticalStats.teamMostLosses}</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-[#ff6321]" />
          Mis Logros
        </h3>
        {user.achievements.length === 0 ? (
          <div className="p-6 text-center bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 text-zinc-500 text-sm">
            Aún no has desbloqueado logros. ¡Sigue apostando!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.achievements.map(id => {
              const achievement = ACHIEVEMENTS.find(a => a.id === id);
              if (!achievement) return null;
              const IconComponent = (Icons as any)[achievement.icon] || Icons.Award;
              return (
                <div key={id} className="bg-[#ff6321]/10 border border-[#ff6321]/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5" title={achievement.description}>
                  <IconComponent className="w-3.5 h-3.5 text-[#ff6321]" />
                  <span className="text-xs font-bold">{achievement.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Bets */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ff6321]" />
          Mis Apuestas Activas
        </h3>
        {activeBets.length === 0 ? (
          <div className="p-6 text-center bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 text-zinc-500 text-sm">
            No tienes apuestas activas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeBets.map(bet => (
              <div key={bet.id} className="bg-zinc-50 dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
                <div className="p-3 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-100 dark:bg-white/2">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Aciertos posibles</p>
                    <p className="font-black text-lg text-[#ff6321]">x{bet.totalOdds}</p>
                  </div>
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase">{bet.status === 'LOCKED' ? 'PENDIENTE' : bet.status}</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {bet.selections.map(s => (
                    <div key={s.matchId} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400 truncate flex-1">{s.homeTeam} vs {s.awayTeam}</span>
                      <span className="bg-zinc-200 dark:bg-white/5 px-1.5 py-0.5 rounded font-black ml-2">{s.selection}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-zinc-500" />
          Historial de Apuestas
        </h3>
        <div className="space-y-2">
          {betHistory.slice(0, 5).map(bet => (
            <div key={bet.id} className="bg-zinc-50 dark:bg-[#111] p-3.5 rounded-xl border border-zinc-200 dark:border-white/5 flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center gap-3">
                {bet.status === 'WON' || bet.status === 'LIQUIDATED' ? (
                  <CheckCircle2 className="text-green-500 w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="text-red-500 w-4 h-4 shrink-0" />
                )}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">{new Date(bet.createdAt).toLocaleDateString()}</p>
                  <p className="font-bold text-sm">Combinada x{bet.selections.length}</p>
                </div>
              </div>
              <p className={`font-mono font-bold text-sm ${bet.status === 'WON' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {bet.status === 'WON' ? `+${((bet.stake || 0) * (bet.totalOdds || 0)).toLocaleString()}` : `-${bet.stake}`} PTS
              </p>
            </div>
          ))}
          {betHistory.length > 5 && (
            <button onClick={() => setView('bets')} className="w-full py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              VER TODO EL HISTORIAL →
            </button>
          )}
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-5 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#ff6321]" />
            <h3 className="text-lg font-bold">Configuración de API-Football</h3>
          </div>
          <button onClick={() => setView('help')} className="text-xs font-bold text-[#ff6321] hover:underline flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Ayuda
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-500/8 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Info className="w-4 h-4 shrink-0" />
            <h4 className="font-bold text-sm">Cómo obtener tu API Key gratuita</h4>
          </div>
          <ol className="space-y-1.5 text-sm text-blue-700 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">1.</span>
              <span>Visita <a href="https://www.api-football.com" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2 inline-flex items-center gap-1">api-football.com <ExternalLink className="w-3 h-3" /></a> y crea una cuenta gratuita</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">2.</span>
              <span>En tu panel de control, accede a la sección <strong>API Key</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">3.</span>
              <span>Copia la clave y pégala en el campo de abajo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">4.</span>
              <span>Pulsa <strong>GUARDAR</strong> y ¡listo! El plan gratuito incluye 100 peticiones/día</span>
            </li>
          </ol>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Tu API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pega aquí tu API Key..."
            className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#ff6321] dark:text-white transition-colors"
          />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Tu clave se guarda de forma segura y solo se usa desde tu navegador. FictiBET no accede a tus credenciales.
          </p>
        </div>

        <button
          onClick={handleSaveApi}
          disabled={isSaving}
          className="px-8 py-2.5 bg-[#ff6321] hover:bg-[#e55a1e] text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
        >
          {isSaving ? 'GUARDANDO...' : 'GUARDAR API KEY'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold text-red-500">Zona de Peligro</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Acción irreversible. Se eliminarán todas tus apuestas, estadísticas y logros, y se reseteará tu cuenta al estado inicial.
        </p>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all border border-red-500/20 flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            RESETEAR CUENTA
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="text-sm font-bold text-red-500 flex-1">¿Estás seguro? No podrás recuperar tus datos.</p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 font-bold rounded-lg transition-all text-sm">
                CANCELAR
              </button>
              <button onClick={handleResetAccount} disabled={isResetting} className="flex-1 sm:flex-none px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 text-sm">
                {isResetting ? 'RESETEANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-red-500/10">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              ELIMINAR MI CUENTA POR COMPLETO
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-red-600/10 rounded-xl border border-red-600/20">
              <p className="text-sm font-bold text-red-600 flex-1">¡Esta acción eliminará permanentemente tu cuenta y todos tus datos!</p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 font-bold rounded-lg transition-all text-sm">
                  CANCELAR
                </button>
                <button onClick={handleDeleteAccount} disabled={isDeletingAccount} className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 text-sm">
                  {isDeletingAccount ? 'ELIMINANDO...' : 'ELIMINAR TODO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, subtext }: {
  label: string,
  value: string,
  icon: React.ReactNode,
  trend?: 'up' | 'down',
  subtext?: string
}) {
  return (
    <div className="bg-zinc-50 dark:bg-[#111] p-4 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-1.5 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black">{value}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </div>
      {subtext && <p className="text-[10px] text-zinc-500 dark:text-zinc-600 font-bold uppercase">{subtext}</p>}
    </div>
  );
}

function AnalysisItem({ label, value, color = "text-zinc-900 dark:text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className={`font-bold truncate ${color}`}>{value}</p>
    </div>
  );
}
