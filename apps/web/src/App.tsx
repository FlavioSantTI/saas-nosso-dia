import React, { useState, useEffect, useCallback } from 'react';
import { Family, FamilyMember, EventItem, Location, MemberRole } from './types';
import { Header } from './components/Header';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { CalendarNavigation, CalendarViewMode, getMonday } from './components/CalendarNavigation';
import { QuickAddWithAI } from './components/QuickAddWithAI';
import { AddManualActivityModal } from './components/AddManualActivityModal';
import { EditActivityModal } from './components/EditActivityModal';
import { UnassignedActivitiesModal } from './components/UnassignedActivitiesModal';
import { FamilyManageModal } from './components/FamilyManageModal';
import { Onboarding } from './components/Onboarding';
import { supabase } from './lib/supabase';
import { startNotificationScheduler, requestNotificationPermission } from './lib/notifications';

const formatDateToYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Gera todas as ocorrências (YYYY-MM-DD) para os dias da semana selecionados (0=Dom... 6=Sáb) nos próximos N dias
const generateRoutineOccurrences = (
  daysOfWeek: number[],
  startDate: Date,
  totalDays: number = 90,
  endDateStr?: string | null
): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);

  let maxDate: Date | null = null;
  if (endDateStr) {
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    if (ey && em && ed) {
      maxDate = new Date(ey, em - 1, ed, 23, 59, 59);
    }
  }

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0);
    if (maxDate && current > maxDate) {
      break;
    }
    const dayOfWeek = current.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      dates.push(formatDateToYYYYMMDD(current));
    }
  }

  return dates;
};

const getVisibleRange = (date: Date, mode: CalendarViewMode) => {
  const d = new Date(date);
  if (mode === 'day') {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      start: `${y}-${m}-${day}T00:00:00.000Z`,
      end: `${y}-${m}-${day}T23:59:59.999Z`,
    };
  } else if (mode === 'week') {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const y1 = monday.getFullYear();
    const m1 = String(monday.getMonth() + 1).padStart(2, '0');
    const d1 = String(monday.getDate()).padStart(2, '0');

    const y2 = sunday.getFullYear();
    const m2 = String(sunday.getMonth() + 1).padStart(2, '0');
    const d2 = String(sunday.getDate()).padStart(2, '0');

    return {
      start: `${y1}-${m1}-${d1}T00:00:00.000Z`,
      end: `${y2}-${m2}-${d2}T23:59:59.999Z`,
    };
  } else {
    // Modo mês: inclui dias do mês anterior e próximo mostrados na grade (com folga de 7 dias)
    const year = d.getFullYear();
    const month = d.getMonth();

    const startObj = new Date(year, month, 1);
    startObj.setDate(startObj.getDate() - 7);

    const endObj = new Date(year, month + 1, 0);
    endObj.setDate(endObj.getDate() + 7);

    const y1 = startObj.getFullYear();
    const m1 = String(startObj.getMonth() + 1).padStart(2, '0');
    const d1 = String(startObj.getDate()).padStart(2, '0');

    const y2 = endObj.getFullYear();
    const m2 = String(endObj.getMonth() + 1).padStart(2, '0');
    const d2 = String(endObj.getDate()).padStart(2, '0');

    return {
      start: `${y1}-${m1}-${d1}T00:00:00.000Z`,
      end: `${y2}-${m2}-${d2}T23:59:59.999Z`,
    };
  }
};

const getWeekDateMap = (refDate: Date): Record<string, string> => {
  const monday = getMonday(refDate);
  const map: Record<string, string> = {};
  const dayKeys = [
    { keys: ['mon', 'seg', 'segunda', 'segunda-feira'], offset: 0 },
    { keys: ['tue', 'ter', 'terca', 'terça', 'terça-feira'], offset: 1 },
    { keys: ['wed', 'qua', 'quarta', 'quarta-feira'], offset: 2 },
    { keys: ['thu', 'qui', 'quinta', 'quinta-feira'], offset: 3 },
    { keys: ['fri', 'sex', 'sexta', 'sexta-feira'], offset: 4 },
    { keys: ['sat', 'sab', 'sabado', 'sábado'], offset: 5 },
    { keys: ['sun', 'dom', 'domingo'], offset: 6 },
  ];

  dayKeys.forEach(({ keys, offset }) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    keys.forEach((k) => {
      map[k] = dateStr;
    });
  });
  return map;
};

