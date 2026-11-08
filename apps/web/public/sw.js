// apps/web/public/sw.js
// Service Worker do Nosso Dia — Gerenciamento de Web Push e Notificações de Alarme

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Tratamento do Evento Push (disparado em segundo plano mesmo com app fechado)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nosso Dia — Lembrete de Atividade',
    body: 'Você tem um compromisso familiar agendado para agora!',
    url: '/?alarm=true',
    tag: 'nosso-dia-alarm',
    activityId: undefined
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [400, 150, 400, 150, 600],
    tag: data.tag || 'nosso-dia-alarm',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/?alarm=true',
      activityId: data.activityId
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Tratamento do Clique na Notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/?alarm=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se houver uma janela aberta do app, foca nela e redireciona para a rota com alarme
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se nenhuma janela estiver aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

