import React from 'react';
import { EventItem, FamilyMember } from '../types';
import { getMemberDisplayName } from '../lib/formatters';
import { extractLiteralDate, extractLiteralTime, toLocalDateString } from '../lib/dateUtils';
import { getMonday } from './CalendarNavigation';
import {
  BarChart3,
  Scale,
  AlertTriangle
} from 'lucide-react';

interface BalanceViewProps {
  events: EventItem[];
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  currentDate?: Date;
  onOpenUnassignedModal: () => void;
  onCardClick?: (event: EventItem) => void;
}

export const BalanceView: React.FC<BalanceViewProps> = ({
  events,
  members,
  currentMember: _currentMember,
  currentDate = new Date(),
  onOpenUnassignedModal,
  onCardClick,
}) => {
  const monday = getMonday(currentDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startMondayStr = toLocalDateString(monday);
  const endSundayStr = toLocalDateString(sunday);

  // Filtra eventos da semana visível
  const weekEvents = events.filter((e) => {
    const dStr = extractLiteralDate(e.start_time);
    return dStr >= startMondayStr && dStr <= endSundayStr;
  });

  const totalWeekEvents = weekEvents.length;

  // Atividades sem responsável
  const unassignedEvents = weekEvents.filter((e) => !e.responsible_id);
  const unassignedCount = unassignedEvents.length;
  const unassignedPercentage =
    totalWeekEvents > 0 ? Math.round((unassignedCount / totalWeekEvents) * 100) : 0;

  // Adultos e Responsáveis
  const adultMembers = members.filter((m) => m.role !== 'CHILD');

  const adultStats = adultMembers.map((member) => {
    const memberEvents = weekEvents.filter((e) => e.responsible_id === member.id);
    const count = memberEvents.length;
    const percentage = totalWeekEvents > 0 ? Math.round((count / totalWeekEvents) * 100) : 0;

    // Calcula tempo total estimado em minutos
    let totalMinutes = 0;
    memberEvents.forEach((ev) => {
      if (ev.is_all_day) return;
      const [sh, sm] = extractLiteralTime(ev.start_time).split(':').map(Number);
      const [eh, em] = extractLiteralTime(ev.end_time || ev.start_time).split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) {
        const startMin = sh * 60 + sm;
        const endMin = !isNaN(eh) && !isNaN(em) ? eh * 60 + em : startMin + 60;
        totalMinutes += Math.max(15, endMin - startMin);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      member,
      count,
      percentage,
      hours,
      mins,
      events: memberEvents,
    };
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in">
      {/* Cabeçalho do Balanço */}
      <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-600" />
            <span>Balanço & Equilíbrio da Semana</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semana de {monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a{' '}
            {sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • Divisão de tarefas familiares
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
          📋 {totalWeekEvents} atividades no total
        </span>
      </div>

      {/* Alerta de Atividades Sem Responsável */}
      {unassignedCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Há {unassignedCount} atividade(s) sem responsável definido
              </p>
              <p className="text-[11px] text-amber-800/80">
                Evite esquecimentos atribuindo quem vai levar ou buscar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUnassignedModal}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
          >
            Atribuir Agora
          </button>
        </div>
      )}

      {/* Gráfico de Barra Comparativa */}
      <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            Divisão da Logística (Carga Familiar)
          </span>
          <span className="text-slate-500 font-semibold">{totalWeekEvents} compromissos</span>
        </div>

        {/* Barra de Progresso Segmentada */}
        <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {adultStats.map(({ member, percentage }) => (
            <div
              key={member.id}
              style={{
                width: `${percentage}%`,
                backgroundColor: member.color,
              }}
              className="h-full transition-all duration-500"
              title={`${getMemberDisplayName(member)}: ${percentage}%`}
            />
          ))}
          {unassignedCount > 0 && (
            <div
              style={{ width: `${unassignedPercentage}%` }}
              className="h-full bg-amber-400 transition-all duration-500"
              title={`Sem Responsável: ${unassignedPercentage}%`}
            />
          )}
        </div>

        {/* Legenda Informativa com Porcentagens */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          {adultStats.map(({ member, count, percentage }) => (
            <div key={member.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shadow-2xs shrink-0"
                style={{ backgroundColor: member.color }}
              />
              <span className="text-slate-900 font-bold">{getMemberDisplayName(member)}:</span>
              <span className="text-slate-600 font-semibold">
                {count} missões ({percentage}%)
              </span>
            </div>
          ))}
          {unassignedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-2xs shrink-0" />
              <span className="text-amber-900 font-bold">Sem Responsável:</span>
              <span className="text-amber-800 font-semibold">
                {unassignedCount} ({unassignedPercentage}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Detalhe por Adulto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {adultStats.map(({ member, count, percentage, hours, mins, events: memberEvents }) => (
          <div
            key={member.id}
            className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{getMemberDisplayName(member)}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {member.role === 'ADMIN' ? 'Administrador da Família' : 'Membro Adulto'}
                  </p>
                </div>
              </div>
              <span
                className="text-sm font-extrabold px-2.5 py-1 rounded-xl shadow-2xs"
                style={{
                  backgroundColor: `${member.color}15`,
                  color: member.color,
                }}
              >
                {percentage}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Missões</span>
                <span className="text-lg font-extrabold text-slate-800 mt-0.5 block">{count}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Estimado</span>
                <span className="text-lg font-extrabold text-slate-800 mt-0.5 block">
                  {hours}h{mins > 0 ? ` ${mins}m` : ''}
                </span>
              </div>
            </div>

            {/* Lista dos Próximos Compromissos do Membro */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Principais Atividades:
              </span>
              {memberEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Nenhuma atividade nesta semana.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {memberEvents.slice(0, 5).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onCardClick && onCardClick(ev)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-sky-50/80 border border-slate-100 hover:border-sky-200 transition-colors text-xs flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 truncate group-hover:text-sky-800">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {extractLiteralDate(ev.start_time).split('-').reverse().slice(0, 2).join('/')} •{' '}
                          {extractLiteralTime(ev.start_time)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-sky-600 ml-2">
                        Ver →
                      </span>
                    </div>
                  ))}
                  {memberEvents.length > 5 && (
                    <p className="text-[11px] text-center text-slate-400 font-semibold pt-1">
                      + {memberEvents.length - 5} outras atividades
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
