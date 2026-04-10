import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
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
      const isFav = prev.includes(league);
      const next = isFav ? prev.filter(l => l !== league) : [...prev, league];
      localStorage.setItem('favoriteLeagues', JSON.stringify(next));
      // Auto-expand when favorited
      if (!isFav) {
        setExpandedLeagues(exp => exp.includes(league) ? exp : [...exp, league]);
      }
      return next;
    });
  };

  const fetchMatches = useCallback(async () => {
    if (!user?.apiKey) return;
    setLoading(true);
    try {
      const provider = getProvider('API-Football', user.apiKey);
      const realMatches = await provider.getMatches();
      setMatches(realMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.apiKey]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Auto-expand favorite leagues when matches load
  useEffect(() => {
    if (matches.length > 0 && favoriteLeagues.length > 0) {
      setExpandedLeagues(prev => {
        const toAdd = favoriteLeagues.filter(l => !prev.includes(l));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMatches = matches.filter(match => {
    const matchTime = new Date(match.startTime).getTime();
    const now = Date.now();

    if (matchTime <= now) return false;

    const searchLower = search.toLowerCase();
    const matchesSearch = match.homeTeam.toLowerCase().includes(searchLower) ||
      match.awayTeam.toLowerCase().includes(searchLower) ||
      match.league.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    if (filter === 'all') return true;

    const diffMins = (matchTime - now) / (1000 * 60);
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
            Para ver partidos reales necesitas configurar tu API Key de API-Football en tu perfil.
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
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar equipo o liga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#ff6321] dark:text-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button
            onClick={() => { setMatches([]); fetchMatches(); }}
            disabled={loading}
            className="p-2.5 bg-zinc-100 dark:bg-white/5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 shrink-0"
            title="Recargar partidos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-zinc-600 dark:text-zinc-400`} />
          </button>
          {(['all', '3h', '1h', '30m'] as const).map(f => (
            <FilterButton key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'HOY' : f}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Leagues List */}
      <div className="space-y-2">
        {loading && filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Cargando partidos...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            <div className="space-y-1">
              <p className="text-lg font-bold">No hay partidos disponibles</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Prueba a recargar o cambia los filtros.</p>
            </div>
            <button
              onClick={fetchMatches}
              className="bg-zinc-100 dark:bg-white/5 px-5 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
            >
              REINTENTAR
            </button>
          </div>
        ) : (
          leagues.map(league => {
            const leagueMatches = filteredMatches.filter(m => m.league === league);
            const firstMatch = leagueMatches[0];

            return (
              <div key={league} className="bg-zinc-50 dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
                <div
                  onClick={() => toggleLeague(league)}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => toggleFavorite(e, league)}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Star className={`w-4 h-4 transition-colors ${favoriteLeagues.includes(league) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400 dark:text-zinc-600'}`} />
                    </button>
                    {firstMatch?.leagueFlag && (
                      <img
                        src={firstMatch.leagueFlag}
                        alt=""
                        className="w-5 h-3 object-cover rounded-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="font-bold text-sm">{league}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">
                      {leagueMatches.length} {leagueMatches.length === 1 ? 'partido' : 'partidos'}
                    </span>
                  </div>
                  <div className="text-zinc-400 dark:text-zinc-600">
                    {expandedLeagues.includes(league)
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedLeagues.includes(league) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.18 }}
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
      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active
        ? 'bg-[#ff6321] text-white'
        : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
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

  return (
    <div className="px-3 py-2.5 space-y-2">
      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <Clock className="w-3 h-3" />
        <span className="font-mono">
          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {match.homeLogo && (
            <img
              src={match.homeLogo}
              alt=""
              className="w-5 h-5 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-sm font-bold truncate">{match.homeTeam}</span>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-600 shrink-0 font-medium">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-bold truncate text-right">{match.awayTeam}</span>
          {match.awayLogo && (
            <img
              src={match.awayLogo}
              alt=""
              className="w-5 h-5 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </div>

      {/* Selection buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['1', 'X', '2'] as const).map((sel) => (
          <button
            key={sel}
            onClick={() => onSelect({ ...match, matchId: match.id, selection: sel, odds: 1 })}
            className={`py-2 rounded-lg text-sm font-black transition-all ${activeSelection === sel
              ? 'bg-[#ff6321] text-white shadow-md shadow-[#ff6321]/20'
              : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
              }`}
          >
            {sel}
          </button>
        ))}
      </div>
    </div>
  );
}
