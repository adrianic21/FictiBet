import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { PROVIDERS } from '../services/api';
import { Bet, Selection } from '../types';
import { ACHIEVEMENTS } from '../constants';
import * as Icons from 'lucide-react';
import { 
  Settings, 
  Key, 
  Database, 
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
  Copy,
  Award,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile({ setView }: { setView: (v: string) => void }) {
  const { user, logout } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [provider, setProvider] = useState(user?.provider || '');
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
        const bets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));

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
            else return; // Skip draws for team-specific stats

            teamCounts[betTeam] = (teamCounts[betTeam] || 0) + 1;
            if (bet.status === 'WON') {
              teamWins[betTeam] = (teamWins[betTeam] || 0) + 1;
            } else if (bet.status === 'LOST') {
              teamLosses[betTeam] = (teamLosses[betTeam] || 0) + 1;
            }
          });
        });

        const getTop = (record: Record<string, number>) => {
          return Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        };

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
      // Check if username is taken by another user
      if (username !== user.username) {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert('Este nombre de usuario ya está en uso por otro jugador');
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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        provider,
        apiKey
      });
      alert('Configuración guardada');
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
      // 1. Delete all bets
      const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const betsSnapshot = await getDocs(betsQuery);
      
      const batch = writeBatch(db);
      betsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 2. Reset user profile
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        points: 500,
        level: 1,
        stats: {
          totalBets: 0,
          wonBets: 0,
          totalPredictions: 0,
          totalHits: 0,
          accuracy: 0,
          avgParlaySize: 0,
          maxWin: 0,
          currentStreak: 0,
          maxStreak: 0,
          favoriteLeague: '',
          talismanLeague: ''
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
    console.log('Iniciando eliminación de cuenta...');
    if (!user) {
      console.log('No hay usuario autenticado o perfil cargado.');
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      // 1. Delete all bets
      console.log('Buscando apuestas para eliminar...');
      const betsQuery = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const betsSnapshot = await getDocs(betsQuery);
      const batch = writeBatch(db);
      
      console.log(`Eliminando ${betsSnapshot.docs.length} apuestas...`);
      betsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 2. Delete user document
      console.log('Eliminando documento de usuario de Firestore...');
      batch.delete(doc(db, 'users', user.uid));
      await batch.commit();
      console.log('Firestore limpiado correctamente.');

      // 3. Logout and clear local storage
      await logout();
      
      alert('Cuenta eliminada permanentemente. ¡Gracias por jugar!');
    } catch (error: any) {
      console.error('Error al eliminar la cuenta:', error);
      alert(`Error al eliminar la cuenta: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  const handleCopyBet = (bet: Bet) => {
    const now = new Date().getTime();
    const validSelections = bet.selections.filter(s => new Date(s.startTime).getTime() > now);
    
    if (validSelections.length === 0) {
      alert('No hay selecciones válidas para copiar (todos los partidos han comenzado).');
      return;
    }

    // This is a bit tricky because we don't have onAddToSlip here.
    // We could pass it as a prop or use a custom event.
    // For now, let's just alert that they should go to the matches view.
    // Actually, I'll add onAddToSlip to Profile props in App.tsx.
    alert('Funcionalidad de copia disponible en perfiles públicos. Para repetir una apuesta propia, selecciona los partidos en la cartelera.');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Editing */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-6 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-20 h-20 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden border-2 border-[#ff6321]/30">
              {photoURL ? (
                <img src={photoURL} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-400 dark:text-zinc-700">
                  {username[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold">Editar Perfil</h3>
            <p className="text-sm text-zinc-500">Personaliza tu identidad en FictiBET</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase">Nombre de Usuario</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario..."
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#ff6321] dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase">URL de Foto de Perfil</label>
            <input 
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#ff6321] dark:text-white"
            />
          </div>
        </div>

        <button 
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="w-full md:w-auto px-8 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white font-bold rounded-xl transition-all disabled:opacity-50 border border-zinc-200 dark:border-white/10"
        >
          {isSavingProfile ? 'ACTUALIZANDO...' : 'ACTUALIZAR PERFIL'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Efectividad" 
          value={`${(user.stats.accuracy || 0).toFixed(1)}%`} 
          icon={<BarChart3 className="text-[#ff6321]" />}
          trend={(user.stats.accuracy || 0) >= 70 ? 'up' : 'down'}
        />
        <StatCard 
          label="Aciertos Totales" 
          value={(user.stats.totalHits || 0).toLocaleString()} 
          icon={<Target className="text-[#ff6321]" />}
        />
        <StatCard 
          label="Nivel" 
          value={user.level.toString()} 
          icon={<CheckCircle2 className="text-[#ff6321]" />}
          subtext={`Siguiente nivel: ${user.level * 50} aciertos`}
        />
        <StatCard 
          label="Efectividad Semanal" 
          value={`${(user.weeklyPredictions > 0 ? (user.weeklyHits / user.weeklyPredictions) * 100 : 0).toFixed(1)}%`} 
          icon={<Trophy className="text-[#ff6321]" />}
          subtext={`${user.weeklyHits} aciertos de ${user.weeklyPredictions} predicciones`}
        />
      </div>

      {/* Advanced Stats */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-6 transition-colors duration-300">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff6321]" />
          Análisis de Rendimiento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalysisItem label="Combinadas Ganadas" value={(user.stats.wonBets || 0).toString()} />
          <AnalysisItem label="Racha Actual" value={`${user.stats.currentStreak || 0} 🔥`} color="text-orange-500" />
          <AnalysisItem label="Racha Máxima" value={(user.stats.maxStreak || 0).toString()} color="text-yellow-500" />
          <AnalysisItem label="Liga con más Aciertos" value={user.stats.talismanLeague || 'N/A'} />
        </div>
        
        <div className="pt-6 border-t border-zinc-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-100 dark:bg-white/5 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Flame className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Equipo más apostado</span>
            </div>
            <p className="font-black text-lg truncate">{analyticalStats.mostBetTeam}</p>
          </div>
          <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/10 space-y-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Talismán (Más victorias)</span>
            </div>
            <p className="font-black text-lg truncate text-green-600 dark:text-green-500">{analyticalStats.teamMostWins}</p>
          </div>
          <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
              <Skull className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Maldición (Más derrotas)</span>
            </div>
            <p className="font-black text-lg truncate text-red-600 dark:text-red-500">{analyticalStats.teamMostLosses}</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-[#ff6321]" />
          Mis Logros
        </h3>
        {user.achievements.length === 0 ? (
          <div className="p-8 text-center bg-[#111] rounded-2xl border border-white/5 text-zinc-500">
            Aún no has desbloqueado logros. ¡Sigue apostando!
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {user.achievements.map(id => {
              const achievement = ACHIEVEMENTS.find(a => a.id === id);
              if (!achievement) return null;
              const IconComponent = (Icons as any)[achievement.icon] || Icons.Award;
              return (
                <div key={id} className="bg-[#ff6321]/10 border border-[#ff6321]/30 px-3 py-2 rounded-xl flex items-center gap-2" title={achievement.description}>
                  <IconComponent className="w-4 h-4 text-[#ff6321]" />
                  <span className="text-xs font-bold">{achievement.name}</span>
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
          Mis Apuestas Activas
        </h3>
        {activeBets.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 text-zinc-500">
            No tienes apuestas activas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBets.map(bet => (
              <div key={bet.id} className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-100 dark:bg-white/2">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cuota Total</p>
                    <p className="font-black text-xl text-[#ff6321]">@{bet.totalOdds.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estado</p>
                    <p className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase">{bet.status === 'LOCKED' ? 'PENDIENTE' : bet.status}</p>
                  </div>
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
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-zinc-500" />
          Historial de Apuestas
        </h3>
        <div className="space-y-3">
          {betHistory.slice(0, 5).map(bet => (
            <div key={bet.id} className="bg-zinc-50 dark:bg-[#111] p-4 rounded-xl border border-zinc-200 dark:border-white/5 flex items-center justify-between">
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
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Resultado</p>
                <p className={`font-mono font-bold ${bet.status === 'WON' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                  {bet.status === 'WON' ? `+${((bet.stake || 0) * (bet.totalOdds || 0)).toLocaleString()} PTS` : `-${bet.stake} PTS`}
                </p>
              </div>
            </div>
          ))}
          {betHistory.length > 5 && (
            <button 
              onClick={() => setView('bets')}
              className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              VER TODO EL HISTORIAL
            </button>
          )}
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-6 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#ff6321]" />
            <h3 className="text-xl font-bold">Configuración de Datos</h3>
          </div>
          <button 
            onClick={() => setView('help')}
            className="text-xs font-bold text-[#ff6321] hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            ¿Cómo configurar?
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2">
              <Database className="w-4 h-4" />
              Proveedor de Datos
            </label>
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#ff6321] appearance-none dark:text-white"
            >
              <option value="">Seleccionar proveedor...</option>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key Personal
            </label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Introduce tu API Key..."
              className="w-full bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#ff6321] dark:text-white"
            />
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-600 dark:text-blue-400">
          <strong>Nota:</strong> FictiBET no proporciona datos globales. Cada usuario utiliza su propia conexión para garantizar la transparencia y el control de costes.
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-8 py-3 bg-[#ff6321] hover:bg-[#e55a1e] text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {isSaving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-xl font-bold text-red-500">Zona de Peligro</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Esta acción es irreversible. Se eliminarán todas tus apuestas, estadísticas, logros y se resetearán tus puntos y nivel al estado inicial.
          </p>
          
          {!showResetConfirm ? (
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all border border-red-500/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              RESETEAR CUENTA
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <p className="text-sm font-bold text-red-500 flex-1">¿Estás seguro? No podrás recuperar tus datos.</p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleResetAccount}
                  disabled={isResetting}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isResetting ? 'RESETEANDO...' : 'SÍ, RESETEAR TODO'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-red-500/10">
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                ELIMINAR MI CUENTA POR COMPLETO
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-red-600/10 rounded-xl border border-red-600/20">
                <p className="text-sm font-bold text-red-600 flex-1">¡CUIDADO! Esta acción eliminará permanentemente tu cuenta y todos tus datos de acceso.</p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isDeletingAccount ? 'ELIMINANDO...' : 'SÍ, ELIMINAR CUENTA'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
    <div className="bg-zinc-50 dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-2 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-500 uppercase">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black">{value}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      {subtext && <p className="text-[10px] text-zinc-500 dark:text-zinc-600 font-bold uppercase">{subtext}</p>}
    </div>
  );
}

function AnalysisItem({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className={`font-bold truncate ${color}`}>{value}</p>
    </div>
  );
}
