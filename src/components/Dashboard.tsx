import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Clock, 
  Filter,
  Search,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Match, Selection } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getProvider } from '../services/api';

export default function Dashboard({ onAddToSlip, setView, selections }: { 
  onAddToSlip: (selection: Selection) => void, 
  setView: (view: string) => void,
  selections: Selection[]
}) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | '3h' | '1h' | '30m'>('all');
  const [search, setSearch] = useState('');
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteLeagues');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (e: React.MouseEvent, league: string) => {
    e.stopPropagation();
    setFavoriteLeagues(prev => {
      const next = prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league];
      localStorage.setItem('favoriteLeagues', JSON.stringify(next));
      return next;
    });
  };

  const fetchMatches = useCallback(async () => {
    if (!user?.apiKey) return;
    setLoading(true);
    try {
      const provider = getProvider(user.provider || 'API-Football', user.apiKey);
      const realMatches = await provider.getMatches();
      setMatches(realMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.apiKey, user?.provider]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const filteredMatches = matches.filter(match => {
    const matchTime = new Date(match.startTime).getTime();
    const now = Date.now();
    
    // Only show matches that haven't started
    if (matchTime <= now) return false;

    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = match.homeTeam.toLowerCase().includes(searchLower) || 
                         match.awayTeam.toLowerCase().includes(searchLower) || 
                         match.league.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    // Time filter
    if (filter === 'all') return true;
    
    const diffMs = matchTime - now;
    const diffMins = diffMs / (1000 * 60);
    
    if (filter === '30m') return diffMins <= 30;
    if (filter === '1h') return diffMins <= 60;
    if (filter === '3h') return diffMins <= 180;
    
    return true;
  });

  const leagues = Array.from(new Set(filteredMatches.map(m => m.league))).sort((a, b) => {
    const aFav = favoriteLeagues.includes(a);
    const bFav = favoriteLeagues.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.localeCompare(b);
  });
  
  const toggleLeague = (league: string) => {
    setExpandedLeagues(prev => 
      prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]
    );
  };

  if (!user?.apiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="bg-zinc-100 dark:bg-white/5 p-6 rounded-full">
          <AlertCircle className="w-12 h-12 text-[#ff6321]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Configuración Requerida</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
            Para ver partidos reales y cuotas actualizadas, debes configurar tu API Key en tu perfil.
          </p>
        </div>
        <button 
          onClick={() => setView('profile')}
          className="bg-[#ff6321] px-8 py-3 rounded-xl font-bold hover:bg-[#e55a1e] text-white transition-colors"
        >
          IR A PERFIL
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text"
            placeholder="Buscar equipo o liga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-[#ff6321] dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button 
            onClick={() => {
              setMatches([]); // Clear matches to show loading state clearly
              fetchMatches();
            }}
            disabled={loading}
            className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 group"
            title="Recargar partidos"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform'} text-zinc-600 dark:text-zinc-400`} />
          </button>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>HOY</FilterButton>
          <FilterButton active={filter === '3h'} onClick={() => setFilter('3h')}>3h</FilterButton>
          <FilterButton active={filter === '1h'} onClick={() => setFilter('1h')}>1h</FilterButton>
          <FilterButton active={filter === '30m'} onClick={() => setFilter('30m')}>30m</FilterButton>
        </div>
      </div>

      {/* Leagues List */}
      <div className="space-y-4">
        {loading && filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Cargando partidos reales...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <div className="space-y-1">
              <p className="text-xl font-bold">No hay partidos disponibles</p>
              <p className="text-zinc-500 dark:text-zinc-400">Prueba a recargar o cambia los filtros.</p>
            </div>
            <button 
              onClick={fetchMatches}
              className="bg-zinc-100 dark:bg-white/5 px-6 py-2 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
            >
              REINTENTAR
            </button>
          </div>
        ) : (
          leagues.map(league => {
            const leagueMatches = filteredMatches.filter(m => m.league === league);
            const firstMatch = leagueMatches[0];
            
            return (
              <div key={league} className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
                <div 
                  onClick={() => toggleLeague(league)}
                  className="w-full p-4 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => toggleFavorite(e, league)}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Star className={`w-5 h-5 transition-colors ${favoriteLeagues.includes(league) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400 dark:text-zinc-600'}`} />
                    </button>
                    {firstMatch?.leagueFlag && (
                      <img 
                        src={firstMatch.leagueFlag} 
                        alt="" 
                        className="w-5 h-3 object-cover rounded-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="font-bold text-lg">{league}</span>
                  </div>
                  <div className="text-zinc-400 dark:text-zinc-600">
                    {expandedLeagues.includes(league) ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedLeagues.includes(league) && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-zinc-200 dark:border-white/5"
                    >
                      <div className="divide-y divide-zinc-200 dark:divide-white/5">
                        {leagueMatches.map(match => (
                          <MatchRow 
                            key={match.id} 
                            match={match} 
                            onSelect={onAddToSlip} 
                            activeSelection={selections.find(s => s.matchId === match.id)?.selection}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
        active ? 'bg-[#ff6321] text-white' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function MatchRow({ match, onSelect, activeSelection }: { 
  match: Match, 
  onSelect: (s: Selection) => void,
  activeSelection?: string
}) {
  const startTime = new Date(match.startTime);
  const now = new Date();
  const isLive = startTime <= now;

  // Calculate AI Probabilities based on odds
  const calculateProbabilities = (odds: { '1': number, 'X': number, '2': number }) => {
    const rawProb1 = 1 / odds['1'];
    const rawProbX = 1 / odds['X'];
    const rawProb2 = 1 / odds['2'];
    const total = rawProb1 + rawProbX + rawProb2;
    
    return {
      '1': Math.round((rawProb1 / total) * 100),
      'X': Math.round((rawProbX / total) * 100),
      '2': Math.round((rawProb2 / total) * 100)
    };
  };

  const probs = calculateProbabilities(match.odds);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-zinc-200 dark:bg-white/5 px-2 py-0.5 rounded text-zinc-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            ANÁLISIS IA
          </span>
          {isLive && <span className="text-red-500 animate-pulse">● EN VIVO</span>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Labels Row */}
          <div className="text-center space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">1</div>
            <div className="text-[10px] font-black text-[#ff6321]">{probs['1']}%</div>
          </div>
          <div className="text-center space-y-1 min-w-[60px]">
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">X</div>
            <div className="text-[10px] font-black text-[#ff6321]">{probs['X']}%</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">2</div>
            <div className="text-[10px] font-black text-[#ff6321]">{probs['2']}%</div>
          </div>

          {/* Home Team Button */}
          <button 
            onClick={() => onSelect({ ...match, matchId: match.id, selection: '1', odds: match.odds['1'] })}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group h-full ${
              activeSelection === '1'
                ? 'bg-[#ff6321] border-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20'
                : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {match.homeLogo && (
              <img 
                src={match.homeLogo} 
                alt="" 
                className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="font-black text-sm text-center line-clamp-2">{match.homeTeam}</span>
            <span className={`text-xs font-mono font-bold ${activeSelection === '1' ? 'text-white' : 'text-[#ff6321]'}`}>{match.odds['1'].toFixed(2)}</span>
          </button>

          {/* Draw Button */}
          <button 
            onClick={() => onSelect({ ...match, matchId: match.id, selection: 'X', odds: match.odds['X'] })}
            className={`flex flex-col items-center justify-center px-4 py-8 rounded-2xl border transition-all gap-2 min-w-[60px] h-full ${
              activeSelection === 'X'
                ? 'bg-[#ff6321] border-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20'
                : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="font-black text-xl">X</span>
            <span className={`text-xs font-mono font-bold ${activeSelection === 'X' ? 'text-white' : 'text-[#ff6321]'}`}>{match.odds['X'].toFixed(2)}</span>
          </button>

          {/* Away Team Button */}
          <button 
            onClick={() => onSelect({ ...match, matchId: match.id, selection: '2', odds: match.odds['2'] })}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group h-full ${
              activeSelection === '2'
                ? 'bg-[#ff6321] border-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20'
                : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {match.awayLogo && (
              <img 
                src={match.awayLogo} 
                alt="" 
                className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="font-black text-sm text-center line-clamp-2">{match.awayTeam}</span>
            <span className={`text-xs font-mono font-bold ${activeSelection === '2' ? 'text-white' : 'text-[#ff6321]'}`}>{match.odds['2'].toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectionButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`transition-all p-3 rounded-xl border font-black text-lg ${
        active 
          ? 'bg-[#ff6321] border-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20' 
          : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
