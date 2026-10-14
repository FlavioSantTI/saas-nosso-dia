import { createClient } from '@supabase/supabase-js';

// Gerador .ics compatível com RFC 5545 (VTIMEZONE, escape, folding, download seguro no iOS)
export { downloadNativeAlarmIcs } from './alarmIcsGenerator';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cfzdxgpoltfwrzdzqfdv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lq_jcXpi8Fd0U_0ZUdv3dA_UNW9KNSU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function extractLiteralTime(raw: string | null | undefined): string {
  if (!raw) return '--:--';
  const str = String(raw).trim();
  const dateTimeMatch = str.match(/[T\s](\d{2}):(\d{2})/);
  if (dateTimeMatch) {
    return `${dateTimeMatch[1]}:${dateTimeMatch[2]}`;
  }
  const timeOnlyMatch = str.match(/^(\d{2}):(\d{2})/);
  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }
  return '--:--';
}

export const formatTimeLiteral = extractLiteralTime;

export function extractLiteralDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str.substring(0, 10);
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const toLocalDateString = getLocalDateString;

/**
 * Soma ou subtrai N dias de uma data 'YYYY-MM-DD' sem risco de fuso horário.
 */
export function shiftDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

const WEEKDAYS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

/**
 * Retorna rótulos humanos em português para a data selecionada.
 */
export function getFriendlyDateLabel(dateStr: string, todayStr: string): {
  title: string;
  subtitle: string;
  formattedDate: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
} {
  const tomorrowStr = shiftDateString(todayStr, 1);
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);

  const weekdayName = WEEKDAYS_PT[dateObj.getDay()];
  const formattedDay = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  const isPast = dateStr < todayStr;

  if (dateStr === todayStr) {
    return {
      title: 'Resumo Familiar de Hoje',
      subtitle: `${weekdayName}, ${d} de ${MONTHS_PT[m - 1]}`,
      formattedDate: formattedDay,
      isToday: true,
      isTomorrow: false,
      isPast: false
    };
  }
  if (dateStr === tomorrowStr) {
    return {
      title: 'Preparação para Amanhã',
      subtitle: `${weekdayName}, ${d} de ${MONTHS_PT[m - 1]}`,
      formattedDate: formattedDay,
      isToday: false,
      isTomorrow: true,
      isPast: false
    };
  }
  return {
    title: `Planejamento Familiar de ${formattedDay}`,
    subtitle: `${weekdayName}, ${d} de ${MONTHS_PT[m - 1]} de ${y}`,
    formattedDate: formattedDay,
    isToday: false,
    isTomorrow: false,
    isPast
  };
}

export function parseSafeLocalDate(rawDateOrIso: string): Date {
  const dateStr = extractLiteralDate(rawDateOrIso);
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function getLiteralDayOfWeek(rawDateOrIso: string): number {
  return parseSafeLocalDate(rawDateOrIso).getDay();
}

export function buildNominalTimestamp(dateStr: string, timeStr: string): string {
  const cleanDate = extractLiteralDate(dateStr) || getLocalDateString();
  const cleanTime = extractLiteralTime(timeStr);
  const validTime = cleanTime === '--:--' ? '08:00' : cleanTime;
  return `${cleanDate}T${validTime}:00+00:00`;
}

export function deduplicateAndCleanEvents<T extends Record<string, any>>(rawEvents: T[]): T[] {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) return [];

  const uniqueMap = new Map<string, T>();
  const duplicateIdsToDelete: string[] = [];

  for (const evt of rawEvents) {
    const dateKey = extractLiteralDate(evt.start_time);
    const timeKey = extractLiteralTime(evt.start_time);
    const titleKey = String(evt.title || '').trim().toLowerCase();

    const identityKey = evt.routine_id
      ? `routine_${evt.routine_id}_${dateKey}_${timeKey}`
      : `title_${titleKey}_${dateKey}_${timeKey}`;

    const rawParticipants: any[] = [];
    if (Array.isArray(evt.participants)) {
      rawParticipants.push(...evt.participants);
    }
    if (Array.isArray(evt.event_participants)) {
      evt.event_participants.forEach((ep: any) => {
        if (ep?.family_members) rawParticipants.push(ep.family_members);
        else if (ep?.member) rawParticipants.push(ep.member);
        else if (ep?.id && ep?.name) rawParticipants.push(ep);
      });
    }

    if (!uniqueMap.has(identityKey)) {
      const partMap = new Map<string, any>();
      rawParticipants.forEach((p) => {
        if (p && p.id) partMap.set(p.id, p);
      });

      uniqueMap.set(identityKey, {
        ...evt,
        participants: Array.from(partMap.values())
      });
    } else {
      const existing = uniqueMap.get(identityKey)!;
      if (evt.id && evt.id !== existing.id) {
        duplicateIdsToDelete.push(evt.id);
      }

      const partMap = new Map<string, any>();
      const existingParts = Array.isArray(existing.participants) ? existing.participants : [];
      [...existingParts, ...rawParticipants].forEach((p) => {
        if (p && p.id) partMap.set(p.id, p);
      });
      (existing as any).participants = Array.from(partMap.values());
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    supabase
      .from('events')
      .delete()
      .in('id', duplicateIdsToDelete)
      .then(() => {});
  }

  return Array.from(uniqueMap.values()).sort((a, b) => {
    const keyA = `${extractLiteralDate(a.start_time)}_${extractLiteralTime(a.start_time)}`;
    const keyB = `${extractLiteralDate(b.start_time)}_${extractLiteralTime(b.start_time)}`;
    return keyA.localeCompare(keyB);
  });
}

/**
 * Cancela um compromisso pontualmente na sua data via RPC ou Update direto.
 */
export async function cancelEventInstance(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('rpc_cancel_event_instance', { p_event_id: eventId });
    if (error) {
      const { error: directError } = await supabase
        .from('events')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', eventId);
      if (directError) throw directError;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao cancelar ocorrência do evento:', err);
    return { success: false, error: err?.message || 'Falha ao cancelar evento.' };
  }
}

/**
 * Reativa um compromisso cancelado pontualmente na data via RPC ou Update direto.
 */
export async function reactivateEventInstance(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('rpc_reactivate_event_instance', { p_event_id: eventId });
    if (error) {
      const { error: directError } = await supabase
        .from('events')
        .update({ status: 'SCHEDULED', updated_at: new Date().toISOString() })
        .eq('id', eventId);
      if (directError) throw directError;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao reativar ocorrência do evento:', err);
    return { success: false, error: err?.message || 'Falha ao reativar evento.' };
  }
}
