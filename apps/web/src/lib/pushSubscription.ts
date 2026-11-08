// apps/web/src/lib/pushSubscription.ts
// Helper para Registro de Service Worker e Inscrição VAPID no Supabase

import { supabase } from './supabase';

/**
 * Converte chave pública VAPID codificada em Base64 para Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushRegistrationResult {
  success: boolean;
  permission?: NotificationPermission;
  subscription?: PushSubscription | null;
  error?: string;
}

/**
 * Registra o Service Worker do PWA e inscreve o dispositivo no Push Manager usando VAPID
 */
export async function registerPushService(
  userId: string,
  familyId?: string
): Promise<PushRegistrationResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Execução fora do navegador' };
  }

  // 1. Valida suporte do navegador
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Service Worker ou Push Manager não suportados.');
    return { success: false, error: 'Seu navegador não oferece suporte a Web Push Notifications.' };
  }

  try {
    // 2. Registra o Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Solicita permissão explícita
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        error: 'Permissão para notificações foi negada ou fechada pelo usuário.'
      };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey === 'sua_chave_publica_aqui') {
      console.info('[Push] Service Worker registrado com sucesso. VAPID key ausente ou padrão.');
      return { success: true, permission };
    }

    // 4. Inscrição no PushManager
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource
      });
    }

    // 5. Persistência da subscription no Supabase
    if (subscription) {
      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (p256dh && auth) {
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              user_id: userId,
              family_id: familyId || null,
              endpoint: subscription.endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent
            },
            { onConflict: 'endpoint' }
          );

        if (dbError) {
          console.warn('[Push] Erro ao salvar push subscription no Supabase:', dbError);
        }
      }
    }

    return {
      success: true,
      permission,
      subscription
    };
  } catch (err: any) {
    console.error('[Push] Erro ao registrar serviço de Web Push:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao registrar serviço de alarme e notificações.'
    };
  }
}
