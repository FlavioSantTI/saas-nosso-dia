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
import { AuthModal } from './components/AuthModal';
import { SummaryModal } from './components/SummaryModal';
import { DailyBriefingCard } from './components/DailyBriefingCard';
import { Toast, ToastItem, ToastType } from './components/Toast';
import { Onboarding } from './components/Onboarding';
import { supabase } from './lib/supabase';
import { startNotificationScheduler, requestNotificationPermission } from './lib/notifications';
import { getMemberDisplayName } from './lib/formatters';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { sanitizeTitle } from './lib/sanitize';
import { usePwaUpdate } from './lib/usePwaUpdate';
import {
  extractLiteralDate,
  extractLiteralTime,
  toLocalDateString,
  parseSafeLocalDate,
  buildNominalTimestamp,
  buildNominalEndTimestamp,
  deduplicateAndCleanEvents,
} from './lib/dateUtils';

const formatDateToYYYYMMDD = (d: Date): string => {
  return toLocalDateString(d);
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
    const endParsed = parseSafeLocalDate(endDateStr);
    maxDate = new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate(), 23, 59, 59);
  }

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0);
    if (maxDate && current > maxDate) {
      break;
    }
    const dayOfWeek = current.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      dates.push(toLocalDateString(current));
    }
  }

  return dates;
};

const getVisibleRange = (date: Date, mode: CalendarViewMode) => {
  const d = new Date(date);
  if (mode === 'day') {
    const dayStr = toLocalDateString(d);
    return {
      start: `${dayStr}T00:00:00`,
      end: `${dayStr}T23:59:59`,
    };
  } else if (mode === 'week') {
    const monday = getMonday(d);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

    const m1 = toLocalDateString(monday);
    const d2 = toLocalDateString(sunday);

    return {
      start: `${m1}T00:00:00`,
      end: `${d2}T23:59:59`,
    };
  } else {
    // Modo mês: inclui dias do mês anterior e próximo mostrados na grade (com folga de 7 dias)
    const year = d.getFullYear();
    const month = d.getMonth();

    const startObj = new Date(year, month, 1, 12, 0, 0);
    startObj.setDate(startObj.getDate() - 7);

    const endObj = new Date(year, month + 1, 0, 12, 0, 0);
    endObj.setDate(endObj.getDate() + 7);

    const m1 = toLocalDateString(startObj);
    const d2 = toLocalDateString(endObj);

    return {
      start: `${m1}T00:00:00`,
      end: `${d2}T23:59:59`,
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
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset, 12, 0, 0);
    const dateStr = toLocalDateString(d);
    keys.forEach((k) => {
      map[k] = dateStr;
    });
  });
  return map;
};

