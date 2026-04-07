import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Info, ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || pin.length !== 4) {
      setError('Introduce un nick y un PIN de 4 dígitos');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await register(nickname.trim(), pin);
      } else {
        await login(nickname.trim(), pin);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
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
            {isRegistering ? 'Crear nueva cuenta' : 'Acceso de Jugadores'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text"
                placeholder="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#ff6321] transition-all font-bold"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="password"
                inputMode="numeric"
                placeholder="PIN de 4 dígitos"
                value={pin}
                onChange={handlePinChange}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#ff6321] transition-all font-mono text-xl tracking-[0.5em]"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff6321] hover:bg-[#e55a1e] text-white font-black py-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-[#ff6321]/20 flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest"
          >
            {isLoading ? 'CONECTANDO...' : (isRegistering ? 'REGISTRARSE' : 'ENTRAR')}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
          
          <div className="text-center">
            <button 
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-zinc-500 hover:text-[#ff6321] text-xs font-bold transition-colors uppercase tracking-widest"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Crea tu cuenta'}
            </button>
          </div>
        </form>

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
