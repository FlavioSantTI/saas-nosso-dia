import { EventItem } from '../types';

// Conjunto para evitar disparos duplicados do mesmo lembrete (flag notified: true)
const notifiedReminders = new Set<string>();

/**
 * Converte a string de data/hora do evento (ISO ou timestamp) para um Date no fuso horário local do navegador.
 * Evita discrepâncias de fuso horário UTC (ex: 3 horas do Brasil).
 */
export function parseEventStartTime(startTimeStr: string): Date {
  if (!startTimeStr) return new Date();

  // Se for string ISO com ou sem Z, ou formato YYYY-MM-DDTHH:mm
  const clean = startTimeStr.replace('Z', '');
  const parts = clean.split('T');
  if (parts.length === 2) {
    const [datePart, timePart] = parts;
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(h)) {
      return new Date(y, m - 1, d, h, min || 0, 0, 0);
    }
  }

  const d = new Date(startTimeStr);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

/**
 * Solicita permissão para notificações do navegador se ainda não concedida
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission !== 'granted') {
      try {
        return await Notification.requestPermission();
      } catch (err) {
        console.warn('Erro ao solicitar permissão de notificação:', err);
      }
    }
    return Notification.permission;
  }
  return 'denied';
}

/**
 * Dispara uma notificação nativa do navegador e/ou exibe toast visual in-app
 */
export function sendNotification(title: string, body: string, onInApp?: (msg: string) => void) {
  // Callback in-app para toast visual sempre presente
  if (onInApp) {
    onInApp(body);
  }

  // Notificação nativa do navegador se permissão estiver concedida
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `nosso-dia-${Date.now()}`,
      });
    } catch (e) {
      console.warn('Erro ao disparar notificação nativa do navegador:', e);
    }
  }
}

/**
 * Verifica eventos e dispara notificações baseadas no reminder_minutes configurado.
 * Tolerância: dispare se o horário atual estiver entre (horário_alerta) e (início_do_evento + 2 min).
 */
export function checkEventReminders(
  events: EventItem[],
  onInAppNotification?: (msg: string) => void
) {
  const now = new Date();
  const nowMs = now.getTime();

  events.forEach((event) => {
    // Se reminder_minutes for null ou undefined, notificação está desativada ("Sem aviso")
    if (event.reminder_minutes === null || event.reminder_minutes === undefined) {
      return;
    }

    const eventDate = parseEventStartTime(event.start_time);
    const eventTime = eventDate.getTime();
    if (isNaN(eventTime)) return;

    const reminderMs = event.reminder_minutes * 60 * 1000;
    const alertTime = eventTime - reminderMs;
    const nextAlertTime = new Date(alertTime);

    // 4. Log de depuração no console F12 para contagem regressiva
    console.log("Verificando alertas:", nextAlertTime, "Agora:", now);

    // Chave única para controle da flag notified: true
    const reminderKey = `${event.id}_${event.start_time}_${event.reminder_minutes}`;

    // 2. Tolerância: se o horário atual estiver entre (horário_alerta) e (início_do_evento + 2 min)
    const isWithinAlertWindow = nowMs >= alertTime && nowMs <= eventTime + 2 * 60 * 1000;

    if (isWithinAlertWindow && !notifiedReminders.has(reminderKey)) {
      notifiedReminders.add(reminderKey); // Marcar como notificado (notified: true)

      const responsibleName = event.responsible?.name || 'Não definido';
      const reminderText =
        event.reminder_minutes === 0
          ? `🔔 Lembrete: "${event.title}" está começando agora! Responsável: ${responsibleName}.`
          : `🔔 Lembrete: "${event.title}" começará em ${event.reminder_minutes} minutos! Responsável: ${responsibleName}.`;

      sendNotification('Nosso Dia — Lembrete de Atividade', reminderText, onInAppNotification);
    }
  });
}

/**
 * Inicia o agendador de verificação periódica (a cada 10 segundos)
 */
export function startNotificationScheduler(
  getEvents: () => EventItem[],
  onInAppNotification?: (msg: string) => void
): () => void {
  // Solicita permissão inicial se necessário
  requestNotificationPermission();

  const intervalId = setInterval(() => {
    const currentEvents = getEvents();
    checkEventReminders(currentEvents, onInAppNotification);
  }, 10000);

  // Primeira verificação imediata
  checkEventReminders(getEvents(), onInAppNotification);

  return () => clearInterval(intervalId);
}
