// Supabase Edge Function: asaas-webhook
// Recebe notificações automáticas do Asaas (PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, SUBSCRIPTION_CANCELED)
// e atualiza a assinatura da família + zera o contador de créditos IA no novo ciclo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verifica token de segurança do Webhook Asaas (se configurado no Cofre AES-256)
    const { data: expectedToken } = await supabase.rpc('get_active_ai_key', {
      p_provider: 'asaas_webhook_secret'
    });
    const receivedToken = req.headers.get('asaas-access-token');

    if (expectedToken && String(expectedToken).trim()) {
      if (!receivedToken || receivedToken.trim() !== String(expectedToken).trim()) {
        return new Response(JSON.stringify({ error: 'Token de webhook inválido.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const payload = await req.json();
    const event = String(payload?.event || '');
    const payment = payload?.payment || {};
    const asaasSubscriptionId = payment?.subscription || payload?.subscription?.id || null;
    const asaasCustomerId = payment?.customer || payload?.customer?.id || null;
    const externalFamilyId = payment?.externalReference || payload?.subscription?.externalReference || null;

    // 2. Localiza a assinatura correspondente no Supabase
    let subQuery = supabase.from('subscriptions').select('id, family_id, billing_cycle, status');
    if (asaasSubscriptionId) {
      subQuery = subQuery.eq('asaas_subscription_id', asaasSubscriptionId);
    } else if (externalFamilyId) {
      subQuery = subQuery.eq('family_id', externalFamilyId);
    } else if (asaasCustomerId) {
      subQuery = subQuery.eq('asaas_customer_id', asaasCustomerId);
    } else {
      return new Response(JSON.stringify({ received: true, ignored: 'Sem identificador de assinatura' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: subRow } = await subQuery.maybeSingle();
    if (!subRow) {
      return new Response(JSON.stringify({ received: true, warning: 'Assinatura não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Processa o evento de cobrança
    const now = new Date();
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const daysToAdd = subRow.billing_cycle === 'YEARLY' ? 365 : 30;
      const nextExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          ai_credits_used: 0, // Renova a franquia mensal de créditos IA!
          current_period_start: now.toISOString(),
          expires_at: nextExpiry,
          updated_at: now.toISOString()
        })
        .eq('id', subRow.id);
    } else if (event === 'PAYMENT_OVERDUE') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'PAST_DUE',
          updated_at: now.toISOString()
        })
        .eq('id', subRow.id);
    } else if (
      event === 'SUBSCRIPTION_CANCELED' ||
      event === 'SUBSCRIPTION_INACTIVATED' ||
      event === 'PAYMENT_DELETED'
    ) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'CANCELED',
          canceled_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', subRow.id);
    }

    return new Response(
      JSON.stringify({ received: true, event, subscriptionId: subRow.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro ao processar webhook Asaas.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

