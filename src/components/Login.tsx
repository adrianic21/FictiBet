import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
  console.error('Firebase Auth Error:', error);
  alert(`Error: ${error.code}\n\n${error.message}`);
} finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 font-sans text-zinc-900 dark:text-white transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-white dark:bg-[#1a1a1a] p-8 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-2xl transition-colors duration-500"
      >
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Ficti<span className="text-[#ff6321]">BET</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-widest">
            Apuestas de Fútbol Pro
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {isLoading ? 'CONECTANDO...' : 'ENTRAR CON GOOGLE'}
          </button>
          
          <p className="text-center text-zinc-500 dark:text-zinc-500 text-xs px-4">
            Al entrar, aceptas nuestras normas de juego limpio y el uso de datos ficticios.
          </p>
        </div>

        <div className="flex items-center justify-center pt-4 border-t border-zinc-100 dark:border-white/5">
          <button 
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-sm font-medium"
          >
            <Info className="w-4 h-4" />
            ¿Cómo funciona?
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg p-8 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-[#ff6321]">
                <ShieldCheck className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Normas de FictiBET</h2>
              </div>
              <div className="space-y-4 text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                <p>
                  <strong className="text-zinc-900 dark:text-white">1. Dinero Ficticio:</strong> Esta aplicación utiliza puntos ficticios. No hay dinero real involucrado.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-white">2. Tu propia API:</strong> Para ver partidos reales, debes introducir tu propia API Key de proveedores como API-Football.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-white">3. Sistema de Niveles:</strong> Empiezas con 999 puntos. A medida que ganes apuestas, subirás de nivel (hasta el 100).
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-white">4. Validación Diaria:</strong> Todas las apuestas se validan automáticamente a las 00:00 (hora servidor).
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-white">5. Fair Play:</strong> Compite por el ranking semanal y demuestra que eres el mejor analista.
                </p>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 py-3 rounded-xl font-bold transition-colors text-zinc-900 dark:text-white"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
