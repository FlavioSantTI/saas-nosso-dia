// apps/web/src/components/ActiveAlarmOverlay.tsx
// Overlay de tela cheia disparado quando um alarme do Nosso Dia é acionado

import React, { useEffect, useState, useRef } from 'react';
import { Bell, BellOff, Clock, Volume2, VolumeX } from 'lucide-react';
import { startAlarm, stopAlarm } from '../lib/alarmAudio';

interface ActiveAlarmOverlayProps {
  activityTitle?: string | null;
  activityTime?: string | null;
  activityLocation?: string | null;
  onDismiss: () => void;
  onSnooze?: (minutes: number) => void;
}

export const ActiveAlarmOverlay: React.FC<ActiveAlarmOverlayProps> = ({
  activityTitle = 'Compromisso Familiar',
  activityTime,
  activityLocation,
  onDismiss,
  onSnooze
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [snoozeSecondsLeft, setSnoozeSecondsLeft] = useState<number | null>(null);
  const snoozeTimerRef = useRef<any>(null);

  // Inicia o áudio contínuo ao montar
  useEffect(() => {
    startAlarm();

    return () => {
      stopAlarm();
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
      }
    };
  }, []);

  const handleToggleMute = () => {
    if (isMuted) {
      startAlarm();
      setIsMuted(false);
    } else {
      stopAlarm();
      setIsMuted(true);
    }
  };

  const handleDismiss = () => {
    stopAlarm();
    onDismiss();
  };

  const handleSnooze = (minutes = 5) => {
    stopAlarm();
    setIsMuted(true);
    setSnoozeSecondsLeft(minutes * 60);

    if (onSnooze) {
      onSnooze(minutes);
    }

    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
    }

    snoozeTimerRef.current = setTimeout(() => {
      setSnoozeSecondsLeft(null);
      setIsMuted(false);
      startAlarm();
    }, minutes * 60 * 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-sky-900 via-slate-900 to-slate-950 text-white animate-in fade-in duration-300">
      {/* Topo: Controle Mudo e Status */}
      <div className="w-full max-w-md flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-sky-200">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Alarme Nosso Dia</span>
        </div>

        <button
          type="button"
          onClick={handleToggleMute}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-colors cursor-pointer"
          title={isMuted ? 'Desmutar' : 'Silenciar temporariamente'}
          aria-label="Silenciar som"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-amber-300" /> : <Volume2 className="w-5 h-5 text-sky-300 animate-pulse" />}
        </button>
      </div>

      {/* Centro: Animação e Informações da Atividade */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-sm px-4">
        <div className="relative mb-8">
          {/* Anéis pulsantes de alerta */}
          <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping duration-1000" />
          <div className="absolute -inset-4 rounded-full bg-sky-400/10 animate-pulse duration-1000" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-2xl shadow-sky-500/50 border-4 border-white/20">
            <Bell className="w-14 h-14 text-white animate-bounce" />
          </div>
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-sky-300 mb-2">
          Hora da Atividade
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
          {activityTitle}
        </h1>

        <div className="flex items-center gap-3 flex-wrap justify-center text-sm font-semibold text-slate-300">
          {activityTime && (
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/10">
              ⏰ {activityTime}
            </span>
          )}
          {activityLocation && (
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/10 truncate max-w-[200px]">
              📍 {activityLocation}
            </span>
          )}
        </div>

        {snoozeSecondsLeft !== null && (
          <div className="mt-6 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-semibold animate-pulse">
            Soneca ativada: alarme soará novamente em breve.
          </div>
        )}
      </div>

      {/* Rodapé: Botões de Ação Grandes e Acessíveis */}
      <div className="w-full max-w-md space-y-3 pb-6">
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full min-h-[58px] py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg shadow-xl shadow-rose-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <BellOff className="w-6 h-6" />
          <span>Desligar Alarme</span>
        </button>

        <button
          type="button"
          onClick={() => handleSnooze(5)}
          className="w-full min-h-[50px] py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.99] border border-white/15 text-slate-200 hover:text-white font-bold text-sm sm:text-base backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Clock className="w-4 h-4 text-sky-300" />
          <span>Soneca (5 min)</span>
        </button>
      </div>
    </div>
  );
};
