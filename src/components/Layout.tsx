import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  Trophy, 
  User as UserIcon, 
  LayoutDashboard, 
  History, 
  LogOut,
  TrendingUp,
  Award,
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Layout({ children, currentView, setView }: { 
  children: React.ReactNode, 
  currentView: string,
  setView: (v: string) => void 
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeBetsCount, setActiveBetsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bets'),
      where('userId', '==', user.uid),
      where('status', '==', 'LOCKED')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveBetsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white font-sans pb-24 lg:pb-0 lg:pl-64 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-zinc-50 dark:bg-[#111] border-r border-zinc-200 dark:border-white/5 p-6 space-y-8 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter">
              Ficti<span className="text-[#ff6321]">BET</span>
            </h1>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <Award className="w-3 h-3 text-[#ff6321]" />
              Nivel {user.level}
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-zinc-200 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-[#ff6321] transition-all"
            title="Cambiar tema"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Partidos" active={currentView === 'matches'} onClick={() => setView('matches')} />
          <NavItem icon={<History />} label="Mis Apuestas" active={currentView === 'bets'} onClick={() => setView('bets')} badge={activeBetsCount > 0 ? activeBetsCount : undefined} />
          <NavItem icon={<Trophy />} label="Rankings" active={currentView === 'rankings'} onClick={() => setView('rankings')} />
          <NavItem icon={<Award />} label="Logros" active={currentView === 'achievements'} onClick={() => setView('achievements')} />
          <NavItem icon={<UserIcon />} label="Perfil" active={currentView === 'profile'} onClick={() => setView('profile')} />
          <NavItem icon={<HelpCircle />} label="Ayuda" active={currentView === 'help'} onClick={() => setView('help')} />
        </nav>

        <div className="pt-6 border-t border-zinc-200 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-200/50 dark:bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-[#ff6321] rounded-full overflow-hidden flex items-center justify-center font-bold border border-zinc-200 dark:border-white/10">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.username}</p>
              <p className="text-xs text-[#ff6321] font-mono">{(user.points || 0).toLocaleString()} pts</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full p-3 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 lg:p-8">
        {/* Top Header for Mobile */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black tracking-tighter">
            Ficti<span className="text-[#ff6321]">BET</span>
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setView('help')}
              className={`p-2 rounded-lg transition-colors ${currentView === 'help' ? 'bg-[#ff6321] text-white' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'}`}
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
        {children}
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#111]/90 backdrop-blur-lg border-t border-zinc-200 dark:border-white/5 px-6 py-4 flex justify-between items-center z-40 transition-colors duration-300">
        <MobileNavItem icon={<LayoutDashboard />} active={currentView === 'matches'} onClick={() => setView('matches')} />
        <MobileNavItem icon={<History />} active={currentView === 'bets'} onClick={() => setView('bets')} badge={activeBetsCount > 0 ? activeBetsCount : undefined} />
        <div className="relative -top-8" onClick={() => setView('rankings')}>
          <div className={`p-4 rounded-full shadow-lg border-4 border-white dark:border-[#0a0a0a] transition-all ${
            currentView === 'rankings' ? 'bg-[#ff6321] shadow-[#ff6321]/40' : 'bg-zinc-200 dark:bg-[#222] text-zinc-500'
          }`}>
            <Trophy className="w-6 h-6" />
          </div>
        </div>
        <MobileNavItem icon={<Award />} active={currentView === 'achievements'} onClick={() => setView('achievements')} />
        <MobileNavItem icon={<UserIcon />} active={currentView === 'profile'} onClick={() => setView('profile')} />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick, badge }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
        active ? 'bg-[#ff6321] text-white shadow-lg shadow-[#ff6321]/20' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
      }`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
      <span className="text-sm font-bold flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
          active ? 'bg-white text-[#ff6321]' : 'bg-[#ff6321] text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavItem({ icon, active = false, onClick, badge }: { icon: React.ReactNode, active?: boolean, onClick?: () => void, badge?: number }) {
  return (
    <button onClick={onClick} className={`p-2 transition-colors relative ${active ? 'text-[#ff6321]' : 'text-zinc-500'}`}>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' }) : icon}
      {badge !== undefined && (
        <span className="absolute top-0 right-0 w-4 h-4 bg-[#ff6321] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
          {badge}
        </span>
      )}
    </button>
  );
}
