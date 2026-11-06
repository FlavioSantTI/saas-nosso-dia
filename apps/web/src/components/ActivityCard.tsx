import React from 'react';
import { EventItem } from '../types';
import { Clock, MapPin, Bell, AlertTriangle } from 'lucide-react';
import { getMemberDisplayName } from '../lib/formatters';
import { extractLiteralTime } from '../lib/dateUtils';
import { MemberAvatar } from './MemberAvatar';

interface ActivityCardProps {
  event: EventItem;
  hasConflict?: boolean;
  onClick?: (event: EventItem) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, event: EventItem) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ event, hasConflict, onClick, onDragStart }) => {
  const isWithoutResponsible = !event.responsible_id;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(e, event);
    }
  };

  return (
    <div
      draggable={!isTouchDevice}
      onDragStart={handleDragStart}
      onClick={() => onClick?.(event)}
      className={`p-3.5 rounded-2xl border text-sm shadow-2xs transition-all duration-200 bg-white flex flex-col justify-between cursor-pointer hover:shadow-xs select-none group relative ${
        hasConflict
          ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300 hover:border-red-400'
          : isWithoutResponsible
            ? 'border-amber-200/90 bg-amber-50/30 hover:border-amber-300'
            : 'border-slate-200/80 hover:border-sky-300 hover:bg-slate-50/40'
      }`}
    >
      <div>
        {/* Metadados Superiores: Horário, Lembrete e Local */}
        <div className="flex items-center justify-between text-caption text-slate-600 mb-2 gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sky-900 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5 text-caption">
              <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{extractLiteralTime(event.start_time)} - {extractLiteralTime(event.end_time)}</span>
            </span>

            {event.reminder_minutes !== null && event.reminder_minutes !== undefined && (
              <span
                className="text-caption font-bold text-amber-900 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                title={`Notificação: ${event.reminder_minutes} min antes`}
              >
                <Bell className="w-3 h-3 text-amber-700" />
                <span>{event.reminder_minutes}m</span>
              </span>
            )}
          </div>

          {event.location && (
            <span
              className="text-slate-600 text-caption font-semibold truncate max-w-[130px] flex items-center gap-1"
              title={event.location.name}
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{event.location.name}</span>
            </span>
          )}
        </div>

        {/* Título da Atividade */}
        <h3 className="font-bold text-slate-900 text-body mb-2.5 group-hover:text-sky-800 transition-colors flex items-start justify-between gap-1.5">
          <span className="leading-snug flex items-center flex-wrap gap-1.5 min-w-0 flex-1 break-words">
            <span className="break-words">{event.title}</span>
            {event.location?.name && (
              <span className="inline-flex items-center text-caption font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]" title={event.location.name}>
                📍 {event.location.name}
              </span>
            )}
          </span>
          <span className="text-caption text-slate-400 group-hover:text-slate-600 transition-colors ml-1 shrink-0 font-mono mt-0.5">
            ⋮⋮
          </span>
        </h3>

        {/* Participantes (Filhos/Família) com cores distintivas */}
        {event.participants && event.participants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {event.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-caption font-bold text-white shadow-2xs truncate max-w-[130px]"
                style={{ backgroundColor: p.color }}
                title={getMemberDisplayName(p)}
              >
                {p.avatar && <MemberAvatar member={p} size="xs" className="!w-3 !h-3 rounded-xs shrink-0" />}
                <span className="truncate">{getMemberDisplayName(p)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé: Responsável pela Logística (Leva/Busca) */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-caption gap-2">
        <span className="text-slate-600 font-semibold text-caption shrink-0">Responsável:</span>
        {event.responsible ? (
          <span
            className="font-bold text-slate-800 flex items-center gap-1.5 text-caption min-w-0 max-w-[140px] sm:max-w-[180px] truncate"
            title={getMemberDisplayName(event.responsible)}
          >
            <MemberAvatar member={event.responsible} size="xs" />
            <span className="truncate">{getMemberDisplayName(event.responsible)}</span>
          </span>
        ) : (
          <span className="text-amber-950 font-bold bg-amber-100/90 px-2.5 py-1 rounded-lg text-caption flex items-center gap-1 border border-amber-300 shadow-2xs shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Sem responsável</span>
          </span>
        )}
      </div>

      {/* Alerta de Conflito de Horário */}
      {hasConflict && (
        <div className="mt-2 text-caption font-bold text-red-900 bg-red-100 border border-red-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Conflito para {getMemberDisplayName(event.responsible) || 'responsável'}!</span>
        </div>
      )}
    </div>
  );
};
