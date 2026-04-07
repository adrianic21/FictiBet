import React from 'react';
import { 
  BookOpen, 
  Key, 
  Trophy, 
  Target, 
  Zap, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Help() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block p-3 bg-[#ff6321]/10 rounded-2xl mb-4"
        >
          <BookOpen className="w-12 h-12 text-[#ff6321]" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">GUÍA DE SUPERVIVENCIA</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
          Todo lo que necesitas saber para convertirte en el mejor analista de FictiBET.
        </p>
      </div>

      {/* Quick Start - HIGHLIGHTED */}
      <section className="bg-[#ff6321] rounded-3xl p-8 text-white shadow-2xl shadow-[#ff6321]/20 relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-8 h-8" />
            <h2 className="text-2xl font-black uppercase italic">¡EMPIEZA A JUGAR YA!</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Step number="1" text="Configura tu API en el Perfil para ver partidos reales." />
              <Step number="2" text="Selecciona al menos 2 partidos (1, X o 2) en el Dashboard." />
            </div>
            <div className="space-y-4">
              <Step number="3" text="Introduce los puntos que quieres arriesgar en el talón." />
              <Step number="4" text="Sella tu combinada y espera a que terminen los partidos." />
            </div>
          </div>
          <p className="text-sm font-bold bg-black/20 p-3 rounded-xl inline-block">
            💡 RECUERDA: Si fallas un solo partido, pierdes los puntos apostados. ¡Precisión total!
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10">
          <Zap className="w-64 h-64" />
        </div>
      </section>

      {/* API Setup */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Key className="text-[#ff6321] w-6 h-6" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Configuración de la API</h2>
        </div>
        <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-4 transition-colors duration-300">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            FictiBET es una plataforma descentralizada. Para ver los partidos y resultados, necesitas conectar tu propio proveedor de datos:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Regístrate en <strong>API-Football</strong> (u otro proveedor compatible).</span>
            </li>
            <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Copia tu <strong>API Key</strong> desde el panel de control del proveedor.</span>
            </li>
            <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Ve a tu <strong>Perfil</strong> en FictiBET, selecciona el proveedor y pega la clave.</span>
            </li>
          </ul>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              Tu clave se guarda de forma segura en tu perfil y solo se usa para consultar datos desde tu navegador. FictiBET no almacena tus credenciales en sus servidores.
            </p>
          </div>
        </div>
      </section>

      {/* Points & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="text-[#ff6321] w-6 h-6" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Sistema de Puntos</h2>
          </div>
          <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-4 transition-colors duration-300">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              El sistema premia la cantidad de aciertos en combinadas exitosas:
            </p>
            <div className="p-4 bg-zinc-100 dark:bg-white/5 rounded-xl space-y-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">Fórmula de Premio</p>
              <p className="text-xl font-black text-[#ff6321]">Stake × Nº de Aciertos</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-600">Ejemplo: Apuestas 10 pts a 3 partidos. Si aciertas los 3, ganas 30 pts.</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-500">
                Si fallas 1 solo partido de la combinada, pierdes el stake apostado.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-[#ff6321] w-6 h-6" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Rankings y Niveles</h2>
          </div>
          <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 space-y-4 transition-colors duration-300">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Puntos</span>
                <span className="text-xs text-zinc-500">Tu saldo actual para apostar</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Aciertos</span>
                <span className="text-xs text-zinc-500">Total histórico de predicciones correctas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Efectividad</span>
                <span className="text-xs text-zinc-500">% de éxito global</span>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-200 dark:border-white/5">
              <p className="text-xs text-zinc-500">
                Subes de nivel cada <strong>50 aciertos totales</strong>. ¡Demuestra tu consistencia!
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Analysis & Social */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Target className="text-[#ff6321] w-6 h-6" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Análisis y Amigos</h2>
        </div>
        <div className="bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-white/5 p-6 transition-colors duration-300">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
            FictiBET no es solo apostar, es aprender. Consulta tus estadísticas avanzadas en el Perfil para saber en qué liga eres un experto (Liga Talismán) o cuál es tu mejor racha. Compara estos datos con tus amigos para ver quién tiene el mejor "ojo" clínico para el fútbol.
          </p>
        </div>
      </section>
    </div>
  );
}

function Step({ number, text }: { number: string, text: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm shrink-0">
        {number}
      </span>
      <p className="text-sm font-bold leading-tight">{text}</p>
    </div>
  );
}
