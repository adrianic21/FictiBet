import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BetSlip from './components/BetSlip';
import Profile from './components/Profile';
import Rankings from './components/Rankings';
import Achievements from './components/Achievements';
import MyBets from './components/MyBets';
import Help from './components/Help';
import UserProfileView from './components/UserProfileView';
import { Selection } from './types';

function AppContent() {
  const { user, loading } = useAuth();
  const [slipSelections, setSlipSelections] = useState<Selection[]>([]);
  const [currentView, setCurrentView] = useState('matches');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center transition-colors duration-500">
        <div className="w-12 h-12 border-4 border-[#ff6321] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const addToSlip = (selection: Selection) => {
    setSlipSelections(prev => {
      const exists = prev.find(s => s.matchId === selection.matchId);
      if (exists) {
        // If clicking the same selection, remove it (toggle off)
        if (exists.selection === selection.selection) {
          return prev.filter(s => s.matchId !== selection.matchId);
        }
        // If clicking a different selection for the same match, update it
        return prev.map(s => s.matchId === selection.matchId ? selection : s);
      }
      return [...prev, selection];
    });
  };

  const removeFromSlip = (id: string) => {
    setSlipSelections(prev => prev.filter(s => s.matchId !== id));
  };

  const renderView = () => {
    switch (currentView) {
      case 'matches': return <Dashboard onAddToSlip={addToSlip} setView={setCurrentView} selections={slipSelections} />;
      case 'profile': return <Profile setView={setCurrentView} />;
      case 'userProfile': return <UserProfileView userId={selectedUserId!} onAddToSlip={addToSlip} setView={setCurrentView} />;
      case 'rankings': return <Rankings onViewProfile={(uid) => { setSelectedUserId(uid); setCurrentView('userProfile'); }} />;
      case 'achievements': return <Achievements />;
      case 'bets': return <MyBets />;
      case 'help': return <Help />;
      default: return <Dashboard onAddToSlip={addToSlip} setView={setCurrentView} selections={slipSelections} />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
      {renderView()}
      <BetSlip 
        selections={slipSelections} 
        onRemove={removeFromSlip} 
        onClear={() => setSlipSelections([])} 
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