// Varredura e sincronização em lote de rotinas ativas para a janela visível e próximos 90 dias
const ensureRoutineEvents = async (
  familyId: string,
  visibleRange: { start: string; end: string }
): Promise<any[]> => {
  try {
    // 1. Busca rotinas ativas da família
    const { data: routines, error: routErr } = await supabase
      .from('routines')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true);

    if (routErr || !routines || routines.length === 0) {
      return [];
    }

    // 2. Determina a janela de verificação (janela visível + 90 dias a partir de hoje)
    const today = new Date();
    const visStart = new Date(visibleRange.start);
    const visEnd = new Date(visibleRange.end);

    const scanStart = new Date(
      Math.min(
        new Date(visStart.getFullYear(), visStart.getMonth(), visStart.getDate(), 12, 0, 0).getTime(),
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0).getTime()
      )
    );

    const ninetyDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90, 23, 59, 59);
    const scanEnd = new Date(
      Math.max(
        new Date(visEnd.getFullYear(), visEnd.getMonth(), visEnd.getDate(), 23, 59, 59).getTime(),
        ninetyDaysAhead.getTime()
      )
    );

    // 3. Busca eventos existentes no intervalo de varredura
    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, routine_id, title, start_time')
      .eq('family_id', familyId)
      .gte('start_time', scanStart.toISOString())
      .lte('start_time', scanEnd.toISOString());

    // Cria conjunto de chaves para lookup O(1)
    const existingKeySet = new Set<string>();
    (existingEvents || []).forEach((ev) => {
      const d = new Date(ev.start_time);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;

      if (ev.routine_id) {
        existingKeySet.add(`${ev.routine_id}_${dateKey}`);
      }
      if (ev.title) {
        existingKeySet.add(`${ev.title.trim().toLowerCase()}_${dateKey}`);
      }
    });

    // 4. Calcula os eventos ausentes para cada rotina ativa
    const missingEventsToInsert: any[] = [];
    const totalDaysToScan = Math.ceil((scanEnd.getTime() - scanStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (const routine of routines) {
      const routineDays: number[] = routine.days_of_week || [];
      if (routineDays.length === 0) continue;

      const targetDates = generateRoutineOccurrences(
        routineDays,
        scanStart,
        totalDaysToScan,
        routine.end_date
      );

      const [hours, minutes] = (routine.start_time || '12:00').split(':').map(Number);
      const durationMinutes = routine.duration_minutes || 60;

      for (const dateStr of targetDates) {
        const routineDateKey = `${routine.id}_${dateStr}`;
        const titleDateKey = `${routine.title.trim().toLowerCase()}_${dateStr}`;

        if (!existingKeySet.has(routineDateKey) && !existingKeySet.has(titleDateKey)) {
          const evStart = new Date(`${dateStr}T00:00:00Z`);
          evStart.setUTCHours(hours || 0, minutes || 0, 0, 0);
          const evEnd = new Date(evStart.getTime() + durationMinutes * 60 * 1000);

          missingEventsToInsert.push({
            family_id: familyId,
            routine_id: routine.id,
            title: routine.title,
            start_time: evStart.toISOString(),
            end_time: evEnd.toISOString(),
            is_all_day: false,
            location_id: routine.location_id,
            responsible_id: routine.default_responsible_id,
            status: 'SCHEDULED',
          });

          // Registra para evitar duplicar na mesma execução
          existingKeySet.add(routineDateKey);
          existingKeySet.add(titleDateKey);
        }
      }
    }

    // 5. Se houver eventos ausentes, insere em lote no Supabase
    if (missingEventsToInsert.length > 0) {
      let { data: inserted, error: insertErr } = await supabase
        .from('events')
        .insert(missingEventsToInsert)
        .select();

      // Fallback gracioso se a coluna is_all_day não existir no schema
      if (insertErr && String(insertErr.message).includes('is_all_day')) {
        const fallback = missingEventsToInsert.map(({ is_all_day, ...rest }) => rest);
        const { data: fbInserted } = await supabase.from('events').insert(fallback).select();
        inserted = fbInserted;
      }

      return inserted || [];
    }

    return [];
  } catch (err) {
    console.error('Erro ao garantir eventos de rotina:', err);
    return [];
  }
};

