import React, { useState, useEffect } from 'react';
import { EventItem, FamilyMember } from '../types';
import { requestNotificationPermission } from '../lib/notifications';
import { supabase } from '../lib/supabase';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  members: FamilyMember[];
  onSave: (updatedData: {
    id: string;
    title: string;
    dateStr: string;
    startTime: string;
    duration: number;
    responsible: FamilyMember | null;
    participants: FamilyMember[];
    location: string;
    reminder_minutes?: number | null;
    is_all_day?: boolean;
  }) => Promise<void>;
  onDeleteSingle: (eventId: string) => Promise<void>;
  onDeleteSeries: (routineId: string, eventStartTime: string) => Promise<void>;
}

const REMINDER_OPTIONS = [
  { label: 'Sem aviso', value: null },
  { label: '5 min antes', value: 5 },
  { label: '10 min antes', value: 10 },
  { label: '15 min antes', value: 15 },
  { label: '30 min antes', value: 30 },
];

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  event,
  members,
  onSave,
  onDeleteSingle,
  onDeleteSeries
}) => {
  if (event) {
    console.log("DEBUG EVENTO MODAL:", { id: event.id, title: event.title, routine_id: event.routine_id });
  }

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('2026-10-05');
  const [startTime, setStartTime] = useState('12:00');
  const [duration, setDuration] = useState('60');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [locationName, setLocationName] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(15);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (event) {
      console.log("DEBUG EVENTO MODAL:", { id: event.id, title: event.title, routine_id: event.routine_id });
      setTitle(event.title || '');
      setShowDeleteConfirm(false);
      
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      
      // Data ISO no formato YYYY-MM-DD
      const yyyy = start.getUTCFullYear();
      const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(start.getUTCDate()).padStart(2, '0');
      setDateStr(`${yyyy}-${mm}-${dd}`);

      // Hora HH:MM
      const hours = String(start.getUTCHours()).padStart(2, '0');
      const minutes = String(start.getUTCMinutes()).padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);

      // Duração em minutos
      const diffMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
      setDuration(String(diffMinutes || 60));

      // Participantes
      setSelectedParticipantIds(event.participants?.map(p => p.id) || []);

      // Responsável
      setResponsibleId(event.responsible_id || '');

      // Local
      setLocationName(event.location?.name || '');

      // All day
      setIsAllDay(event.is_all_day || false);

      // Notificação
      setReminderMinutes(event.reminder_minutes !== undefined ? event.reminder_minutes : 15);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const adults = members.filter(m => m.role === 'ADMIN' || m.role === 'MEMBER');

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    requestNotificationPermission();

    try {
      setIsSaving(true);
      const responsible = members.find(m => m.id === responsibleId) || null;
      const participants = members.filter(m => selectedParticipantIds.includes(m.id));

      await onSave({
        id: event.id,
        title: title.trim(),
        dateStr,
        startTime: isAllDay ? '00:00' : startTime,
        duration: isAllDay ? 1440 : (parseInt(duration, 10) || 60),
        responsible,
        participants,
        location: locationName.trim(),
        reminder_minutes: reminderMinutes,
        is_all_day: isAllDay
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar atividade:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleExecuteSingleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDeleteSingle(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir ocorrência única:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteSeriesDelete = async () => {
    try {
      setIsDeleting(true);
      if (event.routine_id) {
        await onDeleteSeries(event.routine_id, event.start_time);
      } else {
        await supabase
          .from('events')
          .delete()
          .eq('family_id', event.family_id)
          .eq('title', event.title)
          .gte('start_time', event.start_time);
        await onDeleteSingle(event.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir série de rotina:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] border border-sky-100/80 relative">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Editar Atividade</h2>
              <p className="text-xs text-slate-500">Atualize os detalhes ou exclua a atividade da semana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4.5 text-slate-800">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Título da Atividade</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Natação, Inglês, Consulta..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold transition-all"
              required
            />
          </div>

          {/* Data do Evento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Data da Atividade</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold bg-white transition-all cursor-pointer"
              required
            />
          </div>

          {/* Checkbox Dia Inteiro */}
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isAllDayEdit"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 text-sky-600 border-slate-300 rounded-sm focus:ring-sky-500"
            />
            <label htmlFor="isAllDayEdit" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
              📌 Evento de Dia Inteiro / Aniversário
            </label>
          </div>

          {/* Horário de Início e Duração (Ocultos se dia inteiro) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Horário de Início</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold transition-all"
                  required={!isAllDay}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Duração (minutos)</label>
                <input
                  type="number"
                  min="15"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold transition-all"
                  required={!isAllDay}
                />
              </div>
            </div>
          )}

          {/* Participantes */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const isSelected = selectedParticipantIds.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => toggleParticipant(member.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-2xs ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável Adulto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Responsável (Adulto)</label>
            <select
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold bg-white transition-all cursor-pointer"
            >
              <option value="">⚠️ Sem Responsável Definido</option>
              {adults.map(adult => (
                <option key={adult.id} value={adult.id}>
                  👤 {adult.name}
                </option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Local</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Escola, Clube, Consultório..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold transition-all"
            />
          </div>

          {/* 🔔 Notificação para o Responsável */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>🔔</span> Notificação para o Responsável
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setReminderMinutes(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-2xs ${
                    reminderMinutes === opt.value
                      ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting || isSaving}
              className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              🗑️ {isDeleting ? 'Excluindo...' : 'Excluir Atividade'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || !title.trim()}
                className="px-5 py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all shadow-xs hover:shadow disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>

        {/* Diálogo Estilo Google Calendar para Escolha de Exclusão */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full flex flex-col gap-4 text-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg shrink-0">
                  🗑️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Excluir Atividade
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Como você deseja excluir esta atividade?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* [ Apenas esta ocorrência ] */}
                <button
                  type="button"
                  onClick={handleExecuteSingleDelete}
                  disabled={isDeleting}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                    🗑️ Apenas esta ocorrência
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Mantém os outros dias intactos no calendário.
                  </div>
                </button>

                {/* [ Todas as ocorrências desta rotina ] */}
                <button
                  type="button"
                  onClick={handleExecuteSeriesDelete}
                  disabled={isDeleting}
                  className="w-full text-left p-3.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-red-700 group-hover:text-red-800">
                    🔥 Excluir esta e todas as futuras
                  </div>
                  <div className="text-[11px] text-red-600/80 mt-0.5">
                    Remove esta e todas as ocorrências vinculadas a esta rotina.
                  </div>
                </button>
              </div>

              {/* Botão Cancelar */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
