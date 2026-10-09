import React from 'react';
import { EventItem } from '../types';
import { Clock, MapPin, User, Bell, AlertTriangle } from 'lucide-react';

interface ActivityCardProps {
  event: EventItem;
  hasConflict?: boolean;
  onClick?: (event: EventItem) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, event: EventItem) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ event, hasConflict, onClick, onDragStart }) => {
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  const isWithoutResponsible = !event.responsible_id;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(e, event);
    }
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onClick?.(event)}
      className={`p-3.5 rounded-2xl border text-sm shadow-xs transition-all duration-200 bg-white flex flex-col justify-between cursor-grab active:cursor-grabbing hover:shadow-md select-none group relative ${
        hasConflict
          ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300 hover:border-red-400'
          : isWithoutResponsible
            ? 'border-amber-200/90 bg-amber-50/25 hover:border-amber-300'
            : 'border-slate-200/70 hover:border-sky-200 hover:bg-slate-50/30'
      }`}
    >
      <div>
        {/* Metadados: Horário, Lembrete, Local */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sky-800 bg-sky-50 border border-sky-100/80 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-sky-600 shrink-0" />
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </span>
            {event.reminder_minutes !== null && event.reminder_minutes !== undefined && (
              <span
                className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                title={`Notificação: ${event.reminder_minutes} min antes`}
              >
                <Bell className="w-2.5 h-2.5 text-amber-600" />
                {event.reminder_minutes}m
              </span>
            )}
          </div>
          {event.location && (
            <span className="text-slate-500 text-[11px] font-medium truncate max-w-[110px] flex items-center gap-0.5" title={event.location.name}>
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{event.location.name}</span>
            </span>
          )}
        </div>

        {/* Título da Atividade */}
        <h3 className="font-bold text-slate-800 text-sm mb-2.5 group-hover:text-sky-700 transition-colors flex items-center justify-between">
          <span className="leading-snug">{event.title}</span>
          <span className="text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors ml-1 shrink-0 font-mono">⋮⋮</span>
        </h3>

        {/* Participantes */}
        {event.participants && event.participants.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {event.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold text-white shadow-2xs"
                style={{ backgroundColor: p.color }}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé: Responsável */}
      <div className="pt-2 border-t border-slate-100/90 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium text-[11px]">Responsável:</span>
        {event.responsible ? (
          <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
            <User className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{event.responsible.name}</span>
          </span>
        ) : (
          <span className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 animate-pulse border border-amber-200/60">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
            Definir
          </span>
        )}
      </div>

      {/* Alerta de Conflito de Horário */}
      {hasConflict && (
        <div className="mt-2 text-[11px] font-bold text-red-700 bg-red-100/90 border border-red-200 px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Conflito para {event.responsible?.name || 'responsável'}!</span>
        </div>
      )}
    </div>
  );
};

