import { EventItem } from '../types';
import { extractLiteralDate, extractLiteralTime } from './dateUtils';

const ICS_TZID = 'America/Araguaina';

/**
 * Escapa caracteres especiais de campos TEXT conforme RFC 5545 (§3.3.11):
 * barra invertida, ponto e vírgula, vírgula e quebras de linha.
 */
function escapeIcsText(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Dobra linhas com mais de 75 octetos (RFC 5545 §3.1), sem quebrar
 * caracteres multibyte (acentos e emojis).
 */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75; // primeira linha: 75 octetos; continuações: 74 + espaço inicial

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = char;
      currentBytes = charBytes;
      limit = 74;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

/** Timestamp UTC real no formato exigido por DTSTAMP (YYYYMMDDTHHMMSSZ). */
function buildUtcStamp(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
  );
}

/** Soma minutos a uma data/hora nominal, avançando o dia se passar da meia-noite. */
function addMinutesNominal(dateStr: string, timeStr: string, minutes: number): { date: string; time: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const dt = new Date(y, m - 1, d, h, min + minutes, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`,
    time: `${p(dt.getHours())}:${p(dt.getMinutes())}`,
  };
}

/**
 * Gera e dispara o download de um arquivo .ics com VALARM (despertador nativo do iPhone/Android)
 * configurado para tocar 15 minutos antes e no horário exato da atividade.
 * Usa os horários nominais literais do banco (sem conversão de fuso / sem -3h).
 */
export function downloadNativeAlarmIcs(event: EventItem): void {
  const startDate = extractLiteralDate(event.start_time);
  const startTime = extractLiteralTime(event.start_time);
  if (!startDate || startTime === '--:--') {
    console.warn('[alarmIcs] Evento sem data/hora válida:', event.id);
    return;
  }

  // Fim: usa end_time literal; se ausente ou anterior ao início, assume +60 min
  let endDate = extractLiteralDate(event.end_time) || startDate;
  let endTime = extractLiteralTime(event.end_time);
  if (endTime === '--:--' || `${endDate}T${endTime}` <= `${startDate}T${startTime}`) {
    const fallback = addMinutesNominal(startDate, startTime, 60);
    endDate = fallback.date;
    endTime = fallback.time;
  }

  const dtStart = `${startDate.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
  const dtEnd = `${endDate.replace(/-/g, '')}T${endTime.replace(':', '')}00`;
  const title = event.title || 'Atividade';
  const location = event.location?.name || '';
  const responsible = event.responsible?.name ? `Responsável: ${event.responsible.name}` : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nosso Dia//Rotina Familiar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // VTIMEZONE obrigatório para TZID (RFC 5545). Araguaína: UTC-3 fixo, sem horário de verão.
    'BEGIN:VTIMEZONE',
    `TZID:${ICS_TZID}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:nossodia-${event.id}@nossodia.flaviosantiago.com.br`,
    `DTSTAMP:${buildUtcStamp()}`,
    `DTSTART;TZID=${ICS_TZID}:${dtStart}`,
    `DTEND;TZID=${ICS_TZID}:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`⏰ ${title}`)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(responsible)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Alerta de Saída (15 min): ${title}`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:AUDIO',
    `DESCRIPTION:${escapeIcsText(`HORA DA ATIVIDADE: ${title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsContent = lines.map(foldIcsLine).join('\r\n') + '\r\n';

  // Nome de arquivo seguro (sem acentos, barras ou caracteres especiais)
  const safeName =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60) || 'atividade';

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `alarme-${safeName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revogação adiada: o Safari/iOS pode cancelar o download se a URL for revogada imediatamente
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
