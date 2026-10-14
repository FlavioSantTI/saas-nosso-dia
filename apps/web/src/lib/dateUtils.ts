/**
 * MÓDULO CENTRAL DE TRATAMENTO DE DATAS E HORÁRIOS LITERAIS
 * 
 * Regra Inegociável:
 * - NUNCA usar toISOString() para datas (muda de dia às 21h no fuso UTC-3 de Palmas/Brasília).
 * - NUNCA usar new Date(iso).toLocaleTimeString() (subtrai 3h da hora nominal já salva no banco).
 * - Extrair horas e datas LITERALMENTE como texto da string vinda do banco de dados.
 */

export const FAMILY_TIMEZONE = 'America/Araguaina';
export const TIMEZONE_OFFSET_STR = '-03:00';

/**
 * Extrai a hora literal (HH:mm) diretamente da string do banco de dados,
 * SEM aplicar conversão de fuso horário do navegador (evita subtrair 3h).
 * Exemplos:
 * - "2026-10-13 18:00:00+00" -> "18:00"
 * - "2026-10-13T18:20:00.000Z" -> "18:20"
 * - "06:50:00" -> "06:50"
 */
export function extractLiteralTime(raw: string | null | undefined): string {
  if (!raw) return '--:--';
  const str = String(raw).trim();
  // Se tiver data antes da hora (separada por T ou espaço)
  const dateTimeMatch = str.match(/[T\s](\d{2}):(\d{2})/);
  if (dateTimeMatch) {
    return `${dateTimeMatch[1]}:${dateTimeMatch[2]}`;
  }
  // Se for apenas hora "HH:mm:ss" ou "HH:mm"
  const timeOnlyMatch = str.match(/^(\d{2}):(\d{2})/);
  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }
  return '--:--';
}

/**
 * Extrai a data literal (YYYY-MM-DD) diretamente da string do banco de dados,
 * SEM converter para UTC/Local (evita mudar de dia às 21h).
 * Exemplo: "2026-10-13 18:00:00+00" -> "2026-10-13"
 */
export function extractLiteralDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str.substring(0, 10);
}

export const formatTimeLiteral = extractLiteralTime;

/**
 * Retorna a data local atual do dispositivo no formato 'YYYY-MM-DD'.
 * NUNCA usa toISOString(), pois toISOString() vira o dia às 21h no Brasil (UTC-3).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const toLocalDateString = getLocalDateString;

/**
 * Converte uma string 'YYYY-MM-DD' ou timestamp do banco em um objeto Date local (meio-dia)
 * seguro contra desvios de fuso horário para cálculo de dia da semana (0=Dom..6=Sáb).
 */
export function parseSafeLocalDate(rawDateOrIso: string): Date {
  const dateStr = extractLiteralDate(rawDateOrIso);
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Retorna o dia da semana (0 = Domingo ... 6 = Sábado) de forma 100% literal.
 */
export function getLiteralDayOfWeek(rawDateOrIso: string): number {
  return parseSafeLocalDate(rawDateOrIso).getDay();
}

/**
 * Monta o timestamp para salvar no banco mantendo exatamente a hora nominal escolhida
 * pelo usuário (ex: date="2026-10-13", time="18:00" -> "2026-10-13T18:00:00+00:00").
 */
export function buildNominalTimestamp(dateStr: string, timeStr: string): string {
  const cleanDate = extractLiteralDate(dateStr) || toLocalDateString();
  const cleanTime = extractLiteralTime(timeStr);
  const validTime = cleanTime === '--:--' ? '08:00' : cleanTime;
  return `${cleanDate}T${validTime}:00+00:00`;
}

/**
 * Calcula o timestamp final nominal somando os minutos de duração
 * sem aplicar conversões de fuso horário.
 */
export function buildNominalEndTimestamp(dateStr: string, timeStr: string, durationMinutes: number = 60): string {
  const cleanDate = extractLiteralDate(dateStr) || toLocalDateString();
  const cleanTime = extractLiteralTime(timeStr);
  const [h, m] = (cleanTime === '--:--' ? '08:00' : cleanTime).split(':').map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + (durationMinutes || 60);
  const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const endM = String(totalMin % 60).padStart(2, '0');
  return `${cleanDate}T${endH}:${endM}:00+00:00`;
}

/**
 * Deduplica eventos nominais de rotina/título na mesma data e hora literal,
 * unificando múltiplos filhos e participantes (ex.: Rafa + Maria no mesmo card)
 * e retornando os IDs das duplicatas excedentes para limpeza automática no banco.
 */
export function deduplicateAndCleanEvents<T extends {
  id: string;
  routine_id?: string | null;
  title?: string | null;
  start_time: string;
  participants?: any[];
  responsible?: any;
  responsible_id?: string | null;
  location?: any;
  location_id?: string | null;
}>(rawEvents: T[]): { dedupedEvents: T[]; duplicateIdsToDelete: string[] } {
  const map = new Map<string, T>();
  const duplicateIdsToDelete: string[] = [];

  for (const ev of rawEvents) {
    const dateStr = extractLiteralDate(ev.start_time);
    const timeStr = extractLiteralTime(ev.start_time);
    const cleanTitle = (ev.title || '').trim().toLowerCase();

    // Chave única: rotina + data + hora, ou fallback título + data + hora
    const primaryKey = ev.routine_id
      ? `routine_${ev.routine_id}_${dateStr}_${timeStr}`
      : `title_${cleanTitle}_${dateStr}_${timeStr}`;

    const existing = map.get(primaryKey);
    if (!existing) {
      map.set(primaryKey, { ...ev });
    } else {
      duplicateIdsToDelete.push(ev.id);

      // Unifica participantes (ex.: Rafa + Maria no mesmo card)
      const existingParts = existing.participants || [];
      const newParts = ev.participants || [];
      const mergedMap = new Map<string, any>();
      for (const p of existingParts) {
        if (p?.id) mergedMap.set(p.id, p);
      }
      for (const p of newParts) {
        if (p?.id) mergedMap.set(p.id, p);
      }
      existing.participants = Array.from(mergedMap.values());

      if (!existing.responsible && ev.responsible) {
        existing.responsible = ev.responsible;
        existing.responsible_id = ev.responsible_id;
      }
      if (!existing.location && ev.location) {
        existing.location = ev.location;
        existing.location_id = ev.location_id;
      }
      if (!existing.routine_id && ev.routine_id) {
        existing.routine_id = ev.routine_id;
      }
    }
  }

  return {
    dedupedEvents: Array.from(map.values()),
    duplicateIdsToDelete,
  };
}

export const deduplicateEventsList = deduplicateAndCleanEvents;

// --------------------------------------------------------------------------
// ALIASES DE COMPATIBILIDADE (Garantem integridade sem quebrar chamadas legadas)
// --------------------------------------------------------------------------
export const formatLocalTime = extractLiteralTime;
export const getLocalTimeInputString = extractLiteralTime;
export const buildUtcIsoString = buildNominalTimestamp;
export function getTodayLocalDateString(dateInput?: Date | string | null): string {
  if (!dateInput) return toLocalDateString();
  if (typeof dateInput === 'string') return extractLiteralDate(dateInput) || toLocalDateString();
  return toLocalDateString(dateInput);
}
