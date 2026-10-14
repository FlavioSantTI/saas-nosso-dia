import React, { useState } from 'react';
import { EventItem, FamilyMember } from '../types';
import { getMemberDisplayName } from '../lib/formatters';
import { extractLiteralDate, extractLiteralTime, toLocalDateString } from '../lib/dateUtils';
import {
  Sun,
  BarChart3,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'today' | 'week';
  events: EventItem[];
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  onOpenUnassignedModal: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'today',
  events,
  members,
  currentMember,
  onOpenUnassignedModal,
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>(initialTab);

  // Membro ativo para o resumo diário (prioriza logado ou primeiro adulto)
  const defaultMember =
    currentMember ||
    members.find((m) => m.role === 'ADMIN') ||
    members.find((m) => m.role !== 'CHILD') ||
    members[0];

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    defaultMember?.id || ''
  );

  if (!isOpen) return null;

  const activeMember =
    members.find((m) => m.id === selectedMemberId) || defaultMember;

  // -------------------------------------------------------------
  // CÁLCULOS: ABA 1 - "☀️ MEU DIA HOJE"
  // -------------------------------------------------------------
  const now = new Date();
  const todayStr = toLocalDateString();

  // Eventos de Hoje comparando strings literais (evita virar o dia às 21h)
  const todayEvents = events.filter((e) => extractLiteralDate(e.start_time) === todayStr);

  // Missões do membro ativo hoje ordenadas por horário literal
  const myTodayEvents = todayEvents
    .filter((e) => e.responsible_id === activeMember?.id)
    .sort((a, b) => extractLiteralTime(a.start_time).localeCompare(extractLiteralTime(b.start_time)));

  // Saudação de acordo com o horário local
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const firstName = getMemberDisplayName(activeMember) || 'Família';
  const greeting =
    currentHour < 12
      ? `☀️ Bom dia, ${firstName}! Suas missões para hoje:`
      : currentHour < 18
      ? `🌤️ Boa tarde, ${firstName}! Suas missões para hoje:`
      : `🌙 Boa noite, ${firstName}! Suas missões para hoje:`;

  // Próximo compromisso e contagem regressiva baseados em horários nominais
  let nextEventStatus: {
    status: 'in_progress' | 'upcoming' | 'completed' | 'none';
    message: string;
    event?: EventItem;
  } = { status: 'none', message: 'Nenhuma missão agendada para hoje.' };

  if (myTodayEvents.length > 0) {
    const inProgress = myTodayEvents.find((e) => {
      const [sh, sm] = extractLiteralTime(e.start_time).split(':').map(Number);
      const [eh, em] = extractLiteralTime(e.end_time || e.start_time).split(':').map(Number);
      if (isNaN(sh) || isNaN(sm)) return false;
      const startMin = sh * 60 + sm;
      const endMin = !isNaN(eh) && !isNaN(em) ? eh * 60 + em : startMin + 60;
      return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
    });

    if (inProgress) {
      nextEventStatus = {
        status: 'in_progress',
        message: `🟢 Atividade em andamento agora: "${inProgress.title}"`,
        event: inProgress,
      };
    } else {
      const upcoming = myTodayEvents.find((e) => {
        const [sh, sm] = extractLiteralTime(e.start_time).split(':').map(Number);
        if (isNaN(sh) || isNaN(sm)) return false;
        return sh * 60 + sm > currentTotalMinutes;
      });

      if (upcoming) {
        const [sh, sm] = extractLiteralTime(upcoming.start_time).split(':').map(Number);
        const diffMinutes = (sh * 60 + sm) - currentTotalMinutes;

        const timeMsg =
          diffMinutes <= 60
            ? `⏱️ Próxima atividade em ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`
            : `⏱️ Próxima atividade às ${extractLiteralTime(upcoming.start_time)}`;

        nextEventStatus = {
          status: 'upcoming',
          message: `${timeMsg}: "${upcoming.title}"`,
          event: upcoming,
        };
      } else {
        nextEventStatus = {
          status: 'completed',
          message: '✅ Todas as suas missões de hoje foram cumpridas!',
        };
      }
    }
  }

  // O que o outro cônjuge/adulto assumiu hoje
  const otherAdults = members.filter(
    (m) => m.id !== activeMember?.id && m.role !== 'CHILD'
  );
  const spouseTodayEvents = todayEvents.filter((e) =>
    otherAdults.some((a) => a.id === e.responsible_id)
  );

  // -------------------------------------------------------------
  // CÁLCULOS: ABA 2 - "📊 BALANÇO DA SEMANA"
  // -------------------------------------------------------------
  const totalWeekEvents = events.length;

  // Divisão de carga do casal / adultos
  const adultMembers = members.filter((m) => m.role !== 'CHILD');
  const adultStats = adultMembers.map((m) => {
    const count = events.filter((e) => e.responsible_id === m.id).length;
    const percentage =
      totalWeekEvents > 0 ? Math.round((count / totalWeekEvents) * 100) : 0;
    return { member: m, count, percentage };
  });

  const unassignedEvents = events.filter((e) => !e.responsible_id);
  const unassignedCount = unassignedEvents.length;
  const unassignedPercentage =
    totalWeekEvents > 0
      ? Math.round((unassignedCount / totalWeekEvents) * 100)
      : 0;

  // Atividades por Filho / Dependente
  const childrenMembers = members.filter((m) => m.role === 'CHILD');
  const displayChildren =
    childrenMembers.length > 0 ? childrenMembers : members;

  const childStats = displayChildren.map((child) => {
    const count = events.filter((e) =>
      e.participants?.some((p) => p.id === child.id)
    ).length;
    return { child, count };
  });

  // Datas Especiais & Aniversários (eventos de dia inteiro na semana)
  const allDayEvents = events.filter((e) => e.is_all_day);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-sky-100 flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 shadow-2xs">
              {activeTab === 'today' ? (
                <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
              ) : (
                <BarChart3 className="w-5 h-5 text-sky-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Painel de Resumo Familiar
              </h2>
              <p className="text-xs text-slate-500">
                Visão operacional do dia a dia e planejamento da semana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas Principais */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl my-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>☀️</span>
            <span>Meu Dia Hoje</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('week')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📊</span>
            <span>Balanço da Semana</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* ========================================================= */}
          {/* ABA 1: ☀️ MEU DIA HOJE */}
          {/* ========================================================= */}
          {activeTab === 'today' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Seletor de Membro (Caso queira alternar a visualização) */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600">
                  Visualizando rotina de:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                  >
                    {members
                      .filter((m) => m.role !== 'CHILD')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          👤 {getMemberDisplayName(m)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Saudação e Próximo Compromisso */}
              <div className="p-4 bg-gradient-to-br from-amber-50/80 via-sky-50/50 to-white border border-amber-200/70 rounded-2xl space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{greeting}</h3>

                <div className="p-3 bg-white/90 rounded-xl border border-amber-200/60 shadow-2xs flex items-center gap-2.5 text-xs text-slate-800 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="flex-1">{nextEventStatus.message}</span>
                </div>
              </div>

              {/* Linha do Tempo Vertical das Minhas Missões Hoje */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sua Programação de Hoje ({myTodayEvents.length})</span>
                </h4>

                {myTodayEvents.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-sm font-bold text-slate-700">
                      🎉 Nenhuma missão sob sua responsabilidade hoje!
                    </p>
                    <p className="text-xs text-slate-500">
                      Aproveite o dia livre ou confira as atividades dos outros familiares.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-200">
                    {myTodayEvents.map((event) => {
                      const startTimeStr = extractLiteralTime(event.start_time);
                      const endTimeStr = extractLiteralTime(event.end_time);

                      const [endH, endM] = extractLiteralTime(event.end_time || event.start_time).split(':').map(Number);
                      const isPassed = !isNaN(endH) && !isNaN(endM) && (endH * 60 + endM) < currentTotalMinutes;

                      return (
                        <div
                          key={event.id}
                          className={`relative p-3.5 rounded-2xl border transition-all ${
                            isPassed
                              ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-75'
                              : 'bg-white border-sky-100 shadow-2xs hover:border-sky-300'
                          }`}
                        >
                          {/* Marcador na linha do tempo */}
                          <div
                            className={`absolute -left-[1.35rem] top-4 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                              isPassed ? 'bg-slate-400' : 'bg-sky-600'
                            }`}
                          />

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                                  {startTimeStr} - {endTimeStr}
                                </span>
                                {event.is_all_day && (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                    Dia Todo
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 mt-1">
                                {event.title}
                              </h5>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                            {event.location && (
                              <div className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{event.location.name}</span>
                              </div>
                            )}

                            {event.participants && event.participants.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-[11px]">
                                  Participante:
                                </span>
                                {event.participants.map((p) => (
                                  <span
                                    key={p.id}
                                    className="px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs"
                                    style={{
                                      backgroundColor: `${p.color}15`,
                                      borderColor: `${p.color}40`,
                                      color: p.color,
                                    }}
                                  >
                                    ● {p.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tranquilidade Familiar (O que o outro cônjuge assumiu hoje) */}
              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Tranquilidade Familiar (Cônjuge Hoje)</span>
                </h4>

                {spouseTodayEvents.length === 0 ? (
                  <p className="text-xs text-sky-700 italic">
                    Nenhum compromisso atribuído ao cônjuge para a data de hoje.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {spouseTodayEvents.map((ev) => {
                      const startTime = extractLiteralTime(ev.start_time);
                      const respName = getMemberDisplayName(ev.responsible) || 'Cônjuge';
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 bg-white/90 rounded-xl border border-sky-200/80 text-xs text-slate-700 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-sky-800">
                              ℹ️ {respName} cuida de:
                            </span>{' '}
                            <span className="font-semibold text-slate-900">
                              {ev.title}
                            </span>
                            {ev.location && (
                              <span className="text-slate-500 text-[11px] ml-1.5 inline-flex items-center gap-0.5">
                                • 📍 {ev.location.name}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                            {startTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: 📊 BALANÇO DA SEMANA */}
          {/* ========================================================= */}
          {activeTab === 'week' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Card de Métricas Gerais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total na Semana
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    {totalWeekEvents}{' '}
                    <span className="text-xs font-semibold text-slate-500">
                      atividades
                    </span>
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Sem Responsável
                  </span>
                  <span
                    className={`text-xl font-extrabold mt-1 block ${
                      unassignedCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {unassignedCount}{' '}
                    <span className="text-xs font-semibold text-slate-500">
                      pendentes
                    </span>
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Dias Especiais
                  </span>
                  <span className="text-xl font-extrabold text-purple-700 mt-1 block">
                    {allDayEvents.length}{' '}
                    <span className="text-xs font-semibold text-slate-500">
                      eventos
                    </span>
                  </span>
                </div>
              </div>

              {/* Divisão da Logística (Carga do Casal) */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>⚖️ Divisão da Logística (Carga do Casal)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {totalWeekEvents} compromissos
                  </span>
                </h4>

                {/* Barra Segmentada Comparativa */}
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
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

                {/* Legenda com Números */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {adultStats.map(({ member, count, percentage }) => (
                    <div key={member.id} className="flex items-center gap-1.5 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="text-slate-800 font-bold">{getMemberDisplayName(member)}:</span>
                      <span className="text-slate-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  ))}
                  {unassignedCount > 0 && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-amber-800 font-bold">Sem Responsável:</span>
                      <span className="text-amber-700">
                        {unassignedCount} ({unassignedPercentage}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Pendências & Atribuição Rápida */}
              {unassignedCount > 0 ? (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-950">
                        {unassignedCount} atividade{unassignedCount === 1 ? '' : 's'} sem responsável definido
                      </h5>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Defina quem leva ou busca para evitar imprevistos e sobrecargas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUnassignedModal();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Atribuir Agora</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    🎉 Tudo sob controle! Todas as atividades desta semana possuem responsável definido.
                  </span>
                </div>
              )}

              {/* Atividades por Filho / Participante */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  👶 Atividades por Filho / Dependente
                </h4>

                <div className="space-y-2.5">
                  {childStats.map(({ child, count }) => {
                    const percent =
                      totalWeekEvents > 0
                        ? Math.min(Math.round((count / totalWeekEvents) * 100), 100)
                        : 0;

                    return (
                      <div key={child.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: child.color }}
                            />
                            <span className="font-bold text-slate-900">{getMemberDisplayName(child)}</span>
                          </div>
                          <span className="text-slate-600 font-semibold">
                            {count} atividade{count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${percent}%`,
                              backgroundColor: child.color,
                            }}
                            className="h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Datas Especiais & Aniversários */}
              <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2.5">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Datas Especiais & Aniversários</span>
                </h4>

                {allDayEvents.length === 0 ? (
                  <p className="text-xs text-purple-700 italic">
                    Nenhum aniversário ou evento de dia inteiro nesta semana.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {allDayEvents.map((ev) => {
                      const dateParts = extractLiteralDate(ev.start_time).split('-');
                      const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : '--/--';
                      const isBirthday =
                        ev.title.toLowerCase().includes('aniversário') ||
                        ev.title.toLowerCase().includes('aniversario') ||
                        ev.title.toLowerCase().includes('niver');

                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 bg-white/90 rounded-xl border border-purple-200/80 text-xs text-purple-950 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span>{isBirthday ? '🎂' : '📌'}</span>
                            <span className="font-bold">{ev.title}</span>
                          </div>
                          <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold text-[11px]">
                            {dateFormatted}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