export const App: React.FC = () => {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-10-05T12:00:00Z'));
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isManageFamilyOpen, setIsManageFamilyOpen] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<EventItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false);
  const [activeToastNotification, setActiveToastNotification] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Navegação Temporal
  const handlePrevDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'day') {
        next.setDate(next.getDate() - 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() - 7);
      } else if (viewMode === 'month') {
        const targetDay = next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() - 1);
        const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDay, maxDays));
      }
      return next;
    });
  };

  const handleNextDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'day') {
        next.setDate(next.getDate() + 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7);
      } else if (viewMode === 'month') {
        const targetDay = next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
        const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDay, maxDays));
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Carrega família, membros, locais e eventos do Supabase filtrados pela data visível
  const loadData = useCallback(async () => {
    try {
      // 1. Busca família cadastrada
      let query = supabase.from('families').select('*');
      
      const urlParams = new URLSearchParams(window.location.search);
      const joinFamilyId = urlParams.get('join_family');

      if (joinFamilyId) {
        query = query.eq('id', joinFamilyId);
      } else {
        query = query.order('created_at', { ascending: true }).limit(1);
      }

      const { data: familiesData, error: famError } = await query;

      if (famError || !familiesData || familiesData.length === 0) {
        setFamily(null);
        setMembers([]);
        setEvents([]);
        return;
      }

      // Se entrou por invite, podemos remover o parametro da url para limpar
      if (joinFamilyId) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      const currentFamily: Family = familiesData[0];
      setFamily(currentFamily);

      // 2. Busca membros da família
      const { data: membersData } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', currentFamily.id)
        .order('created_at', { ascending: true });

      const loadedMembers: FamilyMember[] = membersData || [];
      setMembers(loadedMembers);

      // 3. Busca locais
      const { data: locationsData } = await supabase
        .from('locations')
        .select('*')
        .eq('family_id', currentFamily.id);

      const locations: Location[] = locationsData || [];

      // 4. Busca eventos filtrados pelo intervalo visível (currentDate & viewMode)
      const range = getVisibleRange(currentDate, viewMode);

      let { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', currentFamily.id)
        .gte('start_time', range.start)
        .lte('start_time', range.end)
        .order('start_time', { ascending: true });

      // 5. Garantir que todas as rotinas ativas estejam sincronizadas e materializadas para a visualização e próximos 90 dias
      const newlyCreatedRoutineEvents = await ensureRoutineEvents(currentFamily.id, range);

      if (newlyCreatedRoutineEvents.length > 0) {
        // Mescla os eventos recém-gerados que pertencem ao intervalo visível atual
        const visibleNewlyCreated = newlyCreatedRoutineEvents.filter((e) => {
          return e.start_time >= range.start && e.start_time <= range.end;
        });
        if (visibleNewlyCreated.length > 0) {
          eventsData = [...(eventsData || []), ...visibleNewlyCreated];
          eventsData.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        }
      }

      // 6. Busca participantes dos eventos e rotinas para enriquecer routine_id
      const { data: partData } = await supabase.from('event_participants').select('*');
      const { data: allRoutinesData } = await supabase
        .from('routines')
        .select('*')
        .eq('family_id', currentFamily.id);

      // Auto-cura de eventos legados com routine_id nulo no Supabase
      if (allRoutinesData && allRoutinesData.length > 0 && eventsData && eventsData.length > 0) {
        for (const routine of allRoutinesData) {
          const eventsNeedingHealing = eventsData.filter(
            (e) => !e.routine_id && e.title && e.title.trim().toLowerCase() === routine.title.trim().toLowerCase()
          );
          if (eventsNeedingHealing.length > 0) {
            const idsToHeal = eventsNeedingHealing.map((e) => e.id);
            supabase
              .from('events')
              .update({ routine_id: routine.id })
              .in('id', idsToHeal)
              .then(({ error }) => {
                if (!error) {
                  console.log(`Auto-curados ${idsToHeal.length} eventos no banco para routine_id: ${routine.id}`);
                }
              });
          }
        }
      }

      const populated = (eventsData || []).map((e) => {
        const resp = loadedMembers.find((m) => m.id === e.responsible_id) || null;
        const loc = locations.find((l) => l.id === e.location_id) || null;
        const parts = (partData || [])
          .filter((p) => p.event_id === e.id)
          .map((p) => loadedMembers.find((m) => m.id === p.member_id))
          .filter(Boolean) as FamilyMember[];

        let matchedRoutineId = e.routine_id || null;
        if (!matchedRoutineId && allRoutinesData && allRoutinesData.length > 0) {
          const found = allRoutinesData.find(
            (r) => r.title.trim().toLowerCase() === (e.title || '').trim().toLowerCase()
          );
          if (found) {
            matchedRoutineId = found.id;
          }
        }

        return {
          ...e,
          routine_id: matchedRoutineId,
          responsible: resp,
          location: loc,
          participants: parts,
          reminder_minutes: e.reminder_minutes !== undefined ? e.reminder_minutes : null,
        };
      });

      setEvents(populated);
    } catch (err: any) {
      console.error('Erro ao conectar ao Supabase:', err);
      setFamily(null);
    } finally {
      setIsInitialLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agendador de Notificações em segundo plano para os eventos da semana
  useEffect(() => {
    if (!events || events.length === 0) return;

    const cleanup = startNotificationScheduler(
      () => events,
      (message) => {
        setActiveToastNotification(message);
        setTimeout(() => setActiveToastNotification(null), 9000);
      }
    );

    return cleanup;
  }, [events]);

  // Fluxo de Onboarding: Criar Família e Membros Iniciais no Supabase
  const handleCreateFamily = async (data: {
    familyName: string;
    members: Array<{ name: string; role: MemberRole; color: string }>;
  }) => {
    // 1. Cria Família
    const { data: createdFamily, error: famErr } = await supabase
      .from('families')
      .insert({
        name: data.familyName,
        timezone: 'America/Araguaina'
      })
      .select()
      .single();

    if (famErr || !createdFamily) {
      throw new Error(famErr?.message || 'Falha ao criar família no Supabase.');
    }

    // 2. Cria Membros Vinculados
    const memberRows = data.members.map((m) => ({
      family_id: createdFamily.id,
      name: m.name,
      role: m.role,
      color: m.color
    }));

    const { data: createdMembers, error: memErr } = await supabase
      .from('family_members')
      .insert(memberRows)
      .select();

    if (memErr) {
      throw new Error(memErr?.message || 'Falha ao cadastrar membros da família.');
    }

    // 3. Atualiza estado imediatamente (grade semanal pronta para uso)
    setFamily(createdFamily);
    setMembers(createdMembers || []);
    setEvents([]);
  };

  // Gestão de Família: Atualizar Nome da Família
  const handleUpdateFamilyName = async (newName: string) => {
    if (!family) return;
    const { data: updatedFamily, error } = await supabase
      .from('families')
      .update({ name: newName })
      .eq('id', family.id)
      .select()
      .single();

    if (error) {
      alert(`Erro ao atualizar nome da família: ${error.message}`);
      return;
    }
    setFamily(updatedFamily);
  };

  // Gestão de Família: Adicionar Novo Membro
  const handleAddMember = async (memberData: { name: string; role: MemberRole; color: string }) => {
    if (!family) return;
    const { data: newMember, error } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        name: memberData.name,
        role: memberData.role,
        color: memberData.color
      })
      .select()
      .single();

    if (error) {
      alert(`Erro ao adicionar membro: ${error.message}`);
      return;
    }
    setMembers([...members, newMember]);
  };

  // Gestão de Família: Atualizar Membro
  const handleUpdateMember = async (updatedMember: FamilyMember) => {
    const { error } = await supabase
      .from('family_members')
      .update({
        name: updatedMember.name,
        role: updatedMember.role,
        color: updatedMember.color
      })
      .eq('id', updatedMember.id);

    if (error) {
      alert(`Erro ao atualizar membro: ${error.message}`);
      return;
    }

    setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    await loadData();
  };

  // Gestão de Família: Excluir Membro
  const handleDeleteMember = async (memberId: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', memberId);
    if (error) {
      alert(`Erro ao remover membro: ${error.message}`);
      return;
    }
    setMembers(members.filter((m) => m.id !== memberId));
    if (selectedMemberId === memberId) {
      setSelectedMemberId(null);
    }
    await loadData();
  };

  // Drag and Drop (Kanban): Mover Atividade entre dias da semana
  const handleMoveEvent = async (eventId: string, targetDateStr: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const oldStart = new Date(targetEvent.start_time);
    const oldEnd = new Date(targetEvent.end_time);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    // Calcula nova data mantendo o horário UTC original
    const [year, month, day] = targetDateStr.split('-').map(Number);
    const newStart = new Date(oldStart);
    newStart.setUTCFullYear(year, month - 1, day);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newStartTimeISO = newStart.toISOString();
    const newEndTimeISO = newEnd.toISOString();

    // 1. Resposta visual instantânea (otimista)
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          start_time: newStartTimeISO,
          end_time: newEndTimeISO,
        };
      })
    );

    // 2. Persistência no Supabase
    try {
      const { error } = await supabase
        .from('events')
        .update({
          start_time: newStartTimeISO,
          end_time: newEndTimeISO,
        })
        .eq('id', eventId);

      if (error) {
        console.error('Erro ao atualizar posição do evento no Supabase:', error);
        await loadData(); // Reverte em caso de erro
      }
    } catch (err) {
      console.error('Falha ao mover evento:', err);
      await loadData();
    }
  };

  // Abrir Modal de Edição ao Clicar no Card
  const handleCardClick = (event: EventItem) => {
    setSelectedEventForEdit(event);
    setIsEditModalOpen(true);
  };

  // Salvar Atividade Editada
  const handleSaveEditedEvent = async (updatedData: {
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
  }) => {
    if (!family) return;
    requestNotificationPermission();
    try {
      // 1. Localização (busca ou cria)
      let locationId: string | null = null;
      let locationObj: Location | null = null;
      if (updatedData.location && updatedData.location.trim()) {
        const trimmed = updatedData.location.trim();
        const { data: existingLoc } = await supabase
          .from('locations')
          .select('*')
          .eq('family_id', family.id)
          .ilike('name', trimmed)
          .maybeSingle();

        if (existingLoc) {
          locationId = existingLoc.id;
          locationObj = existingLoc;
        } else {
          const { data: newLoc } = await supabase
            .from('locations')
            .insert({ family_id: family.id, name: trimmed })
            .select()
            .single();
          if (newLoc) {
            locationId = newLoc.id;
            locationObj = newLoc;
          }
        }
      }

      // 2. Horários
      const [hours, minutes] = updatedData.startTime.split(':').map(Number);
      const start = new Date(`${updatedData.dateStr}T00:00:00Z`);
      start.setUTCHours(hours || 0, minutes || 0, 0, 0);
      const end = new Date(start.getTime() + updatedData.duration * 60 * 1000);

      // 3. Update na tabela events
      const eventUpdatePayload: any = {
        title: updatedData.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location_id: locationId,
        responsible_id: updatedData.responsible?.id || null,
        reminder_minutes: updatedData.reminder_minutes !== undefined ? updatedData.reminder_minutes : null,
        is_all_day: updatedData.is_all_day || false,
      };

      let { error: evError } = await supabase
        .from('events')
        .update(eventUpdatePayload)
        .eq('id', updatedData.id);

      // Se a coluna reminder_minutes não existir no banco, atualiza sem ela
      if (evError && String(evError.message).includes('reminder_minutes')) {
        delete eventUpdatePayload.reminder_minutes;
        const res = await supabase.from('events').update(eventUpdatePayload).eq('id', updatedData.id);
        evError = res.error;
      }

      if (evError) {
        console.error('Erro ao atualizar evento:', evError);
        return;
      }

      // 4. Update participantes
      await supabase.from('event_participants').delete().eq('event_id', updatedData.id);

      if (updatedData.participants.length > 0) {
        const participantRows = updatedData.participants.map((p) => ({
          event_id: updatedData.id,
          member_id: p.id,
        }));
        await supabase.from('event_participants').insert(participantRows);
      }

      // 5. Atualiza estado local
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== updatedData.id) return e;
          return {
            ...e,
            title: updatedData.title,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            responsible_id: updatedData.responsible?.id || null,
            responsible: updatedData.responsible,
            participants: updatedData.participants,
            location: locationObj,
            reminder_minutes: updatedData.reminder_minutes !== undefined ? updatedData.reminder_minutes : null,
          };
        })
      );

      await loadData();
    } catch (err) {
      console.error('Falha ao salvar edição:', err);
    }
  };

  // 1. Excluir Apenas Esta Ocorrência (Single Event)
  const handleDeleteSingle = async (eventId: string) => {
    try {
      // Atualização Otimista na tela
      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      // No Supabase: DELETE apenas para o id específico
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) {
        console.error('Erro ao deletar ocorrência única no Supabase:', error);
      }
      await loadData();
    } catch (err) {
      console.error('Falha ao excluir evento único:', err);
      await loadData();
    }
  };

  // 2. Excluir Esta e Todas as Ocorrências Futuras (Series)
  const handleDeleteSeries = async (routineId: string, eventStartTime: string) => {
    try {
      // Atualização Otimista na tela: remove eventos da mesma rotina a partir daquela data
      setEvents((prev) =>
        prev.filter((e) => !(e.routine_id === routineId && e.start_time >= eventStartTime))
      );

      // No Supabase: DELETE ocorrências vinculadas à rotina a partir do eventStartTime
      await supabase
        .from('events')
        .delete()
        .eq('routine_id', routineId)
        .gte('start_time', eventStartTime);

      // Desativa a rotina em public.routines
      await supabase
        .from('routines')
        .update({ is_active: false })
        .eq('id', routineId);

      await loadData();
    } catch (err) {
      console.error('Falha ao excluir série de rotina:', err);
      await loadData();
    }
  };

  // Atribuir Responsável a Ocorrência Única
  const handleAssignSingle = async (eventId: string, memberId: string) => {
    try {
      const memberObj = members.find((m) => m.id === memberId) || null;
      // Atualização Otimista na tela
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          return { ...e, responsible_id: memberId, responsible: memberObj };
        })
      );

      const { error } = await supabase
        .from('events')
        .update({ responsible_id: memberId })
        .eq('id', eventId);

      if (error) {
        console.error('Erro ao atualizar responsável do evento no Supabase:', error);
      }
      await loadData();
    } catch (err) {
      console.error('Falha ao atribuir responsável único:', err);
      await loadData();
    }
  };

  // Atribuir Responsável à Rotina Inteira (Todas as Ocorrências)
  const handleAssignSeries = async (routineId: string, memberId: string) => {
    try {
      const memberObj = members.find((m) => m.id === memberId) || null;
      // Atualização Otimista na tela
      setEvents((prev) =>
        prev.map((e) => {
          if (e.routine_id !== routineId) return e;
          return { ...e, responsible_id: memberId, responsible: memberObj };
        })
      );

      // Atualiza o default_responsible_id na regra em public.routines
      await supabase
        .from('routines')
        .update({ default_responsible_id: memberId })
        .eq('id', routineId);

      // Atualiza todas as ocorrências vinculadas àquela rotina
      const { error } = await supabase
        .from('events')
        .update({ responsible_id: memberId })
        .eq('routine_id', routineId);

      if (error) {
        console.error('Erro ao atualizar responsáveis da série no Supabase:', error);
      }
      await loadData();
    } catch (err) {
      console.error('Falha ao atribuir responsável da série:', err);
      await loadData();
    }
  };

  // Função unificada para criar eventos no Supabase
  const saveActivityToSupabase = async (activity: {
    title: string;
    type?: 'RECURRING' | 'SINGLE';
    startTime: string; // Ex: '18:00'
    duration: number; // Ex: 60 min
    days?: string[]; // Ex: ['mon', 'wed'] ou ['Terça', 'Quinta']
    locationName?: string;
    responsible?: FamilyMember | null;
    participants?: FamilyMember[];
    reminder_minutes?: number | null;
    is_all_day?: boolean;
    end_date?: string | null;
  }) => {
    if (!family) return;
    requestNotificationPermission();
    try {
      // 1. Localização (busca ou cria)
      let locationId: string | null = null;
      if (activity.locationName && activity.locationName.trim()) {
        const trimmed = activity.locationName.trim();
        const { data: existingLoc } = await supabase
          .from('locations')
          .select('*')
          .eq('family_id', family.id)
          .ilike('name', trimmed)
          .maybeSingle();

        if (existingLoc) {
          locationId = existingLoc.id;
        } else {
          const { data: newLoc } = await supabase
            .from('locations')
            .insert({ family_id: family.id, name: trimmed })
            .select()
            .single();
          if (newLoc) {
            locationId = newLoc.id;
          }
        }
      }

      // Mapeamento de dias para rotinas
      const dayMap: Record<string, number> = {
        'sun': 0, 'dom': 0, 'domingo': 0,
        'mon': 1, 'seg': 1, 'segunda': 1, 'segunda-feira': 1,
        'tue': 2, 'ter': 2, 'terca': 2, 'terça': 2, 'terça-feira': 2,
        'wed': 3, 'qua': 3, 'quarta': 3, 'quarta-feira': 3,
        'thu': 4, 'qui': 4, 'quinta': 4, 'quinta-feira': 4,
        'fri': 5, 'sex': 5, 'sexta': 5, 'sexta-feira': 5,
        'sat': 6, 'sab': 6, 'sabado': 6, 'sábado': 6,
      };

      const isRecurring = activity.type === 'RECURRING' || (activity.days && activity.days.length > 0 && activity.type !== 'SINGLE');
      const routineDays = (activity.days || []).map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);

      // 2. Grava a regra na tabela routines (se for recorrente)
      let routineId: string | null = null;
      if (isRecurring && routineDays.length > 0) {
        const { data: routineData, error: routineError } = await supabase
          .from('routines')
          .insert({
            family_id: family.id,
            title: activity.title,
            days_of_week: routineDays,
            start_time: activity.startTime,
            duration_minutes: activity.duration,
            location_id: locationId,
            default_responsible_id: activity.responsible?.id || null,
            is_active: true
          })
          .select()
          .single();

        if (routineError) {
          console.error('Erro ao salvar rotina no Supabase:', routineError);
          // Tenta recuperar ID caso a rotina já exista com este título
          const { data: existing } = await supabase
            .from('routines')
            .select('id')
            .eq('family_id', family.id)
            .ilike('title', activity.title)
            .maybeSingle();
          if (existing) {
            routineId = existing.id;
          }
        } else if (routineData && routineData.id) {
          routineId = routineData.id;
          console.log('Rotina cadastrada com ID:', routineId);
        }
      }

      if (isRecurring && !routineId) {
        const { data: fallbackRoutine } = await supabase
          .from('routines')
          .select('id')
          .eq('family_id', family.id)
          .ilike('title', activity.title)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallbackRoutine) {
          routineId = fallbackRoutine.id;
        }
      }

      // 3. Determina as datas dos eventos a criar
      let targetDates: string[] = [];

      if (isRecurring && routineDays.length > 0) {
        // Projeta e gera em lote para os próximos 90 dias (12 semanas) a partir de hoje / data de referência
        const today = new Date();
        const startRef = currentDate < today ? currentDate : today;
        targetDates = generateRoutineOccurrences(routineDays, startRef, 90, activity.end_date);
      } else {
        // Evento único ou dias específicos apenas na semana atual
        const weekDateMap = getWeekDateMap(currentDate);
        if (activity.days && activity.days.length > 0) {
          activity.days.forEach((day) => {
            const normalized = day.toLowerCase().trim();
            const mappedDate = weekDateMap[normalized];
            if (mappedDate) {
              targetDates.push(mappedDate);
            }
          });
        }
        if (targetDates.length === 0) {
          targetDates.push(formatDateToYYYYMMDD(currentDate));
        }
      }

      // Extrai horas e minutos
      const [hours, minutes] = (activity.startTime || '18:00').split(':').map(Number);
      const durationMinutes = activity.duration || 60;

      // 4. Monta os registros para inserção
      const eventsToInsert = targetDates.map((dateStr) => {
        const start = new Date(`${dateStr}T00:00:00Z`);
        start.setUTCHours(hours || 0, minutes || 0, 0, 0);

        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

        return {
          family_id: family.id,
          routine_id: routineId,
          title: activity.title,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_all_day: activity.is_all_day || false,
          location_id: locationId,
          responsible_id: activity.responsible?.id || null,
          status: 'SCHEDULED',
          reminder_minutes: activity.reminder_minutes !== undefined ? activity.reminder_minutes : null,
        };
      });

      // 5. Insere no Supabase
      let { data: insertedEvents, error: insertError } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select();

      // Fallback gracioso caso a coluna reminder_minutes ou is_all_day ainda não existam no banco
      if (insertError && String(insertError.message).includes('reminder_minutes')) {
        const fallbackInsert = eventsToInsert.map(({ reminder_minutes, ...rest }: any) => rest);
        const res = await supabase.from('events').insert(fallbackInsert).select();
        insertedEvents = res.data;
        insertError = res.error;
      }
      if (insertError && String(insertError.message).includes('is_all_day')) {
        const fallbackInsert = eventsToInsert.map(({ is_all_day, reminder_minutes, ...rest }: any) => rest);
        const res = await supabase.from('events').insert(fallbackInsert).select();
        insertedEvents = res.data;
        insertError = res.error;
      }

      if (insertError) {
        console.error('Erro ao inserir evento no Supabase:', insertError);
        return;
      }

      // 6. Insere participantes vinculados aos eventos gerados
      if (insertedEvents && insertedEvents.length > 0 && activity.participants && activity.participants.length > 0) {
        const participantRows: { event_id: string; member_id: string }[] = [];
        for (const ev of insertedEvents) {
          for (const part of activity.participants) {
            participantRows.push({
              event_id: ev.id,
              member_id: part.id
            });
          }
        }
        if (participantRows.length > 0) {
          await supabase.from('event_participants').insert(participantRows);
        }
      }

      // 7. Atualiza o estado da tela recarregando os dados do banco
      await loadData();
    } catch (err) {
      console.error('Falha ao persistir atividade:', err);
    }
  };

  // Handler para adição via IA
  const handleConfirmQuickAdd = async (parsed: any) => {
    await saveActivityToSupabase({
      title: parsed.title,
      type: (parsed.days && parsed.days.length > 0) ? 'RECURRING' : 'SINGLE',
      startTime: parsed.time || '18:00',
      duration: parsed.duration || 60,
      days: parsed.days || [],
      locationName: parsed.location,
      responsible: parsed.responsible,
      participants: parsed.participant ? [parsed.participant] : [],
      reminder_minutes: 15,
      end_date: null
    });
    setIsQuickAddOpen(false);
  };

  // Handler para adição manual
  const handleConfirmManualAdd = async (manualData: any) => {
    await saveActivityToSupabase({
      title: manualData.title,
      type: manualData.type,
      days: manualData.days || [],
      is_all_day: manualData.is_all_day,
      startTime: manualData.startTime || '12:00',
      duration: manualData.duration || 60,
      locationName: manualData.location,
      responsible: manualData.responsible,
      participants: manualData.participants || [],
      reminder_minutes: manualData.reminder_minutes !== undefined ? manualData.reminder_minutes : null,
      end_date: manualData.end_date || null
    });
    setIsManualAddOpen(false);
  };

  // 1. Tela de Carregamento Inicial
  if (isInitialLoading && !family) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold tracking-wide text-slate-300">
          Carregando Nosso Dia...
        </span>
      </div>
    );
  }

  // 2. Tela de Onboarding (quando não houver família cadastrada no Supabase)
  if (!family) {
    return <Onboarding onComplete={handleCreateFamily} />;
  }

  const unassignedCount = events.filter((e) => !e.responsible_id).length;

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-slate-800 flex flex-col font-sans relative">
      {/* Toast de Notificação de Atividade em Tempo Real */}
      {activeToastNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-slate-950 text-white border border-amber-500/60 shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-3 duration-300 ring-2 ring-amber-500/20">
          <span className="text-2xl shrink-0 animate-bounce">🔔</span>
          <div className="flex-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Lembrete de Atividade</h4>
            <p className="text-xs font-semibold text-slate-100 mt-0.5 leading-snug">{activeToastNotification}</p>
          </div>
          <button
            onClick={() => setActiveToastNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <Header
        family={family}
        onOpenManageFamily={() => setIsManageFamilyOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenNewActivity={() => setIsManualAddOpen(true)}
        hasActiveAlert={!!activeToastNotification}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Barra de Navegação Temporal e Seletor de Modos (Dia, Semana, Mês) */}
        <CalendarNavigation
          currentDate={currentDate}
          viewMode={viewMode}
          onPrev={handlePrevDate}
          onNext={handleNextDate}
          onToday={handleToday}
          onViewModeChange={(mode) => setViewMode(mode)}
        />

        {/* Banner de Atividades Sem Responsável */}
        {unassignedCount > 0 && (
          <div className="mb-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                Há <strong>{unassignedCount} atividade(s)</strong> sem responsável definido no período selecionado.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsUnassignedModalOpen(true)}
              className="font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer bg-transparent border-0 p-0 text-xs transition-colors"
            >
              Revisar agora
            </button>
          </div>
        )}

        {/* Barra de Filtro de Membros */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedMemberId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                selectedMemberId === null
                  ? 'bg-sky-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50 shadow-2xs font-semibold'
              }`}
            >
              Toda a Família
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMemberId === m.id
                    ? 'ring-2 ring-sky-700 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 border border-sky-100 hover:bg-sky-50 shadow-2xs font-semibold'
                }`}
                style={{ backgroundColor: selectedMemberId === m.id ? m.color : undefined }}
              >
                <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: m.color }} />
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Renderização Condicional da Grade (Semana / Dia / Mês) */}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            members={members}
            selectedMemberId={selectedMemberId}
            onCardClick={handleCardClick}
            onMoveEvent={handleMoveEvent}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            members={members}
            selectedMemberId={selectedMemberId}
            onCardClick={handleCardClick}
            onAddNewActivity={() => setIsManualAddOpen(true)}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectDate={(date) => {
              setCurrentDate(date);
              setViewMode('day');
            }}
            onCardClick={handleCardClick}
          />
        )}
      </main>

      {/* Rodapé Global */}
      <footer className="mt-auto py-6 border-t border-sky-100/80 bg-white/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="font-bold text-slate-800">Nosso Dia</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">v1.0.0</span>
          </p>
          <p className="text-slate-400 text-xs">
            Powered by <strong className="text-sky-700 font-semibold">Flavio Santiago Consultor IA</strong> — 2026
          </p>
        </div>
      </footer>

      {/* Modal: Captura com IA */}
      <QuickAddWithAI
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        members={members}
        onConfirmAdd={handleConfirmQuickAdd}
      />

      {/* Modal: Nova Atividade Manual */}
      <AddManualActivityModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        members={members}
        onSave={handleConfirmManualAdd}
      />

      {/* Modal: Editar / Excluir Atividade */}
      <EditActivityModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEventForEdit(null);
        }}
        event={selectedEventForEdit}
        members={members}
        onSave={handleSaveEditedEvent}
        onDeleteSingle={handleDeleteSingle}
        onDeleteSeries={handleDeleteSeries}
      />

      {/* Modal: Atribuição Rápida de Responsáveis Pendentes */}
      <UnassignedActivitiesModal
        isOpen={isUnassignedModalOpen}
        onClose={() => setIsUnassignedModalOpen(false)}
        events={events}
        members={members}
        onAssignSingle={handleAssignSingle}
        onAssignSeries={handleAssignSeries}
      />

      {/* Modal: Gestão da Família e Membros */}
      <FamilyManageModal
        isOpen={isManageFamilyOpen}
        onClose={() => setIsManageFamilyOpen(false)}
        family={family}
        members={members}
        onUpdateFamily={handleUpdateFamilyName}
        onAddMember={handleAddMember}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
      />
    </div>
  );
};
