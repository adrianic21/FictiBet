import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
          
          // Listen for real-time updates
          onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
            if (doc.exists()) {
              setUser({ uid: firebaseUser.uid, ...doc.data() } as UserProfile);
            }
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user: firebaseUser } = await signInWithPopup(auth, provider);
    
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      const newUser: Omit<UserProfile, 'uid'> = {
        username: firebaseUser.displayName || 'Usuario',
        photoURL: firebaseUser.photoURL || '',
        email: firebaseUser.email || '',
        points: 500, // Initial points for betting
        level: 1,
        provider: '',
        apiKey: '',
        favorites: [],
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
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      setUser({ uid: firebaseUser.uid, ...newUser } as UserProfile);
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
