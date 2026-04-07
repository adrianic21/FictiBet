import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (nickname: string, pin: string) => Promise<void>;
  register: (nickname: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const savedNickname = localStorage.getItem('fictibet_nickname');
      
      if (firebaseUser && savedNickname) {
        try {
          const userDoc = await getDoc(doc(db, 'users', savedNickname));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Only auto-login if the authUid matches (same device/session)
            if (data.authUid === firebaseUser.uid) {
              setUser({ uid: savedNickname, ...data });
              
              // Listen for real-time updates
              onSnapshot(doc(db, 'users', savedNickname), (doc) => {
                if (doc.exists()) {
                  setUser({ uid: savedNickname, ...doc.data() } as UserProfile);
                }
              });
            } else {
              // PIN required for re-auth on different device/session
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth error:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (nickname: string, pin: string) => {
    const { user: firebaseUser } = await signInAnonymously(auth);
    const userRef = doc(db, 'users', nickname);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('El usuario no existe');
    }

    const data = userDoc.data() as UserProfile;
    if (data.pin !== pin) {
      throw new Error('PIN incorrecto');
    }

    // Update authUid to current anonymous session for security rules
    await updateDoc(userRef, { authUid: firebaseUser.uid });
    
    localStorage.setItem('fictibet_nickname', nickname);
    setUser({ uid: nickname, ...data, authUid: firebaseUser.uid });
  };

  const register = async (nickname: string, pin: string) => {
    const { user: firebaseUser } = await signInAnonymously(auth);
    const userRef = doc(db, 'users', nickname);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      throw new Error('El nombre de usuario ya está en uso');
    }

    const newUser: Omit<UserProfile, 'uid'> = {
      authUid: firebaseUser.uid,
      username: nickname,
      pin: pin,
      photoURL: '',
      email: '',
      points: 500,
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

    await setDoc(userRef, newUser);
    localStorage.setItem('fictibet_nickname', nickname);
    setUser({ uid: nickname, ...newUser } as UserProfile);
  };

  const logout = async () => {
    localStorage.removeItem('fictibet_nickname');
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
