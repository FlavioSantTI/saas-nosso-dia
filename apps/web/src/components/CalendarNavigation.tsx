import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export type CalendarViewMode = 'day' | 'week' | 'month';

interface CalendarNavigationProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function formatTitle(currentDate: Date, viewMode: CalendarViewMode): string {
  if (viewMode === 'month') {
    const month = MONTH_NAMES[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    return `${month} de ${year}`;
  }

  if (viewMode === 'day') {
    const weekday = WEEKDAY_FULL[currentDate.getDay()];
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    return `${weekday}, ${day} de ${month} de ${year}`;
  }

  // Modo Semana (Segunda a Domingo)
  const monday = getMonday(currentDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDay = String(monday.getDate()).padStart(2, '0');
  const endDay = String(sunday.getDate()).padStart(2, '0');
  const startMonth = MONTH_NAMES[monday.getMonth()];
  const endMonth = MONTH_NAMES[sunday.getMonth()];
  const startYear = monday.getFullYear();
  const endYear = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth() && startYear === endYear) {
    return `Semana de ${startDay} a ${endDay} de ${startMonth}, ${startYear}`;
  } else if (startYear === endYear) {
    return `Semana de ${startDay} de ${startMonth} a ${endDay} de ${endMonth}, ${startYear}`;
  } else {
    return `Semana de ${startDay}/${startMonth}/${startYear} a ${endDay}/${endMonth}/${endYear}`;
  }
}

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
}) => {
  const title = formatTitle(currentDate, viewMode);

  // Verifica se currentDate é hoje
  const today = new Date();
  const isToday =
    today.getDate() === currentDate.getDate() &&
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xs p-3 sm:px-4 sm:py-3 rounded-2xl border border-sky-100/90 shadow-2xs mb-4">
      {/* Controles de Data e Título */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-sky-100 hover:bg-sky-50 text-slate-700 shadow-2xs hover:text-slate-900 transition-colors cursor-pointer"
            title="Período anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className={`px-3 py-1.5 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
              isToday
                ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                : 'bg-white border-sky-100 hover:bg-sky-50 text-slate-700'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={onNext}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-sky-100 hover:bg-sky-50 text-slate-700 shadow-2xs hover:text-slate-900 transition-colors cursor-pointer"
            title="Próximo período"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight select-none flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sky-600 hidden sm:inline" />
          <span>{title}</span>
        </h2>
      </div>

      {/* Segmented Control de Modos de Visualização (Estilo macOS / iOS) */}
      <div className="flex items-center justify-end">
        <div className="inline-flex bg-slate-200/50 p-1 rounded-xl gap-1 w-full sm:w-auto border border-slate-200/40">
          <button
            type="button"
            onClick={() => onViewModeChange('day')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('week')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('month')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Mês
          </button>
        </div>
      </div>
    </div>
  );
};

