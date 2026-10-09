import React, { useState } from 'react';
import { EventItem, FamilyMember } from '../types';

interface UnassignedActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  members: FamilyMember[];
  onAssignSingle: (eventId: string, memberId: string) => Promise<void>;
  onAssignSeries: (routineId: string, memberId: string) => Promise<void>;
}

export const UnassignedActivitiesModal: React.FC<UnassignedActivitiesModalProps> = ({
  isOpen,
  onClose,
  events,
  members,
  onAssignSingle,
  onAssignSeries,
}) => {
  const [confirmingRoutine, setConfirmingRoutine] = useState<{
    event: EventItem;
    selectedMember: FamilyMember;
  } | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

  if (!isOpen) return null;

  const unassignedEvents = events.filter((e) => !e.responsible_id);
  const adultMembers = members.filter((m) => m.role === 'ADMIN' || m.role === 'MEMBER');

  const formatEventDate = (isoString: string) => {
    const d = new Date(isoString);
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' });
    const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`;
  };

  const formatTimeRange = (startIso: string, endIso: string, isAllDay?: boolean) => {
    if (isAllDay) return '📌 Dia Inteiro';
    const s = new Date(startIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    const e = new Date(endIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    return `${s} - ${e}`;
  };

  const handleSelectMember = async (event: EventItem, member: FamilyMember) => {
    if (event.routine_id) {
      setConfirmingRoutine({ event, selectedMember: member });
    } else {
      try {
        setLoadingEventId(event.id);
        await onAssignSingle(event.id, member.id);
      } catch (err) {
        console.error('Erro ao atribuir responsável:', err);
      } finally {
        setLoadingEventId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] border border-sky-100/80">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Atribuir Responsáveis Pendentes
              </h2>
              <p className="text-xs text-slate-500">
                {unassignedEvents.length > 0
                  ? `Há ${unassignedEvents.length} atividade(s) aguardando definição de responsável`
                  : 'Todas as atividades estão com responsáveis definidos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-3.5">
          {unassignedEvents.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-xs">
                🎉
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Tudo certo!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Todas as atividades do período selecionado possuem responsáveis definidos.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          ) : (
            unassignedEvents.map((event) => {
              const isConfirmingThis = confirmingRoutine?.event.id === event.id;
              const isLoadingThis = loadingEventId === event.id;

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isConfirmingThis
                      ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-200'
                      : 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Detalhes da Atividade */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mb-1">
                        <span className="font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                          {formatEventDate(event.start_time)}
                        </span>
                        <span className="font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {formatTimeRange(event.start_time, event.end_time, event.is_all_day)}
                        </span>
                        {event.routine_id && (
                          <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded text-[10px]">
                            🔄 Rotina
                          </span>
                        )}
                        {event.location && (
                          <span className="text-slate-500 truncate" title={event.location.name}>
                            📍 {event.location.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mb-1.5 truncate">
                        {event.title}
                      </h3>

                      {/* Participantes */}
                      {event.participants && event.participants.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.participants.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white shadow-2xs"
                              style={{ backgroundColor: p.color }}
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação Rápida */}
                    {!isConfirmingThis && (
                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">
                          Atribuir a:
                        </span>
                        {adultMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMember(event, member)}
                            disabled={isLoadingThis}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: member.color }}
                            />
                            {member.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirmação Inline para Rotinas Recorrentes */}
                  {isConfirmingThis && confirmingRoutine && (
                    <div className="mt-3.5 pt-3 border-t border-indigo-200/60 flex flex-col gap-2.5 animate-in fade-in duration-150">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="text-base">🔄</span>
                        <span>
                          Esta atividade faz parte de uma rotina. Deseja atribuir{' '}
                          <strong className="text-indigo-700">{confirmingRoutine.selectedMember.name}</strong> para:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setLoadingEventId(event.id);
                              await onAssignSingle(event.id, confirmingRoutine.selectedMember.id);
                              setConfirmingRoutine(null);
                            } catch (err) {
                              console.error('Erro ao atribuir dia único:', err);
                            } finally {
                              setLoadingEventId(null);
                            }
                          }}
                          disabled={isLoadingThis}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          Apenas para este dia
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setLoadingEventId(event.id);
                              await onAssignSeries(event.routine_id!, confirmingRoutine.selectedMember.id);
                              setConfirmingRoutine(null);
                            } catch (err) {
                              console.error('Erro ao atribuir rotina inteira:', err);
                            } finally {
                              setLoadingEventId(null);
                            }
                          }}
                          disabled={isLoadingThis}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          Para todas as semanas
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingRoutine(null)}
                          disabled={isLoadingThis}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs text-slate-500">
          <span>{unassignedEvents.length} atividade(s) pendente(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
