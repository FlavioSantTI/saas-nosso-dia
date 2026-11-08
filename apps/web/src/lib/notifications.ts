import { EventItem } from '../types';
import { registerPushService } from './pushSubscription';

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
 * Solicita permissão para notificações do navegador e registra o Service Worker / Push Subscription
 */
export async function requestNotificationPermission(
  userId?: string,
  familyId?: string
): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (userId) {
      const res = await registerPushService(userId, familyId);
      return res.permission || Notification.permission;
    }

    if (Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
        }
        return perm;
      } catch (err) {
        console.warn('Erro ao solicitar permissão de notificação:', err);
      }
    }
    return Notification.permission;
  }
  return 'denied';
}

export interface SendNotificationOptions {
  body: string;
  url?: string;
  activityId?: string;
  tag?: string;
}

/**
 * Dispara uma notificação via Service Worker (ou fallback nativo) e/ou exibe toast visual in-app
 */
export async function sendNotification(
  title: string,
  optionsOrBody: string | SendNotificationOptions,
  onInApp?: (msg: string) => void
) {
  const options: SendNotificationOptions =
    typeof optionsOrBody === 'string' ? { body: optionsOrBody } : optionsOrBody;

  // Callback in-app para toast visual sempre presente
  if (onInApp) {
    onInApp(options.body);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notificationTag = options.tag || `nosso-dia-${Date.now()}`;
  const targetUrl = options.url || `/?alarm=true${options.activityId ? `&activityId=${options.activityId}` : ''}`;

  // Prioriza o Service Worker para garantir vibração e interação profunda
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body: options.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [400, 150, 400, 150, 600],
          tag: notificationTag,
          renotify: true,
          requireInteraction: true,
          data: {
            url: targetUrl,
            activityId: options.activityId
          }
        } as any);
        return;
      }
    }
  } catch (swErr) {
    console.warn('[Notifications] Erro ao disparar via Service Worker, tentando fallback:', swErr);
  }

  // Fallback nativo
  try {
    const notif = new Notification(title, {
      body: options.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notificationTag,
    });
    notif.onclick = () => {
      window.focus();
      window.location.href = targetUrl;
    };
  } catch (e) {
    console.warn('[Notifications] Erro ao disparar notificação nativa:', e);
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

    // Chave única para controle da flag notified: true
    const reminderKey = `${event.id}_${event.start_time}_${event.reminder_minutes}`;

    // Tolerância: se o horário atual estiver entre (horário_alerta) e (início_do_evento + 2 min)
    const isWithinAlertWindow = nowMs >= alertTime && nowMs <= eventTime + 2 * 60 * 1000;

    if (isWithinAlertWindow && !notifiedReminders.has(reminderKey)) {
      notifiedReminders.add(reminderKey); // Marcar como notificado (notified: true)

      const responsibleName = event.responsible?.name || 'Não definido';
      const reminderText =
        event.reminder_minutes === 0
          ? `🔔 Lembrete: "${event.title}" está começando agora! Responsável: ${responsibleName}.`
          : `🔔 Lembrete: "${event.title}" começará em ${event.reminder_minutes} minutos! Responsável: ${responsibleName}.`;

      sendNotification(
        'Nosso Dia — Lembrete de Atividade',
        {
          body: reminderText,
          activityId: event.id,
          url: `/?alarm=true&activityId=${event.id}&title=${encodeURIComponent(event.title)}`
        },
        onInAppNotification
      );
    }
  });
}

/**
 * Inicia o agendador de verificação periódica (a cada 10 segundos)
 */
export function startNotificationScheduler(
  getEvents: () => EventItem[],
  onInAppNotification?: (msg: string) => void,
  userId?: string,
  familyId?: string
): () => void {
  // Solicita permissão inicial se necessário e registra Service Worker
  requestNotificationPermission(userId, familyId);

  const intervalId = setInterval(() => {
    const currentEvents = getEvents();
    checkEventReminders(currentEvents, onInAppNotification);
  }, 10000);

  // Primeira verificação imediata
  checkEventReminders(getEvents(), onInAppNotification);

  return () => clearInterval(intervalId);
}
