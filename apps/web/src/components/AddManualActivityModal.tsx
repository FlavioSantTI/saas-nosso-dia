import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../types';
import { requestNotificationPermission } from '../lib/notifications';
import {
  MAX_EVENT_TITLE_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  sanitizeInput,
  sanitizeTitle,
  validateTitle,
} from '../lib/sanitize';
import { getLocalDateString } from '../lib/dateUtils';

interface AddManualActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  initialData?: any;
  onSave: (activity: any) => Promise<void> | void;
}

export const AddManualActivityModal: React.FC<AddManualActivityModalProps> = ({
  isOpen,
  onClose,
  members,
  initialData,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'RECURRING' | 'SINGLE'>('RECURRING');
  const [singleDate, setSingleDate] = useState(() => getLocalDateString());
  const [days, setDays] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [responsibleId, setResponsibleId] = useState('');
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(15);
  const [endDate, setEndDate] = useState(''); // data final opcional para rotinas
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Sincroniza initialData vindo da IA ou reseta ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        const targetType = initialData.type || (initialData.date_str ? 'SINGLE' : 'RECURRING');
        setType(targetType);
        if (initialData.date_str) {
          setSingleDate(initialData.date_str);
        } else {
          setSingleDate(getLocalDateString());
        }
        setDays(Array.isArray(initialData.days) ? initialData.days : []);
        setIsAllDay(Boolean(initialData.is_all_day));
        setStartTime(initialData.startTime || initialData.time || '14:00');
        setDuration(String(initialData.duration || 60));
        setLocation(initialData.location || initialData.locationName || '');

        if (Array.isArray(initialData.participants) && initialData.participants.length > 0) {
          setSelectedParticipants(initialData.participants.map((p: any) => p.id));
        } else if (initialData.participant?.id) {
          setSelectedParticipants([initialData.participant.id]);
        } else if (members.length > 0) {
          setSelectedParticipants([members[0].id]);
        }

        if (initialData.responsible?.id) {
          setResponsibleId(initialData.responsible.id);
        } else {
          const firstAdmin = members.find((m) => m.role === 'ADMIN');
          if (firstAdmin) setResponsibleId(firstAdmin.id);
        }

        if (initialData.reminder_minutes !== undefined) {
          setReminderMinutes(initialData.reminder_minutes);
        }
        if (initialData.end_date) {
          setEndDate(initialData.end_date);
        }
      } else {
        // Reset para abertura manual padrão
        setTitle('');
        setType('RECURRING');
        setSingleDate(getLocalDateString());
        setDays([]);
        setIsAllDay(false);
        setStartTime('');
        setDuration('60');
        setSelectedParticipants([]);
        setResponsibleId('');
        setLocation('');
        setReminderMinutes(15);
        setEndDate('');
      }
      setTitleError(null);
    }
  }, [isOpen, initialData, members]);

  if (!isOpen) return null;

  const REMINDER_OPTIONS = [
    { label: 'Sem aviso', value: null },
    { label: '5 min antes', value: 5 },
    { label: '10 min antes', value: 10 },
    { label: '15 min antes', value: 15 },
    { label: '30 min antes', value: 30 },
  ];

  const weekDays = [
    { id: 'mon', label: 'Seg' },
    { id: 'tue', label: 'Ter' },
    { id: 'wed', label: 'Qua' },
    { id: 'thu', label: 'Qui' },
    { id: 'fri', label: 'Sex' },
    { id: 'sat', label: 'Sáb' },
    { id: 'sun', label: 'Dom' },
  ];

  const adults = members.filter(m => m.role === 'ADMIN' || m.role === 'MEMBER');

  const toggleDay = (dayId: string) => {
    setDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  };

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Sanitização e validação defensiva antes de enviar ao Supabase
    const cleanTitle = sanitizeTitle(title);
    const validation = validateTitle(cleanTitle);
    if (!validation.isValid) {
      setTitleError(validation.error || 'Título inválido');
      return;
    }

    try {
      setIsSaving(true);
      setTitleError(null);
      // Verifica permissão de notificação ao salvar
      requestNotificationPermission();

      const responsible = members.find(m => m.id === responsibleId) || null;
      const participants = members.filter(m => selectedParticipants.includes(m.id));
      const cleanLocation = sanitizeInput(location, MAX_LOCATION_NAME_LENGTH);
      
      let eventDays = days;
      if (type === 'SINGLE') {
        const dateObj = new Date(`${singleDate}T12:00:00`);
        const dayIds = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        eventDays = [dayIds[dateObj.getDay()]];
      }

      await onSave({
        title: cleanTitle,
        type,
        days: eventDays,
        date_str: type === 'SINGLE' ? singleDate : null,
        is_all_day: isAllDay,
        startTime: isAllDay ? '00:00' : (startTime.trim() || '12:00'),
        duration: isAllDay ? 1440 : parseInt(duration, 10),
        participants,
        responsible,
        location: cleanLocation,
        reminder_minutes: reminderMinutes,
        end_date: type === 'RECURRING' ? (endDate || null) : null
      });

      // Reset form
      setTitle('');
      setType('RECURRING');
      setSingleDate(getLocalDateString());
      setDays([]);
      setIsAllDay(false);
      setStartTime('');
      setDuration('60');
      setSelectedParticipants([]);
      setResponsibleId('');
      setLocation('');
      setReminderMinutes(15);
      setEndDate('');
      setTitleError(null);
    } catch (err) {
      console.error('Erro ao salvar atividade:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] border border-sky-100/80">
        {/* Puxador Mobile (Drag Handle) */}
        <div className="pt-2.5 pb-1 bg-slate-50/80 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Nova Atividade Manual</h2>
              <p className="text-xs text-slate-600">Cadastre uma nova rotina semanal ou evento avulso</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/50 transition-colors font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {initialData && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <span className="text-base">✨</span>
              <span>Dados preenchidos pela Inteligência Artificial. Revise e confirme antes de salvar.</span>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4.5 text-slate-800">
          {/* Título com Contador Visual e maxLength */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="manual-activity-title" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Título da atividade *
              </label>
              <span
                className={`text-[11px] font-semibold transition-colors ${
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
              id="manual-activity-title"
              type="text" 
              maxLength={MAX_EVENT_TITLE_LENGTH}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, MAX_EVENT_TITLE_LENGTH));
                if (titleError) setTitleError(null);
              }}
              placeholder="Ex: Aula de Natação, Inglês, Terapia..."
              className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-base sm:text-sm font-semibold transition-all ${
                titleError
                  ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-sky-500/20 focus:border-sky-500'
              }`}
            />
            {titleError && (
              <span className="text-[11px] font-semibold text-rose-600">{titleError}</span>
            )}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tipo de Atividade</span>
            <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200/60 gap-1">
              <button 
                type="button"
                onClick={() => setType('RECURRING')}
                className={`flex-1 min-h-[40px] py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${type === 'RECURRING' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🔄 Rotina Semanal
              </button>
              <button 
                type="button"
                onClick={() => setType('SINGLE')}
                className={`flex-1 min-h-[40px] py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${type === 'SINGLE' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                📅 Evento Pontual
              </button>
            </div>
          </div>

          {/* Seletor de Data para Evento Pontual */}
          {type === 'SINGLE' && (
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label htmlFor="manual-single-date" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Data do Evento Pontual *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSingleDate(getLocalDateString());
                    }}
                    className={`min-h-[34px] text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      singleDate === getLocalDateString()
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setSingleDate(getLocalDateString(d));
                    }}
                    className="min-h-[34px] text-[11px] font-bold text-slate-600 hover:bg-slate-100 px-3 py-1 rounded-lg cursor-pointer transition-colors border border-transparent"
                  >
                    Amanhã
                  </button>
                </div>
              </div>
              <input
                id="manual-single-date"
                type="date"
                required
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white cursor-pointer"
              />
            </div>
          )}

          {/* Dias da Semana e Data Final (Se rotina) */}
          {type === 'RECURRING' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Dias da semana</span>
                <div className="flex flex-wrap gap-1.5">
                  {weekDays.map(day => (
                    <button
                      type="button"
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`w-11 h-11 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                        days.includes(day.id) 
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-200' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="manual-end-date" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Repetir até (opcional):
                </label>
                <input
                  id="manual-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-base sm:text-xs font-semibold bg-white cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 font-medium">Deixe em branco para rotina contínua</p>
              </div>
            </div>
          )}

          {/* Checkbox Dia Inteiro */}
          <div className="flex items-center gap-3 py-1">
            <input 
              type="checkbox" 
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-5 h-5 text-sky-600 border-slate-300 rounded-md focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="isAllDay" className="text-sm font-semibold text-slate-800 select-none cursor-pointer">
              📌 Evento de Dia Inteiro / Aniversário
            </label>
          </div>

          {/* Horário e Duração (Ocultos se dia inteiro) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="manual-start-time" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Horário de Início
                </label>
                <input 
                  id="manual-start-time"
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white"
                  required={!isAllDay}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="manual-duration" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Duração (minutos)
                </label>
                <input 
                  id="manual-duration"
                  type="number" 
                  min="15"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 60"
                  className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white"
                  required={!isAllDay}
                />
              </div>
            </div>
          )}

          {/* Participante */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Participantes</span>
            <div className="flex flex-wrap gap-2">
              {members.map(member => (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => toggleParticipant(member.id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-2xs cursor-pointer ${
                    selectedParticipants.includes(member.id) 
                      ? 'border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-300' 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: member.color }}></span>
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {/* Responsável */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-responsible" className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Responsável (Adulto)
            </label>
            <select 
              id="manual-responsible"
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all bg-white cursor-pointer"
            >
              <option value="">⚠️ Sem Responsável Definido</option>
              {adults.map(adult => (
                <option key={adult.id} value={adult.id}>👤 {adult.name}</option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="manual-location" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Local
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                {location.length}/{MAX_LOCATION_NAME_LENGTH}
              </span>
            </div>
            <input 
              id="manual-location"
              type="text" 
              maxLength={MAX_LOCATION_NAME_LENGTH}
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, MAX_LOCATION_NAME_LENGTH))}
              placeholder="Ex: Escola, Clube, Casa..."
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-base sm:text-sm font-semibold transition-all"
            />
          </div>

          {/* 🔔 Notificação para o Responsável */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🔔</span> Notificação para o Responsável
            </span>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setReminderMinutes(opt.value)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shadow-2xs cursor-pointer ${
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
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={!title || (!isAllDay && !startTime) || isSaving}
            className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow cursor-pointer text-center whitespace-nowrap"
          >
            {isSaving ? 'Salvando...' : 'Salvar Atividade'}
          </button>
        </div>
      </div>
    </div>
  );
};
