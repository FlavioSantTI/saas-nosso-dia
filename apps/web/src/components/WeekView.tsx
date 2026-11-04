import React, { useState, useEffect } from 'react';
import { EventItem, FamilyMember } from '../types';
import { ActivityCard } from './ActivityCard';
import { getMonday } from './CalendarNavigation';
import { Sun, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from 'lucide-react';
import { toLocalDateString, extractLiteralDate, extractLiteralTime } from '../lib/dateUtils';

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
  members: _members,
  selectedMemberId,
  onCardClick,
  onMoveEvent,
}) => {
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [mobileMode, setMobileMode] = useState<'day' | 'all'>('day');

  const todayDateStr = toLocalDateString();
  const monday = getMonday(currentDate);

  const weekdayConfig = [
    { label: 'Segunda', shortLabel: 'Seg', dayOfWeek: 1, offset: 0 },
    { label: 'Terça', shortLabel: 'Ter', dayOfWeek: 2, offset: 1 },
    { label: 'Quarta', shortLabel: 'Qua', dayOfWeek: 3, offset: 2 },
    { label: 'Quinta', shortLabel: 'Qui', dayOfWeek: 4, offset: 3 },
    { label: 'Sexta', shortLabel: 'Sex', dayOfWeek: 5, offset: 4 },
    { label: 'Sábado', shortLabel: 'Sáb', dayOfWeek: 6, offset: 5 },
    { label: 'Domingo', shortLabel: 'Dom', dayOfWeek: 0, offset: 6 },
  ];

  const days = weekdayConfig.map((item) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + item.offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      label: item.label,
      shortLabel: item.shortLabel,
      dayOfWeek: item.dayOfWeek,
      dateStr: `${y}-${m}-${day}`,
      shortDate: `${day}/${m}`,
      dayNumber: day,
    };
  });

  // Determina o índice padrão do dia (hoje se estiver na semana visível, senão 0)
  const initialIndex = days.findIndex((d) => d.dateStr === todayDateStr);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);

  // Atualiza dia focado quando a data de referência mudar
  useEffect(() => {
    const idx = days.findIndex((d) => d.dateStr === todayDateStr);
    setSelectedDayIndex(idx >= 0 ? idx : 0);
  }, [currentDate]);

  // Filtro de membro
  const filteredEvents = selectedMemberId
    ? events.filter(
        (e) =>
          e.participants?.some((p) => p.id === selectedMemberId) ||
          e.responsible_id === selectedMemberId
      )
    : events;

  // Detecção de conflito: mesmo responsável em horários sobrepostos
  const detectConflicts = (dayEvents: EventItem[]) => {
    const conflictIds = new Set<string>();
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const e1 = dayEvents[i];
        const e2 = dayEvents[j];
        if (e1.responsible_id && e1.responsible_id === e2.responsible_id && !e1.is_all_day && !e2.is_all_day) {
          const [s1H, s1M] = extractLiteralTime(e1.start_time).split(':').map(Number);
          const [e1H, e1M] = extractLiteralTime(e1.end_time || e1.start_time).split(':').map(Number);
          const [s2H, s2M] = extractLiteralTime(e2.start_time).split(':').map(Number);
          const [e2H, e2M] = extractLiteralTime(e2.end_time || e2.start_time).split(':').map(Number);
          const t1Start = s1H * 60 + s1M;
          const t1End = !isNaN(e1H) && !isNaN(e1M) ? e1H * 60 + e1M : t1Start + 60;
          const t2Start = s2H * 60 + s2M;
          const t2End = !isNaN(e2H) && !isNaN(e2M) ? e2H * 60 + e2M : t2Start + 60;
          if (t1Start < t2End && t2Start < t1End) {
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

  // Helper para renderizar a coluna de um dia específico
  const renderDayColumn = (day: typeof days[0], isCompactMobile: boolean = false) => {
    const dayEvents = filteredEvents
      .filter((e) => extractLiteralDate(e.start_time) === day.dateStr)
      .sort((a, b) => extractLiteralTime(a.start_time).localeCompare(extractLiteralTime(b.start_time)));

    const conflictIds = detectConflicts(dayEvents);
    const isDraggingOverThis = dragOverDay === day.dayOfWeek;
    const isToday = day.dateStr === todayDateStr;

    return (
      <div
        key={day.label}
        onDragOver={(e) => handleDragOver(e, day.dayOfWeek)}
        onDragLeave={(e) => handleDragLeave(e, day.dayOfWeek)}
        onDrop={(e) => handleDrop(e, day.dateStr)}
        className={`rounded-2xl p-3.5 border flex flex-col transition-all duration-150 shadow-2xs ${
          isCompactMobile ? 'min-h-[300px]' : 'min-h-[500px]'
        } ${
          isDraggingOverThis
            ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300 ring-dashed scale-[1.01]'
            : isToday
            ? 'border-sky-300 ring-2 ring-sky-100 bg-white/95 shadow-xs'
            : 'bg-white/80 border-sky-100/90'
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
            <span className="text-[11px] text-slate-500 font-semibold">{day.shortDate}</span>
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
              className={`h-full flex flex-col items-center justify-center text-xs rounded-xl border border-dashed transition-colors py-10 px-2 text-center gap-2 ${
                isDraggingOverThis
                  ? 'border-sky-400 text-sky-600 font-bold bg-white/60'
                  : 'border-transparent text-slate-400 font-medium'
              }`}
            >
              {isDraggingOverThis ? (
                'Solte aqui para mover'
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shadow-2xs">
                    <Sun className="w-5 h-5" />
                  </div>
                  <span className="text-slate-600 font-semibold text-xs leading-tight max-w-[200px]">
                    Nenhum compromisso agendado. Aproveite o tempo em família! ☀️
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
  };

  const activeDay = days[selectedDayIndex] || days[0];

  return (
    <div className="w-full">
      {/* 📱 MODO MOBILE (< 768px): Fita Horizontal de Dias (Date Strip) e Dia Focado */}
      <div className="block md:hidden space-y-3">
        {/* Fita de Dias da Semana (Date Strip) */}
        <div className="bg-white/95 backdrop-blur-xs p-2 rounded-2xl border border-sky-100 shadow-2xs">
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = idx === selectedDayIndex;
              const isToday = day.dateStr === todayDateStr;
              const dayEvents = filteredEvents.filter(
                (e) => extractLiteralDate(e.start_time) === day.dateStr
              );
              const dayEventCount = dayEvents.length;
              const participantColors = Array.from(
                new Set(dayEvents.flatMap((e) => (e.participants || []).map((p) => p.color)))
              ).slice(0, 3);

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    setMobileMode('day');
                  }}
                  className={`flex flex-col items-center justify-center py-2 px-1 min-h-[54px] rounded-xl transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs font-bold'
                      : isToday
                      ? 'bg-sky-50 text-sky-900 border border-sky-200 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <span className="text-[11px] uppercase font-bold tracking-tight opacity-90">
                    {day.shortLabel}
                  </span>
                  <span className="text-sm font-extrabold my-0.5">{day.dayNumber}</span>
                  {participantColors.length > 0 ? (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {participantColors.map((color, cIdx) => (
                        <span
                          key={cIdx}
                          className="w-1.5 h-1.5 rounded-full shadow-2xs"
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : color }}
                        />
                      ))}
                    </div>
                  ) : dayEventCount > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-amber-300' : isToday ? 'bg-sky-600' : 'bg-slate-500'
                      }`}
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Barra de Ações Rápidas do Dia (Navegar < > ou Alternar para Ver Todos) */}
          <div className="flex items-center justify-between pt-2 px-1 border-t border-slate-100 mt-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                disabled={selectedDayIndex === 0}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
                title="Dia anterior"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <span className="font-bold text-slate-900 text-xs sm:text-sm px-1.5">
                {activeDay.label}, {activeDay.shortDate}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev) => Math.min(6, prev + 1))}
                disabled={selectedDayIndex === 6}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
                title="Próximo dia"
                aria-label="Próximo dia"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMode(mobileMode === 'day' ? 'all' : 'day')}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-sky-50 text-sky-900 hover:bg-sky-100 text-xs font-bold border border-sky-200 transition-colors cursor-pointer shadow-2xs"
            >
              {mobileMode === 'day' ? (
                <>
                  <LayoutGrid className="w-4 h-4 text-sky-700" />
                  <span>Ver 7 dias</span>
                </>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4 text-sky-700" />
                  <span>Dia Focado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Exibição Mobile do Conteúdo */}
        {mobileMode === 'day' ? (
          <div>{renderDayColumn(activeDay, true)}</div>
        ) : (
          <div className="space-y-3">
            {days.map((day) => renderDayColumn(day, true))}
          </div>
        )}
      </div>

      {/* 🖥️ MODO DESKTOP / TABLET (>= 768px): Grade Clássica de 7 Colunas */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {days.map((day) => renderDayColumn(day, false))}
      </div>
    </div>
  );
};