// Varredura ágil e sincronização de rotinas ativas para a janela visível (+ margem de 7 dias)
const ensureRoutineEvents = async (
  familyId: string,
  visibleRange: { start: string; end: string },
  preloadedRoutines?: any[]
): Promise<any[]> => {
  try {
    // 1. Reutiliza rotinas já carregadas na memória ou busca ativas da família
    let routines = preloadedRoutines;
    if (!routines) {
      const { data: routs, error: routErr } = await supabase
        .from('routines')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_active', true);
      if (routErr || !routs) return [];
      routines = routs;
    } else {
      routines = routines.filter((r) => r.is_active !== false);
    }

    if (!routines || routines.length === 0) {
      return [];
    }

    // 2. Determina janela de verificação restrita usando datas nominais locais
    const todayStr = toLocalDateString();
    const visStartStr = extractLiteralDate(visibleRange.start) || todayStr;
    const visEndStr = extractLiteralDate(visibleRange.end) || todayStr;

    const startDate = parseSafeLocalDate(visStartStr < todayStr ? visStartStr : todayStr);
    const endDate = parseSafeLocalDate(visEndStr);
    endDate.setDate(endDate.getDate() + 7);

    const scanStartStr = toLocalDateString(startDate);
    const scanEndStr = toLocalDateString(endDate);

    // 3. Busca eventos existentes no intervalo de varredura
    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, routine_id, title, start_time')
      .eq('family_id', familyId)
      .gte('start_time', `${scanStartStr}T00:00:00`)
      .lte('start_time', `${scanEndStr}T23:59:59`);

    // Cria conjunto de chaves literais para lookup O(1)
    const existingKeySet = new Set<string>();
    (existingEvents || []).forEach((ev) => {
      const dateKey = extractLiteralDate(ev.start_time);
      const timeKey = extractLiteralTime(ev.start_time);
      const cleanTitle = (ev.title || '').trim().toLowerCase();

      if (ev.routine_id) {
        existingKeySet.add(`${ev.routine_id}_${dateKey}_${timeKey}`);
        existingKeySet.add(`${ev.routine_id}_${dateKey}`);
      }
      if (ev.title) {
        existingKeySet.add(`${cleanTitle}_${dateKey}_${timeKey}`);
        existingKeySet.add(`${cleanTitle}_${dateKey}`);
      }
    });

    // 4. Calcula os eventos ausentes para cada rotina ativa
    const missingEventsToInsert: any[] = [];
    const totalDaysToScan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (const routine of routines) {
      const routineDays: number[] = routine.days_of_week || [];
      if (routineDays.length === 0) continue;

      const targetDates = generateRoutineOccurrences(
        routineDays,
        startDate,
        totalDaysToScan,
        routine.end_date
      );

      const durationMinutes = routine.duration_minutes || 60;
      const routineStartTime = extractLiteralTime(routine.start_time) === '--:--'
        ? (routine.start_time || '08:00')
        : extractLiteralTime(routine.start_time);
      const cleanRoutineTitle = (routine.title || '').trim().toLowerCase();

      for (const dateStr of targetDates) {
        const routineDateKey = `${routine.id}_${dateStr}_${routineStartTime}`;
        const titleDateKey = `${cleanRoutineTitle}_${dateStr}_${routineStartTime}`;
        const fallbackRoutineKey = `${routine.id}_${dateStr}`;
        const fallbackTitleKey = `${cleanRoutineTitle}_${dateStr}`;

        if (
          !existingKeySet.has(routineDateKey) &&
          !existingKeySet.has(titleDateKey) &&
          !existingKeySet.has(fallbackRoutineKey) &&
          !existingKeySet.has(fallbackTitleKey)
        ) {
          const startIso = buildNominalTimestamp(dateStr, routineStartTime);
          const endIso = buildNominalEndTimestamp(dateStr, routineStartTime, durationMinutes);

          missingEventsToInsert.push({
            family_id: familyId,
            routine_id: routine.id,
            title: routine.title,
            start_time: startIso,
            end_time: endIso,
            is_all_day: false,
            location_id: routine.location_id,
            responsible_id: routine.default_responsible_id,
            status: 'SCHEDULED',
          });

          // Registra para evitar duplicar na mesma execução
          existingKeySet.add(routineDateKey);
          existingKeySet.add(titleDateKey);
          existingKeySet.add(fallbackRoutineKey);
          existingKeySet.add(fallbackTitleKey);
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

// Sincronização em segundo plano para 90 dias futuros (não bloqueia a UI inicial)
const syncFutureRoutinesInBackground = async (familyId: string, routines: any[]) => {
  try {
    const activeRoutines = (routines || []).filter((r) => r.is_active !== false);
    if (activeRoutines.length === 0) return;

    const today = new Date();
    const todayStr = toLocalDateString(today);
    const ninetyDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90, 12, 0, 0);
    const ninetyDaysStr = toLocalDateString(ninetyDaysAhead);

    const { data: existingEvents } = await supabase
      .from('events')
      .select('routine_id, title, start_time')
      .eq('family_id', familyId)
      .gte('start_time', `${todayStr}T00:00:00`)
      .lte('start_time', `${ninetyDaysStr}T23:59:59`);

    const existingKeySet = new Set<string>();
    (existingEvents || []).forEach((ev) => {
      const dateKey = extractLiteralDate(ev.start_time);
      const timeKey = extractLiteralTime(ev.start_time);
      const cleanTitle = (ev.title || '').trim().toLowerCase();

      if (ev.routine_id) {
        existingKeySet.add(`${ev.routine_id}_${dateKey}_${timeKey}`);
        existingKeySet.add(`${ev.routine_id}_${dateKey}`);
      }
      if (ev.title) {
        existingKeySet.add(`${cleanTitle}_${dateKey}_${timeKey}`);
        existingKeySet.add(`${cleanTitle}_${dateKey}`);
      }
    });

    const missingEventsToInsert: any[] = [];
    const totalDaysToScan = 91;

    for (const routine of activeRoutines) {
      const routineDays: number[] = routine.days_of_week || [];
      if (routineDays.length === 0) continue;

      const targetDates = generateRoutineOccurrences(
        routineDays,
        today,
        totalDaysToScan,
        routine.end_date
      );

      const durationMinutes = routine.duration_minutes || 60;
      const routineStartTime = extractLiteralTime(routine.start_time) === '--:--'
        ? (routine.start_time || '08:00')
        : extractLiteralTime(routine.start_time);
      const cleanRoutineTitle = (routine.title || '').trim().toLowerCase();

      for (const dateStr of targetDates) {
        const routineDateKey = `${routine.id}_${dateStr}_${routineStartTime}`;
        const titleDateKey = `${cleanRoutineTitle}_${dateStr}_${routineStartTime}`;
        const fallbackRoutineKey = `${routine.id}_${dateStr}`;
        const fallbackTitleKey = `${cleanRoutineTitle}_${dateStr}`;

        if (
          !existingKeySet.has(routineDateKey) &&
          !existingKeySet.has(titleDateKey) &&
          !existingKeySet.has(fallbackRoutineKey) &&
          !existingKeySet.has(fallbackTitleKey)
        ) {
          const startIso = buildNominalTimestamp(dateStr, routineStartTime);
          const endIso = buildNominalEndTimestamp(dateStr, routineStartTime, durationMinutes);

          missingEventsToInsert.push({
            family_id: familyId,
            routine_id: routine.id,
            title: routine.title,
            start_time: startIso,
            end_time: endIso,
            is_all_day: false,
            location_id: routine.location_id,
            responsible_id: routine.default_responsible_id,
            status: 'SCHEDULED',
          });

          existingKeySet.add(routineDateKey);
          existingKeySet.add(titleDateKey);
          existingKeySet.add(fallbackRoutineKey);
          existingKeySet.add(fallbackTitleKey);
        }
      }
    }

    if (missingEventsToInsert.length > 0) {
      await supabase.from('events').insert(missingEventsToInsert);
    }
  } catch (err) {
    console.warn('[BackgroundSync] Falha silenciosa na sincronização em segundo plano:', err);
  }
};

export const App: React.FC = () => {
  const { hasUpdate, latestVersion, reloadApp } = usePwaUpdate();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isManageFamilyOpen, setIsManageFamilyOpen] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<EventItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false);
  const [activeToastNotification, setActiveToastNotification] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Estados de Autenticação Supabase
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'onboarding'>('login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [inviteFamilyId, setInviteFamilyId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Estados do Painel de Resumo (Meu Dia e Balanço)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryInitialTab, setSummaryInitialTab] = useState<'today' | 'week'>('today');

  // Estado para o Módulo Super-Admin (/admin)
  const [isAdminViewOpen, setIsAdminViewOpen] = useState<boolean>(() => {
    return (
      window.location.pathname === '/admin' ||
      window.location.search.includes('view=admin') ||
      window.location.search.includes('admin=true')
    );
  });

  const handleOpenAdmin = useCallback(() => {
    setIsAdminViewOpen(true);
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
  }, []);

  const handleCloseAdmin = useCallback(() => {
    setIsAdminViewOpen(false);
    if (window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminViewOpen(
        window.location.pathname === '/admin' ||
        window.location.search.includes('view=admin') ||
        window.location.search.includes('admin=true')
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // 1. Verificação de Super-Admin (duplo papel com um único login)
  useEffect(() => {
    async function checkAdminStatus() {
      if (!currentUser) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const email = (currentUser.email || '').toLowerCase().trim();

        // 1. Atalho instantâneo de desenvolvimento / e-mail do gestor
        if (email.includes('admin') || email.includes('flavio') || import.meta.env.DEV) {
          setIsSuperAdmin(true);
          return;
        }

        // 2. Consulta unificada em uma única requisição ao banco
        const orClause = email ? `user_id.eq.${currentUser.id},email.eq.${email}` : `user_id.eq.${currentUser.id}`;
        const { data: adminRows } = await supabase
          .from('platform_admins')
          .select('id')
          .or(orClause)
          .limit(1);

        if (adminRows && adminRows.length > 0) {
          setIsSuperAdmin(true);
          return;
        }

        setIsSuperAdmin(false);
      } catch (err) {
        console.warn('Erro ao consultar platform_admins:', err);
        const email = (currentUser?.email || '').toLowerCase();
        setIsSuperAdmin(email.includes('admin') || email.includes('flavio') || import.meta.env.DEV);
      }
    }

    checkAdminStatus();
  }, [currentUser]);

  // Estados de Notificações Toast Flutuantes
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
      // 0. Verifica autenticação no Supabase Auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      setCurrentUser(sessionUser);

      const urlParams = new URLSearchParams(window.location.search);
      const joinFamilyId = urlParams.get('invite') || urlParams.get('join_family');

      // Se o usuário não está logado e não há convite com ID de família:
      // Não carrega a família automaticamente para garantir privacidade e manter na tela de login/onboarding
      if (!sessionUser && !joinFamilyId) {
        setFamily(null);
        setMembers([]);
        setEvents([]);
        setCurrentMember(null);
        setIsInitialLoading(false);
        return;
      }

      // 1. Identifica a família (com reutilização em memória se já carregada)
      let currentFamily = family;

      if (!currentFamily || joinFamilyId) {
        let query = supabase.from('families').select('*');

        if (joinFamilyId) {
          query = query.eq('id', joinFamilyId);
          setInviteFamilyId(joinFamilyId);
        } else if (sessionUser) {
          // Busca a família vinculada ao usuário logado
          const { data: memberRows } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', sessionUser.id)
            .limit(1);

          if (memberRows && memberRows.length > 0 && memberRows[0].family_id) {
            query = query.eq('id', memberRows[0].family_id);
          } else {
            query = query.order('created_at', { ascending: true }).limit(1);
          }
        }

        const { data: familiesData, error: famError } = await query;

        if (famError || !familiesData || familiesData.length === 0) {
          setFamily(null);
          setMembers([]);
          setEvents([]);
          return;
        }

        if (joinFamilyId && sessionUser) {
          window.history.replaceState({}, '', window.location.pathname);
        }

        currentFamily = familiesData[0];
        setFamily(currentFamily);
      }

      if (!currentFamily) {
        return;
      }

      // 2. PARALELIZAÇÃO TOTAL (Batching concorrente via Promise.all)
      // Carrega membros, locais, rotinas e eventos do intervalo visível SIMULTANEAMENTE
      const range = getVisibleRange(currentDate, viewMode);

      const [
        membersResult,
        locationsResult,
        eventsResult,
        routinesResult
      ] = await Promise.all([
        supabase
          .from('family_members')
          .select('*')
          .eq('family_id', currentFamily.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('locations')
          .select('*')
          .eq('family_id', currentFamily.id),
        supabase
          .from('events')
          .select('*')
          .eq('family_id', currentFamily.id)
          .gte('start_time', range.start)
          .lte('start_time', range.end)
          .order('start_time', { ascending: true }),
        supabase
          .from('routines')
          .select('*')
          .eq('family_id', currentFamily.id)
      ]);

      const loadedMembers: FamilyMember[] = membersResult.data || [];
      const locations: Location[] = locationsResult.data || [];
      let eventsData = eventsResult.data || [];
      const allRoutinesData = routinesResult.data || [];

      setMembers(loadedMembers);

      // 3. Sincronização prioritária e ágil de rotinas (usando rotinas já em cache de memória)
      const newlyCreatedRoutineEvents = await ensureRoutineEvents(currentFamily.id, range, allRoutinesData);

      if (newlyCreatedRoutineEvents.length > 0) {
        const visibleNewlyCreated = newlyCreatedRoutineEvents.filter((e) => {
          return e.start_time >= range.start && e.start_time <= range.end;
        });
        if (visibleNewlyCreated.length > 0) {
          eventsData = [...eventsData, ...visibleNewlyCreated];
          eventsData.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        }
      }

      // 4. Busca participantes filtrada estritamente pelos IDs dos eventos visíveis
      // Elimina o table scan global de SELECT * em toda a tabela event_participants
      let partData: any[] = [];
      const eventIds = eventsData.map((e) => e.id).filter(Boolean);
      if (eventIds.length > 0) {
        const { data: pData } = await supabase
          .from('event_participants')
          .select('*')
          .in('event_id', eventIds);
        partData = pData || [];
      }

      // 5. Enriquecimento dos eventos
      const populated = eventsData.map((e) => {
        const resp = loadedMembers.find((m) => m.id === e.responsible_id) || null;
        const loc = locations.find((l) => l.id === e.location_id) || null;
        const parts = partData
          .filter((p) => p.event_id === e.id)
          .map((p) => loadedMembers.find((m) => m.id === p.member_id))
          .filter(Boolean) as FamilyMember[];

        let matchedRoutineId = e.routine_id || null;
        if (!matchedRoutineId && allRoutinesData.length > 0) {
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

      // 5. Deduplicação imediata em memória e limpeza automática em background no banco
      const { dedupedEvents, duplicateIdsToDelete } = deduplicateAndCleanEvents<EventItem>(populated as EventItem[]);

      if (duplicateIdsToDelete.length > 0) {
        console.log(`[Deduplication] Excluindo ${duplicateIdsToDelete.length} eventos duplicados no banco...`);
        supabase
          .from('events')
          .delete()
          .in('id', duplicateIdsToDelete)
          .then(({ error }) => {
            if (error) {
              console.warn('[Deduplication] Erro ao deletar duplicatas em background:', error);
            } else {
              console.log(`[Deduplication] ${duplicateIdsToDelete.length} duplicatas removidas com sucesso.`);
            }
          });
      }

      setEvents(dedupedEvents);

      // 6. Materialização de longo prazo (90 dias) disparada em segundo plano com debounce
      if (typeof window !== 'undefined' && currentFamily.id) {
        const familyId = currentFamily.id;
        const cacheKey = `last_routine_sync_${familyId}`;
        const lastSync = sessionStorage.getItem(cacheKey);
        const now = Date.now();
        if (!lastSync || now - Number(lastSync) > 5 * 60 * 1000) {
          sessionStorage.setItem(cacheKey, String(now));
          setTimeout(() => {
            syncFutureRoutinesInBackground(familyId, allRoutinesData);
          }, 2000);
        }
      }
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

  // Monitoramento de Sessão de Autenticação (Supabase Auth)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (event === 'SIGNED_OUT' || !user) {
        setFamily(null);
        setMembers([]);
        setEvents([]);
        setCurrentMember(null);
      } else if (event === 'SIGNED_IN') {
        loadData();
      }
    });

    // Se entrou com convite (?invite=) e não está logado, abre o AuthModal automaticamente
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite') || urlParams.get('join_family');
    if (inviteParam) {
      setInviteFamilyId(inviteParam);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          setIsAuthModalOpen(true);
        }
      });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sincronização do Membro Logado com base no Usuário do Supabase Auth
  useEffect(() => {
    if (!currentUser || members.length === 0) {
      setCurrentMember(null);
      return;
    }

    // 1. Procura membro com user_id explicitamente vinculado
    const linked = members.find((m) => m.user_id === currentUser.id);
    if (linked) {
      setCurrentMember(linked);
      return;
    }

    // 2. Procura membro com o mesmo nome
    const userName = (currentUser.user_metadata?.name || '').toLowerCase().trim();
    if (userName) {
      const match = members.find(
        (m) => m.name.toLowerCase().trim() === userName
      );
      if (match) {
        setCurrentMember(match);
        if (!match.user_id) {
          supabase
            .from('family_members')
            .update({ user_id: currentUser.id })
            .eq('id', match.id)
            .then();
        }
        return;
      }
    }

    // 3. Fallback: Primeiro adulto da família
    const defaultAdult = members.find((m) => m.role !== 'CHILD') || members[0];
    setCurrentMember(defaultAdult || null);
  }, [currentUser, members]);

  // Função canônica de Logout
  const handleLogout = async () => {
    try {
      // 1. Encerra a sessão no Supabase
      await supabase.auth.signOut();

      // 2. Limpa dados e tokens do armazenamento local
      localStorage.clear();
      sessionStorage.clear();

      // 3. Reseta os estados locais da aplicação e define a tela de login imediatamente
      setCurrentUser(null);
      setCurrentMember(null);
      setFamily(null);
      setMembers([]);
      setEvents([]);
      setAuthView('login');
      setIsAuthModalOpen(true);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setAuthView('login');
      setIsAuthModalOpen(true);
    }
  };

  // Abrir Resumo / Balanço
  const handleOpenSummary = (initialTab: 'today' | 'week' = 'today') => {
    setSummaryInitialTab(initialTab);
    setIsSummaryModalOpen(true);
  };

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
    members: Array<{ name: string; nickname?: string | null; role: MemberRole; color: string }>;
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
      nickname: m.nickname?.trim() || null,
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
      .maybeSingle();

    if (error) {
      alert(`Erro ao atualizar nome da família: ${error.message}`);
      throw error;
    }

    if (!updatedFamily) {
      const msg = 'Não foi possível salvar o nome da família no banco (permissão RLS no Supabase necessária).';
      alert(msg);
      throw new Error(msg);
    }

    setFamily(updatedFamily);
  };

  // Gestão de Família: Adicionar Novo Membro
  const handleAddMember = async (memberData: {
    name: string;
    nickname?: string | null;
    email?: string | null;
    role: MemberRole;
    color: string;
  }) => {
    if (!family) return;
    const { data: newMember, error } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        name: memberData.name,
        nickname: memberData.nickname?.trim() || null,
        email: memberData.email?.trim() || null,
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
        nickname: updatedMember.nickname?.trim() || null,
        email: updatedMember.email?.trim() || null,
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

    // Calcula nova data mantendo o horário literal nominal
    const literalStartTime = extractLiteralTime(targetEvent.start_time);
    const literalEndTime = extractLiteralTime(targetEvent.end_time);
    const newStartTimeISO = buildNominalTimestamp(targetDateStr, literalStartTime);
    const newEndTimeISO = buildNominalTimestamp(targetDateStr, literalEndTime);

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

      // 2. Horários literais nominais
      const startIso = buildNominalTimestamp(updatedData.dateStr, updatedData.startTime);
      const endIso = buildNominalEndTimestamp(updatedData.dateStr, updatedData.startTime, updatedData.duration);

      // 3. Update na tabela events
      const eventUpdatePayload: any = {
        title: sanitizeTitle(updatedData.title),
        start_time: startIso,
        end_time: endIso,
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
            start_time: startIso,
            end_time: endIso,
            responsible_id: updatedData.responsible?.id || null,
            responsible: updatedData.responsible,
            participants: updatedData.participants,
            location: locationObj,
            reminder_minutes: updatedData.reminder_minutes !== undefined ? updatedData.reminder_minutes : null,
          };
        })
      );

      await loadData();
      showToast('✓ Alterações salvas com sucesso!', 'success');
    } catch (err) {
      console.error('Falha ao salvar edição:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
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
      showToast('🗑️ Atividade removida da semana.', 'success');
    } catch (err) {
      console.error('Falha ao excluir evento único:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
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
      showToast('🗑️ Atividade removida da semana.', 'success');
    } catch (err) {
      console.error('Falha ao excluir série de rotina:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
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
      const memberName = memberObj?.name || 'Membro';
      showToast(`👤 ${memberName} definido como responsável!`, 'success');
    } catch (err) {
      console.error('Falha ao atribuir responsável único:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
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
      const memberName = memberObj?.name || 'Membro';
      showToast(`👤 ${memberName} definido como responsável!`, 'success');
    } catch (err) {
      console.error('Falha ao atribuir responsável da série:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
      await loadData();
    }
  };

  // Função unificada para criar eventos no Supabase
  const saveActivityToSupabase = async (activity: {
    title: string;
    type?: 'RECURRING' | 'SINGLE';
    startTime: string; // Ex: '18:00'
    duration: number; // Ex: 60 min
    days?: (string | number)[]; // Ex: ['mon', 'wed'], ['Terça', 'Quinta'] ou [1, 3]
    date_str?: string | null;
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
      const routineDays = (activity.days || [])
        .map((d: any) => (typeof d === 'number' ? d : dayMap[String(d).toLowerCase().trim()]))
        .filter((d: any): d is number => d !== undefined && d >= 0 && d <= 6);

      const cleanActivityTitle = sanitizeTitle(activity.title) || 'Atividade da Família';

      // 2. Grava a regra na tabela routines (se for recorrente)
      let routineId: string | null = null;
      if (isRecurring && routineDays.length > 0) {
        const { data: routineData, error: routineError } = await supabase
          .from('routines')
          .insert({
            family_id: family.id,
            title: cleanActivityTitle,
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
            .ilike('title', cleanActivityTitle)
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
          .ilike('title', cleanActivityTitle)
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
        if (activity.date_str) {
          targetDates.push(activity.date_str);
        } else if (activity.days && activity.days.length > 0) {
          activity.days.forEach((day: any) => {
            const normalized = typeof day === 'string' ? day.toLowerCase().trim() : '';
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

      // 4. Monta os registros para inserção com horários nominais literais
      const durationMinutes = activity.duration || 60;
      const eventsToInsert = targetDates.map((dateStr) => {
        const startIso = buildNominalTimestamp(dateStr, activity.startTime || '18:00');
        const endIso = buildNominalEndTimestamp(dateStr, activity.startTime || '18:00', durationMinutes);

        return {
          family_id: family.id,
          routine_id: routineId,
          title: cleanActivityTitle,
          start_time: startIso,
          end_time: endIso,
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
      showToast('🎉 Atividade adicionada à rotina com sucesso!', 'success');
    } catch (err) {
      console.error('Falha ao persistir atividade:', err);
      showToast('⚠️ Não foi possível salvar. Tente novamente.', 'error');
    }
  };

  // Handler para adição via IA
  const handleConfirmQuickAdd = async (parsed: any) => {
    await saveActivityToSupabase({
      title: parsed.title,
      type: parsed.type || (parsed.days && parsed.days.length > 0 ? 'RECURRING' : 'SINGLE'),
      startTime: parsed.startTime || parsed.time || '18:00',
      duration: parsed.duration || 60,
      days: parsed.days || [],
      date_str: parsed.date_str || null,
      locationName: parsed.locationName || parsed.location,
      responsible: parsed.responsible,
      participants: parsed.participants || (parsed.participant ? [parsed.participant] : []),
      reminder_minutes: parsed.reminder_minutes !== undefined ? parsed.reminder_minutes : 15,
      is_all_day: parsed.is_all_day || false,
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

  // 1. Tela de Carregamento Inicial Neutra (evita qualquer flash de tela antes da verificação da sessão)
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8FA] flex flex-col items-center justify-center text-slate-600 gap-3">
        <div className="w-9 h-9 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wide text-slate-500">
          Carregando Nosso Dia...
        </span>
      </div>
    );
  }

  // 2. Usuário NÃO LOGADO: Renderiza a Landing Page Pública com o AuthModal sob demanda
  if (!currentUser) {
    if (authView === 'onboarding') {
      return (
        <Onboarding
          onComplete={handleCreateFamily}
          onOpenAuth={() => {
            setAuthView('login');
            setIsAuthModalOpen(true);
          }}
        />
      );
    }

    return (
      <>
        <LandingPage
          onOpenLogin={() => {
            setAuthView('login');
            setIsAuthModalOpen(true);
          }}
          onOpenSignup={() => {
            setAuthView('signup');
            setIsAuthModalOpen(true);
          }}
          onSelectPlan={(_planSlug) => {
            setAuthView('signup');
            setIsAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          isStandalone={false}
          initialTab={authView === 'signup' ? 'register' : 'login'}
          onClose={() => setIsAuthModalOpen(false)}
          inviteFamilyId={inviteFamilyId}
          family={family}
          members={members}
          onSwitchToOnboarding={() => {
            setIsAuthModalOpen(false);
            setAuthView('onboarding');
          }}
          onAuthSuccess={(user, linkedMember) => {
            setCurrentUser(user);
            if (linkedMember) {
              setCurrentMember(linkedMember);
            }
            setIsAuthModalOpen(false);
            loadData();
          }}
        />
      </>
    );
  }

  // 3. Usuário LOGADO SEM família ativa: Renderiza fluxo de criação/entrada em família (Onboarding)
  // REGRA RESTRITA: NUNCA envie este usuário logado para a landing page.
  if (!family) {
    return (
      <Onboarding
        onComplete={handleCreateFamily}
        onOpenAuth={handleLogout}
      />
    );
  }

  // 4. Usuário LOGADO COM família ativa: Renderiza o painel semanal existente sem alterações

  const unassignedCount = events.filter((e) => !e.responsible_id).length;

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-slate-800 flex flex-col font-sans relative overflow-x-hidden">
      {/* Sistema de Feedback Visual (Toasts de Sucesso e Erro) */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

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
        onOpenSummary={handleOpenSummary}
        currentUser={currentUser}
        currentMember={currentMember}
        isSuperAdmin={isSuperAdmin}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={handleOpenAdmin}
        hasActiveAlert={!!activeToastNotification}
        hasUpdate={hasUpdate}
        onReloadApp={reloadApp}
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
          onOpenSummary={handleOpenSummary}
        />

        {/* Relatório Diário Matinal ("Briefing do Dia") */}
        <DailyBriefingCard
          familyId={family?.id}
          events={events}
          members={members}
          currentMember={currentMember}
          onCardClick={handleCardClick}
          onOpenSummary={handleOpenSummary}
          onEventsChanged={loadData}
          onNotify={showToast}
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
                {getMemberDisplayName(m)}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="font-bold text-slate-800">Nosso Dia</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">v1.5.7</span>
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleOpenAdmin}
              className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer font-medium text-xs"
              title="Painel Super-Admin e Faturamento Asaas"
            >
              <span>🛡️ Super-Admin (/admin)</span>
            </button>
            <p className="text-slate-400 text-xs">
              Powered by <strong className="text-sky-700 font-semibold">Flavio Santiago Consultor IA</strong> — 2026
            </p>
          </div>
        </div>
      </footer>

      {/* Modal: Captura com IA */}
      <QuickAddWithAI
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        members={members}
        family={family}
        onOpenUpgrade={() => setIsManageFamilyOpen(true)}
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
        onToast={showToast}
      />

      {/* Modal: Autenticação e Convite da Família */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        inviteFamilyId={inviteFamilyId}
        family={family}
        members={members}
        onAuthSuccess={(user, linkedMember) => {
          setCurrentUser(user);
          if (linkedMember) {
            setCurrentMember(linkedMember);
          }
          loadData();
        }}
      />

      {/* Modal: Resumo Operacional "☀️ Meu Dia Hoje" e Planejamento "📊 Balanço da Semana" */}
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        initialTab={summaryInitialTab}
        events={events}
        members={members}
        currentMember={currentMember}
        onOpenUnassignedModal={() => {
          setIsSummaryModalOpen(false);
          setIsUnassignedModalOpen(true);
        }}
      />

      {/* Módulo Super-Admin (/admin) */}
      {isAdminViewOpen && (
        <AdminDashboard
          onClose={handleCloseAdmin}
          currentUser={currentUser}
          isSuperAdminProp={isSuperAdmin}
        />
      )}

      {/* Banner Flutuante de Atualização PWA na Zona do Polegar */}
      {hasUpdate && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 z-50 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🚀</span>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">Nova versão disponível (v{latestVersion})!</p>
              <p className="text-[11px] text-slate-400 truncate">Toque para carregar as melhorias recentes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reloadApp}
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      )}
    </div>
  );
};
