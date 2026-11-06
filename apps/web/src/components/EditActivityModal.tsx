import React, { useState, useEffect } from 'react';
import { EventItem, FamilyMember } from '../types';
import { requestNotificationPermission } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import {
  MAX_EVENT_TITLE_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  sanitizeInput,
  sanitizeTitle,
  validateTitle,
} from '../lib/sanitize';
import { extractLiteralDate, extractLiteralTime } from '../lib/dateUtils';
import { downloadNativeAlarmIcs } from '../lib/alarmIcsGenerator';

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
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      console.log("DEBUG EVENTO MODAL:", { id: event.id, title: event.title, routine_id: event.routine_id });
      setTitle(event.title || '');
      setShowDeleteConfirm(false);
      setTitleError(null);
      
      // Data ISO no formato YYYY-MM-DD literal
      setDateStr(extractLiteralDate(event.start_time));

      // Hora HH:MM literal
      setStartTime(extractLiteralTime(event.start_time));

      // Duração em minutos (calculada a partir de start_time e end_time literais)
      let diffMinutes = 60;
      if (event.end_time && event.start_time) {
        const [sH, sM] = extractLiteralTime(event.start_time).split(':').map(Number);
        const [eH, eM] = extractLiteralTime(event.end_time).split(':').map(Number);
        if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
          const totalStart = sH * 60 + sM;
          const totalEnd = eH * 60 + eM;
          if (totalEnd > totalStart) {
            diffMinutes = totalEnd - totalStart;
          }
        }
      }
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
    const cleanTitle = sanitizeTitle(title);
    const validation = validateTitle(cleanTitle);
    if (!validation.isValid) {
      setTitleError(validation.error || 'Título inválido');
      return;
    }

    requestNotificationPermission();

    try {
      setIsSaving(true);
      setTitleError(null);
      const responsible = members.find(m => m.id === responsibleId) || null;
      const participants = members.filter(m => selectedParticipantIds.includes(m.id));
      const cleanLocation = sanitizeInput(locationName, MAX_LOCATION_NAME_LENGTH);

      await onSave({
        id: event.id,
        title: cleanTitle,
        dateStr,
        startTime: isAllDay ? '00:00' : startTime,
        duration: isAllDay ? 1440 : (parseInt(duration, 10) || 60),
        responsible,
        participants,
        location: cleanLocation,
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[96vh] sm:max-h-[92vh] border border-sky-100 overflow-hidden relative">
        {/* Puxador Mobile (Drag Handle) */}
        <div className="pt-2.5 pb-1 bg-slate-50/90 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header Fixo */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✏️</span>
            <div>
              <h2 className="text-title-sm sm:text-base font-bold text-slate-900 leading-tight">Editar Atividade</h2>
              <p className="text-caption text-slate-600">Atualize os detalhes ou exclua a atividade da semana</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 transition-colors font-bold cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-slate-800">
          {/* Título com Contador Visual e maxLength */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-activity-title" className="text-caption font-bold uppercase tracking-wider text-slate-700">
                Título da Atividade *
              </label>
              <span
                className={`text-caption font-semibold transition-colors ${
                  title.length >= MAX_EVENT_TITLE_LENGTH
                    ? 'text-rose-600 font-bold'
                    : title.length >= 80
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                {title.length}/{MAX_EVENT_TITLE_LENGTH}
              </span>
            </div>
            <input
              id="edit-activity-title"
              type="text"
              maxLength={MAX_EVENT_TITLE_LENGTH}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, MAX_EVENT_TITLE_LENGTH));
                if (titleError) setTitleError(null);
              }}
              placeholder="Ex: Natação, Inglês, Consulta..."
              className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border focus:outline-hidden focus:ring-2 text-base sm:text-sm font-semibold transition-all ${
                titleError
                  ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-sky-500/20 focus:border-sky-500'
              }`}
              required
            />
            {titleError && (
              <span className="text-caption font-semibold text-rose-600">{titleError}</span>
            )}
          </div>

          {/* Data do Evento */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-activity-date" className="text-caption font-bold uppercase tracking-wider text-slate-700">
              Data da Atividade
            </label>
            <input
              id="edit-activity-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold bg-white transition-all cursor-pointer"
              required
            />
          </div>

          {/* Checkbox Dia Inteiro */}
          <div className="flex items-center gap-3 py-1">
            <input 
              type="checkbox" 
              id="isAllDayEdit"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-5 h-5 text-sky-600 border-slate-300 rounded-md focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="isAllDayEdit" className="text-body-sm font-semibold text-slate-800 select-none cursor-pointer">
              📌 Evento de Dia Inteiro / Aniversário
            </label>
          </div>

          {/* Horário de Início e Duração (Ocultos se dia inteiro) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-start-time" className="text-caption font-bold uppercase tracking-wider text-slate-700">
                  Horário de Início
                </label>
                <input
                  id="edit-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white"
                  required={!isAllDay}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-duration" className="text-caption font-bold uppercase tracking-wider text-slate-700">
                  Duração (minutos)
                </label>
                <input
                  id="edit-duration"
                  type="number"
                  min="15"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white"
                  required={!isAllDay}
                />
              </div>
            </div>
          )}

          {/* Participantes */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-bold uppercase tracking-wider text-slate-700">Participantes</span>
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const isSelected = selectedParticipantIds.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => toggleParticipant(member.id)}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl text-body-sm font-semibold transition-all flex items-center gap-2 border shadow-2xs cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: member.color }} />
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável Adulto */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-responsible" className="text-caption font-bold uppercase tracking-wider text-slate-700">
              Responsável (Adulto)
            </label>
            <select
              id="edit-responsible"
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold bg-white transition-all cursor-pointer"
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
            <div className="flex items-center justify-between">
              <label htmlFor="edit-location" className="text-caption font-bold uppercase tracking-wider text-slate-700">
                Local
              </label>
              <span className="text-caption font-semibold text-slate-500">
                {locationName.length}/{MAX_LOCATION_NAME_LENGTH}
              </span>
            </div>
            <input
              id="edit-location"
              type="text"
              maxLength={MAX_LOCATION_NAME_LENGTH}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value.slice(0, MAX_LOCATION_NAME_LENGTH))}
              placeholder="Ex: Escola, Clube, Consultório..."
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white"
            />
          </div>

          {/* 🔔 Notificação para o Responsável */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🔔</span> Notificação para o Responsável
            </span>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setReminderMinutes(opt.value)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-body-sm font-semibold transition-all border shadow-2xs cursor-pointer ${
                    reminderMinutes === opt.value
                      ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold ring-2 ring-amber-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rodapé Fixo com Ações */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting || isSaving}
                className="min-h-[44px] px-4 py-2 text-body-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                🗑️ {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>

              {event && (
                <button
                  type="button"
                  onClick={() => downloadNativeAlarmIcs(event)}
                  title="Exportar arquivo .ics com despertador nativo (VALARM) para iOS e Android"
                  className="min-h-[44px] px-4 py-2 text-body-sm font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300/80 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  ⏰ Despertador (.ics)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 text-body-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || !title.trim()}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 sm:px-6 py-2.5 text-body-sm font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all shadow-xs hover:shadow disabled:opacity-50 cursor-pointer text-center whitespace-nowrap"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>

        {/* Diálogo Estilo Google Calendar para Escolha de Exclusão */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full flex flex-col gap-4 text-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg shrink-0">
                  🗑️
                </div>
                <div>
                  <h3 className="text-title-sm font-bold text-slate-900 leading-tight">
                    Excluir Atividade
                  </h3>
                  <p className="text-body-sm text-slate-600 mt-1 leading-relaxed">
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
                  className="min-h-[48px] w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 transition-all group cursor-pointer"
                >
                  <div className="text-body-sm font-bold text-slate-900 group-hover:text-sky-700">
                    🗑️ Apenas esta ocorrência
                  </div>
                  <div className="text-caption text-slate-500 mt-0.5">
                    Mantém os outros dias intactos no calendário.
                  </div>
                </button>

                {/* [ Todas as ocorrências desta rotina ] */}
                <button
                  type="button"
                  onClick={handleExecuteSeriesDelete}
                  disabled={isDeleting}
                  className="min-h-[48px] w-full text-left p-3.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-all group cursor-pointer"
                >
                  <div className="text-body-sm font-bold text-red-700 group-hover:text-red-800">
                    🔥 Excluir esta e todas as futuras
                  </div>
                  <div className="text-caption text-red-600/90 mt-0.5">
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
                  className="min-h-[44px] px-5 py-2 text-body-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
