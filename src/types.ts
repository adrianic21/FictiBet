export type BetStatus = 
  | 'CREATED' 
  | 'LOCKED' 
  | 'IN_PROGRESS' 
  | 'WAITING_RESULT' 
  | 'PENDING_API_RETRY' 
  | 'WON' 
  | 'LOST' 
  | 'CANCELED' 
  | 'LIQUIDATED';

export interface Selection {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueId: string;
  selection: '1' | 'X' | '2';
  odds: number;
  startTime: string;
  result?: string;
}

export interface Bet {
  id?: string;
  userId: string;
  selections: Selection[];
  stake: number;
  totalOdds: number;
  status: BetStatus;
  createdAt: string;
  resultDate?: string;
  providerUsed: string;
}

export interface UserStats {
  totalBets: number;
  wonBets: number;
  totalPredictions: number; // Total individual matches predicted
  totalHits: number; // Total correct individual match predictions (lifetime)
  accuracy: number; // Percentage of correct predictions
  avgParlaySize: number; // Average number of matches per parlay
  maxWin: number; // Most points won in a single parlay
  currentStreak: number;
  maxStreak: number;
  favoriteLeague: string;
  talismanLeague: string; // League with highest accuracy
}

export interface UserProfile {
  uid: string; // This will be the nickname for document ID
  authUid: string; // The Firebase Anonymous UID for security rules
  username: string;
  pin: string; // 4-digit PIN
  photoURL?: string;
  email: string;
  points: number; // Current balance (used for betting)
  level: number;
  provider: string;
  apiKey: string;
  favorites: string[];
  stats: UserStats;
  achievements: string[];
  weeklyPoints: number;
  weeklyHits: number;
  weeklyPredictions: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  leagueId: string;
  leagueFlag?: string;
  startTime: string;
  odds: {
    '1': number;
    'X': number;
    '2': number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
}
