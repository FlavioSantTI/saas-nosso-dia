// scripts/send-web-push.js
// Script para teste de disparo de Web Push Notifications usando as chaves VAPID do Nosso Dia
// Uso: node scripts/send-web-push.js [endpoint] [p256dh] [auth]

const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BLo7yZV7Vn4puRcRhvbqQyxVv-b5tU5gZE32Km0FqSLGR81rH31aCbzz3RsRBLzH5cg4OkhW2OGQR6E0fXANmeQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = 'mailto:contato@nossodia.flaviosantiago.com.br';

if (!VAPID_PRIVATE_KEY) {
  console.warn('⚠️ Defina a variável de ambiente VAPID_PRIVATE_KEY antes de disparar notificações push.');
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendPush(subscription, payload) {
  try {
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    console.log('✅ Push disparado com sucesso! Status HTTP:', res.statusCode);
  } catch (err) {
    console.error('❌ Falha ao enviar Web Push:', err);
  }
}

// Exemplo de payload com alarme
const samplePayload = {
  title: '⏰ Nosso Dia — Alarme de Atividade',
  body: 'Levar Rafael para a Escola agora!',
  url: 'https://nossodia.flaviosantiago.com.br/?alarm=true&title=Levar+para+Escola&time=06%3A50',
  tag: 'nosso-dia-alarm-escola',
  activityId: 'sample-activity-id'
};

// Se executado com argumentos via CLI
const args = process.argv.slice(2);
if (args.length >= 3) {
  const [endpoint, p256dh, auth] = args;
  sendPush({ endpoint, keys: { p256dh, auth } }, samplePayload);
} else {
  console.log('💡 Modo de uso:');
  console.log('node scripts/send-web-push.js <ENDPOINT> <P256DH> <AUTH>');
}

module.exports = { sendPush, samplePayload };

