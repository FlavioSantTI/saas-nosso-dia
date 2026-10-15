import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DailyBriefingItem } from '../types';
import {
  extractLiteralDate,
  extractLiteralTime,
  getLocalDateString,
  shiftDateString,
  getFriendlyDateLabel,
  deduplicateAndCleanEvents,
  downloadNativeAlarmIcs,
  cancelEventInstance,
  reactivateEventInstance
} from '../lib/supabase';
import {
  Sun,
  Moon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  AlertCircle,
  Share2,
  Check,
  BellRing,
  CalendarX,
  Undo2,
  Search
} from 'lucide-react';

interface DailyBriefingCardProps {
  familyId?: string;
  responsibleFilterId?: string | null;
  refreshTrigger?: number;
  events?: any[];
  members?: any[];
  currentMember?: any;
  onCardClick?: (event: any) => void;
  onOpenSummary?: (tab?: 'today' | 'week') => void;
  onEventsChanged?: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSearch?: () => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  familyId,
  responsibleFilterId,
  refreshTrigger,
  onEventsChanged,
  onNotify,
  onOpenSearch
}) => {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [items, setItems] = useState<DailyBriefingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('nosso_dia_briefing_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nosso_dia_briefing_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const dateLabel = getFriendlyDateLabel(selectedDate, todayStr);

  const loadBriefing = async () => {
    if (!familyId) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const { data: rawEvents, error: queryError } = await supabase
        .from('events')
        .select(`
          id,
          family_id,
          routine_id,
          title,
          start_time,
          end_time,
          is_all_day,
          status,
          location_id,
          responsible_id,
          locations ( id, name, address ),
          responsible:family_members!events_responsible_id_fkey ( id, name, nickname, color, role ),
          event_participants (
            member_id,
            family_members ( id, name, nickname, color, role )
          )
        `)
        .eq('family_id', familyId);

      if (queryError) throw queryError;

      const dayEvents = (rawEvents || []).filter(
        (e: Record<string, any>) => extractLiteralDate(e.start_time) === selectedDate
      );

      const cleanEvents = deduplicateAndCleanEvents(dayEvents);

      const mapped: DailyBriefingItem[] = cleanEvents.map((e: Record<string, any>) => {
        const loc = Array.isArray(e.locations) ? e.locations[0] : e.locations;
        const resp = Array.isArray(e.responsible) ? e.responsible[0] : e.responsible;
        const startLocal = extractLiteralTime(e.start_time);
        const endLocal = extractLiteralTime(e.end_time);

        const participants = (e.participants || []).map((p: Record<string, any>) => ({
          id: String(p.id),
          name: String(p.nickname || p.name),
          color: String(p.color || '#0284C7'),
          role: p.role
        }));

        return {
          event_id: String(e.id),
          title: String(e.title),
          start_time: String(e.start_time),
          end_time: String(e.end_time),
          start_time_local: startLocal,
          end_time_local: endLocal,
          is_all_day: Boolean(e.is_all_day),
          status: e.status || 'SCHEDULED',
          location_name: loc?.name || null,
          location_address: loc?.address || null,
          responsible_id: e.responsible_id || null,
          responsible_name: resp ? resp.nickname || resp.name : null,
          responsible_color: resp?.color || null,
          participants,
          has_conflict: false
        };
      });

      for (let i = 0; i < mapped.length; i++) {
        for (let j = i + 1; j < mapped.length; j++) {
          const a = mapped[i];
          const b = mapped[j];
          if (
            a.status !== 'CANCELLED' &&
            b.status !== 'CANCELLED' &&
            a.responsible_id &&
            a.responsible_id === b.responsible_id &&
            !a.is_all_day &&
            !b.is_all_day
          ) {
            if (a.start_time_local < b.end_time_local && b.start_time_local < a.end_time_local) {
              a.has_conflict = true;
              b.has_conflict = true;
            }
          }
        }
      }

      const filtered = responsibleFilterId
        ? mapped.filter(
            (item) =>
              item.responsible_id === responsibleFilterId ||
              item.participants.some((p) => p.id === responsibleFilterId)
          )
        : mapped;

      setItems(filtered);
    } catch (err) {
      console.error('Erro ao carregar resumo do dia:', err);
      setErrorMsg('Não foi possível carregar as atividades deste dia.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, [familyId, selectedDate, responsibleFilterId, refreshTrigger]);

  const activeItems = items.filter((item) => item.status !== 'CANCELLED');
  const unassignedCount = activeItems.filter((item) => !item.responsible_id).length;

  const responsibleCounts = activeItems.reduce<Record<string, number>>((acc, item) => {
    const name = item.responsible_name || 'Sem responsável';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const handleCopyWhatsAppReport = () => {
    if (activeItems.length === 0) return;

    const lines: string[] = [];
    lines.push(`📅 *${dateLabel.title}* (${dateLabel.subtitle}):\n`);

    activeItems.forEach((item) => {
      const timeStr = item.is_all_day ? 'Dia Todo' : `${item.start_time_local} - ${item.end_time_local}`;
      const locStr = item.location_name ? ` • 📍 ${item.location_name}` : '';
      const partsStr =
        item.participants.length > 0 ? ` (${item.participants.map((p) => p.name).join(', ')})` : '';
      const respStr = item.responsible_name ? `➔ Leva: *${item.responsible_name}*` : '➔ ⚠️ *Definir responsável*';

      lines.push(`⏰ *${timeStr}* — ${item.title}${partsStr} ${respStr}${locStr}`);
    });

    if (unassignedCount > 0) {
      lines.push(`\n⚠️ *Atenção:* Há ${unassignedCount} atividade(s) sem responsável definido!`);
    } else {
      lines.push(`\n✅ *Tudo certo:* Todos os responsáveis definidos!`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleItemCancel = async (eventId: string) => {
    const res = await cancelEventInstance(eventId);
    if (res.success) {
      setItems((prev) =>
        prev.map((it) => (it.event_id === eventId ? { ...it, status: 'CANCELLED' } : it))
      );
      onEventsChanged?.();
      onNotify?.('Atividade cancelada nesta data.', 'success');
    }
  };

  const handleItemReactivate = async (eventId: string) => {
    const res = await reactivateEventInstance(eventId);
    if (res.success) {
      setItems((prev) =>
        prev.map((it) => (it.event_id === eventId ? { ...it, status: 'SCHEDULED' } : it))
      );
      onEventsChanged?.();
      onNotify?.('Atividade reativada nesta data.', 'success');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 mb-6 shadow-2xs transition-all duration-300">
      {/* Barra de Navegação de Datas */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCollapsed ? '' : 'border-b border-slate-100 pb-4 mb-4'}`}>
        {/* Título Contextual Clicável para Recolher/Expandir */}
        <div
          onClick={toggleCollapse}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          title={isCollapsed ? 'Clique para expandir' : 'Clique para recolher'}
        >
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 transition-colors group-hover:bg-slate-100 shrink-0">
            {dateLabel.isToday ? (
              <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />
            ) : dateLabel.isTomorrow ? (
              <Moon className="w-5 h-5 text-indigo-500 fill-indigo-500" />
            ) : (
              <Calendar className="w-5 h-5 text-sky-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                {dateLabel.title}
              </h2>
              {/* Badge indicativo com contagem quando colapsado */}
              {isCollapsed && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {activeItems.length} atividade(s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{dateLabel.subtitle}</p>
          </div>
        </div>

        {/* Controles de Navegação (Hoje, Amanhã, Setas, Picker e Toggle Retrátil) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDate === todayStr
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(todayStr, 1))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDate === shiftDateString(todayStr, 1)
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Amanhã
          </button>

          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => shiftDateString(prev, -1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => shiftDateString(prev, 1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <label className="relative cursor-pointer">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="sr-only"
            />
            <span
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Escolher data específica"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateLabel.formattedDate}</span>
            </span>
          </label>

          {/* Botão Buscar Atividades */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-semibold border border-sky-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Buscar atividades por palavra-chave (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          )}

          {/* Botão Retrátil (Collapse / Expand) */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title={isCollapsed ? 'Expandir card' : 'Recolher card'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline text-[11px]">Expandir</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline text-[11px]">Recolher</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Barra de Busca Amigável de Atividades e Aniversários */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 hover:bg-white text-slate-500 hover:text-slate-800 rounded-2xl border border-slate-200 hover:border-sky-300 transition-all text-xs font-medium shadow-2xs group mb-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors shrink-0" />
                <span className="truncate">Buscar atividade por título ou aniversários (ex: Voleibol, Unimed, Terapia)...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                Ctrl + K
              </kbd>
            </button>
          )}

          {/* Mini-Balanço / Métricas Rápidas do Dia */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 mb-4 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-3 flex-wrap">
          <span>
            📋 <strong>{activeItems.length}</strong> atividade(s)
          </span>
          {Object.entries(responsibleCounts).map(([name, count]) => (
            <span key={name} className="border-l border-slate-200 pl-3">
              👤 {name}: <strong>{count}</strong>
            </span>
          ))}
          {unassignedCount > 0 && (
            <span className="border-l border-slate-200 pl-3 text-amber-800 font-bold bg-amber-100/60 px-2 py-0.5 rounded-md">
              ⚠️ {unassignedCount} sem responsável
            </span>
          )}
        </div>

        {activeItems.length > 0 && (
          <button
            type="button"
            onClick={handleCopyWhatsAppReport}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors ml-auto"
          >
            {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedWhatsApp ? 'Copiado para o WhatsApp!' : 'Copiar para WhatsApp'}</span>
          </button>
        )}
      </div>

      {/* Estados: Loading, Error e Lista de Atividades */}
      {isLoading ? (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-14 bg-slate-100 rounded-2xl" />
          <div className="h-14 bg-slate-100 rounded-2xl" />
        </div>
      ) : errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          {errorMsg}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 font-medium">
          Nenhum compromisso agendado para esta data. Família livre! 🎉
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const isCancelled = item.status === 'CANCELLED';

            return (
              <div
                key={item.event_id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCancelled
                    ? 'opacity-65 bg-slate-50/90 border-dashed border-slate-300'
                    : item.has_conflict
                    ? 'border-red-300 bg-red-50/40 ring-1 ring-red-400'
                    : !item.responsible_id
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-bold border px-2.5 py-1 rounded-xl text-xs shrink-0 ${
                      isCancelled
                        ? 'bg-slate-200 text-slate-500 border-slate-300 line-through'
                        : 'bg-sky-50 text-sky-700 border-sky-100'
                    }`}
                  >
                    {item.is_all_day ? 'Dia Todo' : `${item.start_time_local} - ${item.end_time_local}`}
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-sm ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </span>

                      {item.location_name && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {item.location_name}
                        </span>
                      )}

                      {isCancelled && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                          Cancelado nesta data
                        </span>
                      )}
                    </div>

                    {item.participants.length > 0 && !isCancelled && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium">Participante(s):</span>
                        {item.participants.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs flex items-center sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Responsável:</span>
                    {item.responsible_name ? (
                      <strong className="text-slate-800">{item.responsible_name}</strong>
                    ) : (
                      <span className="text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Definir
                      </span>
                    )}
                  </div>

                  {/* Ações Rápidas no Card */}
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                    {!isCancelled ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            downloadNativeAlarmIcs({
                              id: item.event_id,
                              family_id: familyId || '',
                              title: item.title,
                              start_time: item.start_time,
                              end_time: item.end_time,
                              is_all_day: item.is_all_day,
                              status: item.status,
                              location: item.location_name ? { id: 'loc', family_id: familyId || '', name: item.location_name } : null,
                              responsible: item.responsible_name ? { id: 'resp', family_id: familyId || '', name: item.responsible_name, role: 'ADMIN', color: item.responsible_color || '#3B82F6' } : null
                            })
                          }
                          title="Alarme no celular (.ics)"
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-md transition-colors"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemCancel(item.event_id)}
                          title="Cancelar nesta data"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <CalendarX className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleItemReactivate(item.event_id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors"
                      >
                        <Undo2 className="w-3 h-3" />
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
};
