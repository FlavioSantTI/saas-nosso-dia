import React from 'react';
import { EventItem, FamilyMember } from '../types';
import { ActivityCard } from './ActivityCard';
import { getMonday } from './CalendarNavigation';
import { Sun } from 'lucide-react';

interface WeekViewProps {
  currentDate?: Date;
  events: EventItem[];
  members: FamilyMember[];
  selectedMemberId: string | null;
  onCardClick?: (event: EventItem) => void;
  onMoveEvent?: (eventId: string, targetDateStr: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate = new Date(),
  events,
  selectedMemberId,
  onCardClick,
  onMoveEvent,
}) => {
  const [dragOverDay, setDragOverDay] = React.useState<number | null>(null);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = String(today.getMonth() + 1).padStart(2, '0');
  const todayD = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${todayY}-${todayM}-${todayD}`;

  const monday = getMonday(currentDate);
  const weekdayConfig = [
    { label: 'Segunda', dayOfWeek: 1, offset: 0 },
    { label: 'Terça', dayOfWeek: 2, offset: 1 },
    { label: 'Quarta', dayOfWeek: 3, offset: 2 },
    { label: 'Quinta', dayOfWeek: 4, offset: 3 },
    { label: 'Sexta', dayOfWeek: 5, offset: 4 },
    { label: 'Sábado', dayOfWeek: 6, offset: 5 },
    { label: 'Domingo', dayOfWeek: 0, offset: 6 },
  ];

  const days = weekdayConfig.map((item) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + item.offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      label: item.label,
      dayOfWeek: item.dayOfWeek,
      dateStr: `${y}-${m}-${day}`,
      shortDate: `${day}/${m}`,
    };
  });

  // Filtro de membro
  const filteredEvents = selectedMemberId
    ? events.filter(
        (e) =>
          e.participants?.some((p) => p.id === selectedMemberId) ||
          e.responsible_id === selectedMemberId
      )
    : events;

  // Detecção de conflito simples: mesmo responsável em horários sobrepostos
  const detectConflicts = (dayEvents: EventItem[]) => {
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
    return conflictIds;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, dayOfWeek: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== dayOfWeek) {
      setDragOverDay(dayOfWeek);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, dayOfWeek: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverDay === dayOfWeek) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const eventId = e.dataTransfer.getData('text/plain');
    if (eventId && onMoveEvent) {
      onMoveEvent(eventId, dateStr);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mt-4">
      {days.map((day) => {
        const dayEvents = filteredEvents.filter((e) => {
          const d = new Date(e.start_time);
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dayNum = String(d.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${dayNum}` === day.dateStr;
        });

        const conflictIds = detectConflicts(dayEvents);
        const isDraggingOverThis = dragOverDay === day.dayOfWeek;
        const isToday = day.dateStr === todayDateStr;

        return (
          <div
            key={day.label}
            onDragOver={(e) => handleDragOver(e, day.dayOfWeek)}
            onDragLeave={(e) => handleDragLeave(e, day.dayOfWeek)}
            onDrop={(e) => handleDrop(e, day.dateStr)}
            className={`rounded-2xl p-3.5 border flex flex-col min-h-[500px] transition-all duration-150 shadow-2xs ${
              isDraggingOverThis
                ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300 ring-dashed scale-[1.01]'
                : isToday
                ? 'border-sky-300 ring-2 ring-sky-100 bg-white/90 shadow-xs'
                : 'bg-white/70 border-sky-100/90'
            }`}
          >
            {/* Header da Coluna */}
            <div className={`border-b pb-2.5 mb-3 flex items-center justify-between ${isToday ? 'border-sky-200' : 'border-slate-100'}`}>
              <div>
                <span className={`font-bold text-sm block leading-tight ${isToday ? 'text-sky-800' : 'text-slate-800'}`}>
                  {day.label}
                  {isToday && (
                    <span className="ml-1.5 text-[10px] font-extrabold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      Hoje
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">{day.shortDate}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${
                dayEvents.length > 0 
                  ? 'bg-sky-50 text-sky-700 border-sky-200' 
                  : 'bg-white text-slate-400 border-slate-200'
              }`}>
                {dayEvents.length}
              </span>
            </div>

            {/* Eventos de Dia Inteiro / Datas Especiais */}
            {dayEvents.filter(e => e.is_all_day).length > 0 && (
              <div className="mb-3 space-y-1.5 border-b border-dashed border-amber-200 pb-3">
                {dayEvents.filter(e => e.is_all_day).map(evt => {
                  const isBirthday = evt.title.toLowerCase().includes('aniversário') || evt.title.toLowerCase().includes('niver');
                  return (
                    <div 
                      key={evt.id} 
                      onClick={() => onCardClick && onCardClick(evt)}
                      className="px-2.5 py-1.5 bg-amber-50 text-amber-900 text-xs font-bold rounded-xl border border-amber-200/80 shadow-2xs cursor-pointer hover:bg-amber-100/80 transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-sm">{isBirthday ? '🎂' : '📌'}</span>
                      <span className="truncate flex-1">{evt.title}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lista de Atividades do Dia (Com Horário) */}
            <div className="space-y-2.5 flex-1 flex flex-col">
              {dayEvents.filter(e => !e.is_all_day).length === 0 ? (
                <div
                  className={`h-full flex flex-col items-center justify-center text-xs rounded-xl border border-dashed transition-colors py-12 px-2 text-center gap-2 ${
                    isDraggingOverThis
                      ? 'border-sky-400 text-sky-600 font-bold bg-white/60'
                      : 'border-transparent text-slate-400 font-medium'
                  }`}
                >
                  {isDraggingOverThis ? (
                    'Solte aqui para mover'
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500/80 shadow-2xs">
                        <Sun className="w-5 h-5" />
                      </div>
                      <span className="text-slate-400 font-medium text-xs leading-tight">
                        Dia livre para relaxar! ☀️
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {dayEvents.filter(e => !e.is_all_day).map((evt) => (
                    <ActivityCard
                      key={evt.id}
                      event={evt}
                      hasConflict={conflictIds.has(evt.id)}
                      onClick={onCardClick}
                    />
                  ))}
                  {isDraggingOverThis && (
                    <div className="p-3 rounded-xl border border-dashed border-sky-400 bg-sky-50 text-sky-700 text-xs text-center font-bold animate-pulse">
                      Soltar atividade aqui
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

