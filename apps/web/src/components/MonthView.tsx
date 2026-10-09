import React from 'react';
import { EventItem, FamilyMember } from '../types';

interface MonthViewProps {
  currentDate: Date;
  events: EventItem[];
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectDate: (date: Date) => void;
  onCardClick?: (event: EventItem) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  selectedMemberId,
  onSelectDate,
  onCardClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Dias da semana (cabeçalho)
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Primeiro dia do mês (dia da semana: 0 a 6)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Total de dias no mês
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Dias do mês anterior para preenchimento
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Filtro de membro
  const memberFiltered = selectedMemberId
    ? events.filter(
        (e) =>
          e.participants?.some((p) => p.id === selectedMemberId) ||
          e.responsible_id === selectedMemberId
      )
    : events;

  // Mapa de eventos por data "YYYY-MM-DD"
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, EventItem[]>();
    memberFiltered.forEach((e) => {
      const d = new Date(e.start_time);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(e);
    });
    return map;
  }, [memberFiltered]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Montagem da grade
  const calendarCells: Array<{
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    dateKey: string;
  }> = [];

  // Dias do mês anterior
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const d = new Date(year, month - 1, dayNum);
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    calendarCells.push({
      date: d,
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateKey: `${d.getFullYear()}-${mStr}-${dStr}`,
    });
  }

  // Dias do mês atual
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(i).padStart(2, '0');
    calendarCells.push({
      date: d,
      dayNumber: i,
      isCurrentMonth: true,
      dateKey: `${year}-${mStr}-${dStr}`,
    });
  }

  // Dias do próximo mês para completar semanas de 7
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(i).padStart(2, '0');
    calendarCells.push({
      date: d,
      dayNumber: i,
      isCurrentMonth: false,
      dateKey: `${d.getFullYear()}-${mStr}-${dStr}`,
    });
  }

  return (
    <div className="bg-white/85 backdrop-blur-xs rounded-3xl border border-sky-100/90 shadow-2xs p-4 sm:p-6 overflow-hidden">
      {/* Cabeçalho dos Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
        {weekDays.map((wd) => (
          <div key={wd} className="py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Grade de Dias do Mês */}
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateKey) || [];
          const isTodayCell = isCurrentMonth && cell.isCurrentMonth && today.getDate() === cell.dayNumber;

          // Coleta de cores únicas dos participantes das atividades do dia
          const participantColors = new Set<string>();
          dayEvents.forEach((ev) => {
            ev.participants?.forEach((p) => {
              if (p.color) participantColors.add(p.color);
            });
            if (ev.responsible?.color) {
              participantColors.add(ev.responsible.color);
            }
          });

          return (
            <div
              key={cell.dateKey}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[95px] sm:min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                cell.isCurrentMonth
                  ? isTodayCell
                    ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-200 shadow-2xs'
                    : 'bg-white/90 border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-2xs'
                  : 'bg-slate-100/40 border-slate-100 text-slate-400 hover:bg-slate-100/70'
              }`}
            >
              {/* Topo do dia */}
              <div className="flex items-center justify-between">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isTodayCell
                      ? 'bg-sky-600 text-white shadow-xs'
                      : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-sky-100 text-sky-800 shadow-2xs">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Lista compacta de atividades ou pontos coloridos */}
              <div className="space-y-1 my-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(ev);
                    }}
                    className="text-[10px] truncate px-1.5 py-0.5 rounded-md bg-white border border-slate-200/80 font-medium text-slate-700 hover:text-sky-700 shadow-2xs flex items-center gap-1"
                    title={ev.title}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: ev.responsible?.color || '#64748B' }}
                    />
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-500 text-right pr-1">
                    +{dayEvents.length - 2} mais
                  </div>
                )}
              </div>

              {/* Indicadores de cores dos participantes */}
              <div className="flex items-center gap-1 pt-1 overflow-hidden h-3">
                {Array.from(participantColors).map((color, idx) => (
                  <span
                    key={idx}
                    className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
