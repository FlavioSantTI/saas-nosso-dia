import React from 'react';
import { EventItem, FamilyMember } from '../types';
import { ActivityCard } from './ActivityCard';

interface DayViewProps {
  currentDate: Date;
  events: EventItem[];
  members: FamilyMember[];
  selectedMemberId: string | null;
  onCardClick?: (event: EventItem) => void;
  onAddNewActivity?: () => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  selectedMemberId,
  onCardClick,
  onAddNewActivity,
}) => {
  // Data selecionada no formato YYYY-MM-DD
  const yyyy = currentDate.getFullYear();
  const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
  const dd = String(currentDate.getDate()).padStart(2, '0');
  const targetDateStr = `${yyyy}-${mm}-${dd}`;

  // Filtro de membro
  const memberFiltered = selectedMemberId
    ? events.filter(
        (e) =>
          e.participants?.some((p) => p.id === selectedMemberId) ||
          e.responsible_id === selectedMemberId
      )
    : events;

  // Filtro pelo dia
  const dayEvents = memberFiltered
    .filter((e) => {
      const start = new Date(e.start_time);
      const sY = start.getUTCFullYear();
      const sM = String(start.getUTCMonth() + 1).padStart(2, '0');
      const sD = String(start.getUTCDate()).padStart(2, '0');
      return `${sY}-${sM}-${sD}` === targetDateStr;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Detecção de conflitos
  const conflictIds = new Set<string>();
  for (let i = 0; i < dayEvents.length; i++) {
    for (let j = i + 1; j < dayEvents.length; j++) {
      const e1 = dayEvents[i];
      const e2 = dayEvents[j];
      if (e1.responsible_id && e1.responsible_id === e2.responsible_id) {
        const s1 = new Date(e1.start_time).getTime();
        const e_end1 = new Date(e1.end_time).getTime();
        const s2 = new Date(e2.start_time).getTime();
        const e_end2 = new Date(e2.end_time).getTime();
        if (s1 < e_end2 && s2 < e_end1) {
          conflictIds.add(e1.id);
          conflictIds.add(e2.id);
        }
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full bg-white/85 backdrop-blur-xs rounded-3xl border border-sky-100/90 shadow-2xs p-4 sm:p-6 min-h-[500px] flex flex-col">
      {/* Header do Dia */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Visão Detalhada do Dia
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            Atividades Agendadas
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-100 shadow-2xs">
            {dayEvents.length} {dayEvents.length === 1 ? 'atividade' : 'atividades'}
          </span>
          {onAddNewActivity && (
            <button
              onClick={onAddNewActivity}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              + Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Eventos de Dia Inteiro / Datas Especiais */}
      {dayEvents.filter(e => e.is_all_day).length > 0 && (
        <div className="mb-6 space-y-2 border-b border-dashed border-amber-200 pb-6">
          {dayEvents.filter(e => e.is_all_day).map(evt => {
            const isBirthday = evt.title.toLowerCase().includes('aniversário') || evt.title.toLowerCase().includes('niver');
            return (
              <div 
                key={evt.id} 
                onClick={() => onCardClick && onCardClick(evt)}
                className="max-w-2xl mx-auto w-full px-4 py-3 bg-amber-50 text-amber-900 text-sm font-bold rounded-2xl border border-amber-200/80 shadow-2xs cursor-pointer hover:bg-amber-100/80 transition-colors flex items-center gap-3"
              >
                <span className="text-2xl">{isBirthday ? '🎂' : '📌'}</span>
                <span className="flex-1 text-base">{evt.title}</span>
                <span className="px-3 py-1 bg-white/70 rounded-full text-xs text-amber-800 font-semibold border border-amber-200/50">Dia Inteiro</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de Atividades (Com Horário) */}
      <div className="flex-1 space-y-3.5">
        {dayEvents.filter(e => !e.is_all_day).length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-sky-100 rounded-2xl bg-white/50">
            <span className="text-3xl mb-2">☀️</span>
            <h4 className="text-sm font-bold text-slate-700">Nenhuma atividade com horário agendada</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Este dia está completamente livre de compromissos fixos!
            </p>
            {onAddNewActivity && (
              <button
                onClick={onAddNewActivity}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                + Criar Atividade para este dia
              </button>
            )}
          </div>
        ) : (
          dayEvents.filter(e => !e.is_all_day).map((evt) => (
            <div key={evt.id} className="max-w-2xl mx-auto w-full">
              <ActivityCard
                event={evt}
                hasConflict={conflictIds.has(evt.id)}
                onClick={onCardClick}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
