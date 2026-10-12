/**
 * Utilitários de sanitização defensiva e limites de entrada para proteção contra DoS,
 * injeção e violações de constraints do banco de dados (ex: chk_event_title_len, chk_routine_title_len).
 */

export const MAX_EVENT_TITLE_LENGTH = 100;
export const MAX_ROUTINE_TITLE_LENGTH = 100;
export const MAX_LOCATION_NAME_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const MAX_AI_PROMPT_LENGTH = 1000;

/**
 * Sanitiza texto removendo tags HTML, scripts e caracteres invisíveis de controle,
 * cortando para o tamanho máximo estipulado.
 */
export function sanitizeInput(value: string | null | undefined, maxLength: number = MAX_EVENT_TITLE_LENGTH): string {
  if (!value) return '';
  return value
    .replace(/<[^>]*>?/gm, '') // Remove tags HTML/scripts
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle ASCII/Unicode
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitiza especificamente títulos de atividades e rotinas garantindo que respeite a constraint PostgreSQL.
 */
export function sanitizeTitle(title: string | null | undefined): string {
  return sanitizeInput(title, MAX_EVENT_TITLE_LENGTH);
}

/**
 * Validação rigorosa de título para submissão
 */
export function validateTitle(title: string | null | undefined): { isValid: boolean; error?: string } {
  const sanitized = sanitizeTitle(title);
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'O título da atividade é obrigatório.' };
  }
  if (sanitized.length > MAX_EVENT_TITLE_LENGTH) {
    return { isValid: false, error: `O título deve ter no máximo ${MAX_EVENT_TITLE_LENGTH} caracteres.` };
  }
  return { isValid: true };
}
