import React, { useState, useMemo, useEffect } from 'react';
import { EventItem, FamilyMember } from '../types';
import { getMemberDisplayName } from '../lib/formatters';
import {
  extractLiteralTime,
  extractLiteralDate,
  toLocalDateString,
  FAMILY_TIMEZONE,
} from '../lib/dateUtils';
import { supabase } from '../lib/supabase';
import {
  Clock,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface DailyBriefingCardProps {
  familyId?: string;
  events: EventItem[];
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  onCardClick?: (event: EventItem) => void;
  onOpenSummary?: (tab?: 'today' | 'week') => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  familyId,
  events,
  members,
  currentMember,
  onCardClick,
  onOpenSummary,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [rpcEvents, setRpcEvents] = useState<EventItem[] | null>(null);

  // Identifica o membro ativo (preferencialmente logado ou primeiro adulto)
  const activeMember = useMemo(() => {
    if (currentMember) return currentMember;
    const firstAdult = members.find((m) => m.role !== 'CHILD');
    return firstAdult || members[0] || null;
  }, [currentMember, members]);

  // Data atual de referência no relógio local (evita sumiço às 21h)
  const todayStr = useMemo(() => toLocalDateString(), []);

  // Saudação de acordo com o turno no fuso local
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Bom dia';
    if (hour < 18) return '🌤️ Boa tarde';
    return '🌙 Boa noite';
  }, []);

  // Data por extenso no fuso de Palmas: "Hoje é [Dia da semana], [Dia] de [Mês]"
  const formattedToday = useMemo(() => {
    const todayDate = new Date();
    try {
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: FAMILY_TIMEZONE }).format(todayDate);
      const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: FAMILY_TIMEZONE }).format(todayDate);
      const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: FAMILY_TIMEZONE }).format(todayDate);
      const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return `Hoje é ${capWeekday}, ${day} de ${month}`;
    } catch {
      return `Hoje, ${todayStr}`;
    }
  }, [todayStr]);

  // Consumo da RPC rpc_get_family_daily_briefing com fallback gracioso
  useEffect(() => {
    let isMounted = true;
    if (!familyId) return;

    async function loadBriefingFromRpc() {
      try {
        const { data, error } = await supabase.rpc('rpc_get_family_daily_briefing', {
          p_family_id: familyId,
          p_target_date: todayStr,
        });

        if (error) {
          // Erro esperado se anônimo ou sem permissão na RPC, fallback local
          return;
        }

        if (data && isMounted) {
          // RPC pode retornar array de atividades ou objeto com lista
          let rawList: any[] = [];
          if (Array.isArray(data)) {
            rawList = data;
          } else if (Array.isArray((data as any).events)) {
            rawList = (data as any).events;
          } else if (Array.isArray((data as any).activities)) {
            rawList = (data as any).activities;
          }

          if (rawList.length > 0) {
            // Mapeia eventos da RPC mantendo referências e integridade com o estado local
            const mappedEvents: EventItem[] = rawList.map((item: any) => {
              const matchedLocal = events.find((e) => e.id === item.id);
              return {
                id: item.id || matchedLocal?.id || `rpc_${Math.random()}`,
                family_id: item.family_id || familyId,
                routine_id: item.routine_id || matchedLocal?.routine_id,
                title: item.title || matchedLocal?.title || 'Atividade',
                start_time: item.start_time || matchedLocal?.start_time || new Date().toISOString(),
                end_time: item.end_time || matchedLocal?.end_time || new Date().toISOString(),
                is_all_day: item.is_all_day !== undefined ? item.is_all_day : (matchedLocal?.is_all_day || false),
                location_id: item.location_id || matchedLocal?.location_id,
                responsible_id: item.responsible_id || matchedLocal?.responsible_id,
                status: item.status || matchedLocal?.status || 'SCHEDULED',
                notes: item.notes || matchedLocal?.notes,
                reminder_minutes: item.reminder_minutes !== undefined ? item.reminder_minutes : matchedLocal?.reminder_minutes,
                location: item.location || (item.location_name ? { id: item.location_id || '', family_id: familyId, name: item.location_name } : matchedLocal?.location),
                responsible: item.responsible || matchedLocal?.responsible || (item.responsible_id ? members.find((m) => m.id === item.responsible_id) : null),
                participants: item.participants && Array.isArray(item.participants) && item.participants.length > 0 && typeof item.participants[0] === 'object'
                  ? item.participants
                  : matchedLocal?.participants || (item.participant_ids ? members.filter((m) => item.participant_ids.includes(m.id)) : []),
              };
            });
            setRpcEvents(mappedEvents);
          }
        }
      } catch (err) {
        console.warn('Fallback para briefing local:', err);
      }
    }

    loadBriefingFromRpc();

    return () => {
      isMounted = false;
    };
  }, [familyId, todayStr, events, members]);

  // Filtra eventos de HOJE considerando a data nominal/literal
  const localTodayEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.start_time) return false;
      return extractLiteralDate(e.start_time) === todayStr;
    });
  }, [events, todayStr]);

  // Se a RPC retornou eventos válidos, usa-os; caso contrário, usa o filtro local
  const todayEvents = useMemo(() => {
    if (rpcEvents && rpcEvents.length > 0) {
      return rpcEvents;
    }
    return localTodayEvents;
  }, [rpcEvents, localTodayEvents]);

  // Atividades de HOJE sob a responsabilidade do membro ativo
  const myTodayEvents = useMemo(() => {
    if (!activeMember) return [];
    return todayEvents
      .filter((e) => e.responsible_id === activeMember.id)
      .sort((a, b) => (a.start_time > b.start_time ? 1 : -1));
  }, [todayEvents, activeMember]);

  // Próxima atividade próxima do horário atual (nas próximas horas) usando horários literais
  const nextActivity = useMemo(() => {
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    for (const ev of myTodayEvents) {
      if (ev.is_all_day) continue;
      const [h, m] = extractLiteralTime(ev.start_time).split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      const evTotalMinutes = h * 60 + m;
      const diffMinutes = evTotalMinutes - currentTotalMinutes;
      if (diffMinutes >= 0 && diffMinutes <= 360) {
        return {
          event: ev,
          diffMinutes,
        };
      }
    }
    return null;
  }, [myTodayEvents]);

  // Atividades sob responsabilidade do outro cônjuge/parceiro hoje
  const spouseInfo = useMemo(() => {
    if (!activeMember) return null;
    const otherAdults = members.filter(
      (m) => m.role !== 'CHILD' && m.id !== activeMember.id
    );
    if (otherAdults.length === 0) return null;

    const spouse = otherAdults[0];
    const spouseEvents = todayEvents.filter((e) => e.responsible_id === spouse.id);

    if (spouseEvents.length === 0) return null;

    return {
      spouse,
      events: spouseEvents,
    };
  }, [activeMember, members, todayEvents]);

  const displayName = getMemberDisplayName(activeMember) || 'Família';

  return (
    <div className="mb-5 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 border border-sky-200/80 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300">
      {/* Decoração sutil de fundo */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-200/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-sky-200/20 rounded-full blur-xl pointer-events-none" />

      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-800 border border-amber-200 flex items-center justify-center text-lg shadow-2xs shrink-0">
            ☀️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-tight">
                {greeting}, {displayName}!
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200/60 hidden sm:inline-block">
                Briefing Matinal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {formattedToday}
            </p>
          </div>
        </div>

        {/* Botão Recolher/Expandir */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenSummary && (
            <button
              type="button"
              onClick={() => onOpenSummary('today')}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 px-2.5 py-1.5 rounded-xl hover:bg-sky-100/60 transition-colors hidden md:inline-flex items-center gap-1 cursor-pointer"
              title="Abrir Resumo Completo"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Ver Completo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title={isCollapsed ? 'Expandir Briefing' : 'Recolher Briefing'}
            aria-label={isCollapsed ? 'Expandir Briefing' : 'Recolher Briefing'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {!isCollapsed && (
        <div className="mt-4 pt-3.5 border-t border-sky-100/80 space-y-3 relative z-10 animate-in fade-in duration-200">
          {/* Próximo Compromisso / Saída nas próximas horas */}
          {nextActivity && (
            <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-base animate-pulse">⏱️</span>
                <span>
                  <strong>Próxima saída:</strong> em <strong>{nextActivity.diffMinutes} minutos</strong> —{' '}
                  <span className="font-semibold">{nextActivity.event.title}</span>
                  {nextActivity.event.location?.name && (
                    <span className="text-amber-900/90 font-medium ml-1.5 inline-flex items-center text-[11px] bg-amber-100/80 px-2 py-0.5 rounded-md">
                      • 📍 {nextActivity.event.location.name}
                    </span>
                  )}
                  .
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCardClick?.(nextActivity.event)}
                className="font-bold text-amber-900 underline hover:text-amber-950 shrink-0 cursor-pointer text-[11px]"
              >
                Ver detalhes
              </button>
            </div>
          )}

          {/* Relatório de Atividades do Membro Ativo */}
          {myTodayEvents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Hoje você tem <strong>{myTodayEvents.length} atividade(s)</strong> sob sua responsabilidade:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {myTodayEvents.map((ev) => {
                  const startTimeStr = ev.is_all_day
                    ? 'Dia Inteiro'
                    : extractLiteralTime(ev.start_time);
                  const participantNames =
                    ev.participants && ev.participants.length > 0
                      ? ev.participants.map((p) => getMemberDisplayName(p)).join(', ')
                      : null;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onCardClick?.(ev)}
                      className="bg-white/90 hover:bg-white border border-sky-100 hover:border-sky-300 rounded-2xl p-2.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" />
                          {startTimeStr}
                        </span>
                        {ev.location?.name && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5 truncate max-w-[110px]" title={ev.location.name}>
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.location.name}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-sky-700 transition-colors flex items-center flex-wrap gap-1">
                        <span>{ev.title}</span>
                        {ev.location?.name && (
                          <span className="text-[10px] font-normal text-slate-400">
                            • 📍 {ev.location.name}
                          </span>
                        )}
                      </h4>
                      {participantNames && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                          <Users className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{participantNames}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-900 shadow-2xs">
              <span className="text-base">🎉</span>
              <span>
                <strong>Nenhuma atividade sob sua responsabilidade hoje!</strong> Aproveite o dia livre.
              </span>
            </div>
          )}

          {/* Visão Compartilhada da Casa (Paz de Espírito com o Cônjuge) */}
          {spouseInfo && spouseInfo.events.length > 0 && (
            <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-2.5 px-3 flex items-center justify-between flex-wrap gap-2 text-xs text-sky-950">
              <div className="flex items-center gap-2">
                <span className="text-sm">ℹ️</span>
                <span>
                  <strong>A {getMemberDisplayName(spouseInfo.spouse)} cuida de:</strong>{' '}
                  {spouseInfo.events
                    .map((e) => {
                      const t = e.is_all_day
                        ? 'Dia Inteiro'
                        : extractLiteralTime(e.start_time);
                      const locStr = e.location?.name ? ` • 📍 ${e.location.name}` : '';
                      return `${e.title}${locStr} às ${t}`;
                    })
                    .join(' • ')}
                  .
                </span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-white/80 px-2 py-0.5 rounded-full border border-sky-200">
                Parceria Ativa
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
