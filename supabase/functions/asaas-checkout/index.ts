// Supabase Edge Function: asaas-checkout
// Executa no servidor (Deno) sem expor a chave do Asaas no navegador e sem bloqueio de CORS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      familyId,
      customerId: existingCustomerId,
      customerName,
      customerEmail,
      cpfCnpj,
      planSlug,
      planName,
      priceCents,
      billingInterval,
      billingType
    } = body;

    // 1. Obtém chave e ambiente do Asaas do Cofre AES-256 (ou env vars da Edge Function)
    const { data: vaultApiKey } = await supabase.rpc('get_active_ai_key', { p_provider: 'asaas_api_key' });
    const { data: vaultEnv } = await supabase.rpc('get_active_ai_key', { p_provider: 'asaas_environment' });

    const apiKey = (vaultApiKey && String(vaultApiKey).trim()) || Deno.env.get('ASAAS_API_KEY') || '';
    const env = (vaultEnv && String(vaultEnv).trim().toLowerCase()) || Deno.env.get('ASAAS_ENVIRONMENT') || 'sandbox';
    const baseUrl = env === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave da API do Asaas não configurada no Cofre Super-Admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cria ou reutiliza o cliente no Asaas
    let asaasCustomerId = existingCustomerId && !String(existingCustomerId).startsWith('cus_sim_')
      ? existingCustomerId
      : null;

    if (!asaasCustomerId) {
      const custRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: apiKey
        },
        body: JSON.stringify({
          name: customerName || 'Família Nosso Dia',
          email: customerEmail || 'assinatura@nossodia.app',
          cpfCnpj: cpfCnpj ? String(cpfCnpj).replace(/\D/g, '') : undefined,
          externalReference: familyId || undefined
        })
      });

      const custJson = await custRes.json();
      if (!custRes.ok) {
        throw new Error(custJson?.errors?.[0]?.description || 'Falha ao cadastrar cliente no Asaas.');
      }
      asaasCustomerId = custJson.id;
    }

    // 3. Cria a assinatura recorrente no Asaas
    const valueInReais = Number(priceCents || 5990) / 100;
    const cycle = billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const subRes = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billingType || 'PIX',
        value: valueInReais,
        nextDueDate: tomorrow,
        cycle,
        externalReference: familyId || undefined,
        description: `Assinatura Nosso Dia - ${planName || planSlug} (${cycle === 'YEARLY' ? 'Anual' : 'Mensal'})`
      })
    });

    const subJson = await subRes.json();
    if (!subRes.ok) {
      throw new Error(subJson?.errors?.[0]?.description || 'Falha ao gerar assinatura no Asaas.');
    }

    // 4. Obtém a 1ª fatura e QR Code Pix (se aplicável)
    let invoiceUrl: string | undefined = subJson.paymentLink || undefined;
    let pixQrCode: string | undefined;
    let pixQrCodeImage: string | undefined;

    const paymentsRes = await fetch(`${baseUrl}/subscriptions/${subJson.id}/payments`, {
      headers: { access_token: apiKey }
    });

    if (paymentsRes.ok) {
      const paymentsJson = await paymentsRes.json();
      const firstPayment = paymentsJson?.data?.[0];
      if (firstPayment) {
        invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || invoiceUrl;
        if (billingType === 'PIX' && firstPayment.id) {
          const pixRes = await fetch(`${baseUrl}/payments/${firstPayment.id}/pixQrCode`, {
            headers: { access_token: apiKey }
          });
          if (pixRes.ok) {
            const pixJson = await pixRes.json();
            pixQrCode = pixJson?.payload || undefined;
            pixQrCodeImage = pixJson?.encodedImage ? `data:image/png;base64,${pixJson.encodedImage}` : undefined;
          }
        }
      }
    }

    // 5. Atualiza a tabela public.subscriptions da família
    if (familyId) {
      const { data: planRow } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', planSlug)
        .maybeSingle();

      const updateFields: Record<string, unknown> = {
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subJson.id,
        billing_type: billingType || 'PIX',
        billing_cycle: cycle,
        cpf_cnpj: cpfCnpj ? String(cpfCnpj).replace(/\D/g, '') : null,
        last_invoice_url: invoiceUrl || null,
        last_pix_payload: pixQrCode || null,
        updated_at: new Date().toISOString()
      };

      if (planRow?.id) {
        updateFields.plan_id = planRow.id;
      }

      await supabase.from('subscriptions').update(updateFields).eq('family_id', familyId);
    }

    return new Response(
      JSON.stringify({
        id: subJson.id,
        customer: asaasCustomerId,
        value: valueInReais,
        nextDueDate: subJson.nextDueDate || tomorrow,
        cycle,
        billingType: billingType || 'PIX',
        status: 'ACTIVE',
        paymentLink: invoiceUrl,
        pixQrCode,
        pixQrCodeImage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro interno no checkout Asaas.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

