import { Plan } from '../types';
import { supabase } from './supabase';

/**
 * Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) enquanto o usuário digita.
 */
export function formatCpfCnpjMask(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Valida CPF (11 dígitos) ou CNPJ (14 dígitos).
 */
export function validateCpfCnpj(raw: string): boolean {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

/**
 * Obtém a configuração do Asaas (API Key + Ambiente) descriptografada do Cofre AES-256
 * ou das variáveis de ambiente de fallback.
 */
export async function getAsaasConfig(): Promise<{
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}> {
  let apiKey = import.meta.env.VITE_ASAAS_API_KEY || '';
  let environment: 'sandbox' | 'production' = import.meta.env.PROD ? 'production' : 'sandbox';

  try {
    const [keyRes, envRes] = await Promise.all([
      supabase.rpc('get_active_ai_key', { p_provider: 'asaas_api_key' }),
      supabase.rpc('get_active_ai_key', { p_provider: 'asaas_environment' })
    ]);

    if (!keyRes.error && typeof keyRes.data === 'string' && keyRes.data.trim()) {
      apiKey = keyRes.data.trim();
    }
    if (!envRes.error && typeof envRes.data === 'string' && envRes.data.trim()) {
      const cleanEnv = envRes.data.trim().toLowerCase();
      if (cleanEnv === 'production' || cleanEnv === 'sandbox') {
        environment = cleanEnv;
      }
    }
  } catch {
    // Fallback para variáveis de ambiente
  }

  // Detecta automaticamente o ambiente pelo prefixo oficial da chave Asaas ($aact_hmlg_ vs $aact_prod_)
  if (apiKey.includes('_hmlg_')) {
    environment = 'sandbox';
  } else if (apiKey.includes('_prod_')) {
    environment = 'production';
  }

  const proxyBase = environment === 'production' ? '/api/asaas-prod' : '/api/asaas-sandbox';
  const directBase = environment === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';
  const baseUrl =
    import.meta.env.VITE_ASAAS_API_URL ||
    (typeof window !== 'undefined' ? proxyBase : directBase);

  return { apiKey, environment, baseUrl };
}

function normalizeAsaasFetchError(err: any): Error {
  const msg = err?.message || '';
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(
      'Não foi possível conectar ao gateway Asaas (CORS/rede). Verifique se o proxy do servidor (/api/asaas-sandbox) ou a Edge Function asaas-checkout estão atualizados.'
    );
  }
  return err instanceof Error ? err : new Error(msg || 'Erro desconhecido ao comunicar com o Asaas.');
}

function buildAsaasHeaders(apiKey: string, includeJsonContentType = false): Record<string, string> {
  // Envia também via X-Asaas-Access-Token para sobreviver a proxies Nginx que removem headers com underscore
  const headers: Record<string, string> = {
    access_token: apiKey,
    'X-Asaas-Access-Token': apiKey,
  };
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function parseAsaasError(
  res: Response,
  fallbackMessage: string,
  environment: 'sandbox' | 'production'
): Promise<Error> {
  const errData = await res.json().catch(() => ({}));
  const apiDescription = errData?.errors?.[0]?.description || errData?.message;
  if (apiDescription) {
    return new Error(apiDescription);
  }
  if (res.status === 401) {
    return new Error(
      `Chave de API Asaas recusada ou ausente no ambiente ${environment.toUpperCase()} (HTTP 401). Verifique no Super-Admin se a chave ($aact_${environment === 'production' ? 'prod' : 'hmlg'}_...) é válida.`
    );
  }
  return new Error(`${fallbackMessage} (${res.status})`);
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasSubscriptionResponse {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'YEARLY';
  billingType: 'PIX' | 'CREDIT_CARD';
  status: 'ACTIVE' | 'INACTIVE';
  paymentLink?: string;
  pixQrCode?: string;
  pixQrCodeImage?: string;
}

export interface ParsedWebhookResult {
  event: string;
  subscriptionId?: string | null;
  customerId?: string | null;
  paymentId?: string | null;
  newStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNKNOWN';
  message: string;
  receivedAt: string;
}

/**
 * Cria ou recupera um cliente no Asaas.
 */
export async function createAsaasCustomer(
  name: string,
  email: string,
  cpfCnpj?: string
): Promise<AsaasCustomer> {
  const { apiKey, environment, baseUrl } = await getAsaasConfig();
  const cleanCpfCnpj = cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined;

  if (!apiKey) {
    console.info('[Asaas Sandbox/Simulação] Chave Asaas não configurada no cofre. Simulando criação de cliente.');
    return {
      id: `cus_sim_${Date.now()}`,
      name,
      email,
      cpfCnpj: cleanCpfCnpj || '00000000000',
    };
  }

  try {
    const res = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: buildAsaasHeaders(apiKey, true),
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cleanCpfCnpj,
      }),
    });

    if (!res.ok) {
      throw await parseAsaasError(res, 'Erro HTTP Asaas', environment);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
    };
  } catch (err: any) {
    console.error('[Asaas] Falha ao criar cliente:', err);
    throw normalizeAsaasFetchError(err);
  }
}

async function resolveOrCreateAsaasCustomerId(
  baseUrl: string,
  apiKey: string,
  environment: 'sandbox' | 'production',
  candidateId: string,
  options?: {
    familyId?: string;
    customerName?: string;
    customerEmail?: string;
    cpfCnpj?: string;
  }
): Promise<string> {
  const isSynthetic =
    !candidateId || candidateId.startsWith('cus_fam_') || candidateId.startsWith('cus_sim_');
  if (!isSynthetic) {
    return candidateId;
  }

  const cleanCpfCnpj = options?.cpfCnpj ? options.cpfCnpj.replace(/\D/g, '') : undefined;

  // Tenta localizar cliente já cadastrado pelo CPF/CNPJ no Asaas para evitar duplicidade
  if (cleanCpfCnpj) {
    const searchRes = await fetch(
      `${baseUrl}/customers?cpfCnpj=${encodeURIComponent(cleanCpfCnpj)}`,
      { headers: buildAsaasHeaders(apiKey) }
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json().catch(() => ({}));
      const existingId = searchJson?.data?.[0]?.id;
      if (existingId) {
        return existingId;
      }
    }
  }

  const fallbackEmail =
    options?.customerEmail?.trim() ||
    `assinatura-${(options?.familyId || 'familia').slice(0, 8)}@nossodia.app`;

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: buildAsaasHeaders(apiKey, true),
    body: JSON.stringify({
      name: options?.customerName?.trim() || 'Titular Nosso Dia',
      email: fallbackEmail,
      cpfCnpj: cleanCpfCnpj,
      externalReference: options?.familyId || undefined,
      notificationDisabled: false,
    }),
  });

  if (!createRes.ok) {
    throw await parseAsaasError(createRes, 'Erro ao cadastrar cliente no Asaas', environment);
  }

  const created = await createRes.json();
  if (!created?.id) {
    throw new Error('Asaas não retornou o identificador do cliente (cus_...).');
  }
  return created.id;
}

/**
 * Cria uma assinatura recorrente no Asaas (Pix ou Cartão de Crédito) e sincroniza
 * imediatamente com a tabela `public.subscriptions` da família.
 */
export async function createSubscription(
  customerId: string,
  plan: Plan,
  paymentMethod: 'PIX' | 'CREDIT_CARD',
  options?: {
    familyId?: string;
    customerName?: string;
    customerEmail?: string;
    cpfCnpj?: string;
  }
): Promise<AsaasSubscriptionResponse> {
  const valueInReais = plan.price_cents / 100;
  const cycle = plan.billing_interval === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 1. Tenta primeiro invocar a Supabase Edge Function `asaas-checkout` (evita CORS em produção)
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('asaas-checkout', {
      body: {
        familyId: options?.familyId,
        customerId,
        customerName: options?.customerName,
        customerEmail: options?.customerEmail,
        cpfCnpj: options?.cpfCnpj ? options.cpfCnpj.replace(/\D/g, '') : undefined,
        planSlug: plan.slug,
        planId: plan.id,
        planName: plan.name,
        priceCents: plan.price_cents,
        billingInterval: plan.billing_interval,
        billingType: paymentMethod
      }
    });

    if (!edgeErr && edgeData && edgeData.id) {
      return edgeData as AsaasSubscriptionResponse;
    }
  } catch {
    // Segue para execução direta / sandbox caso a Edge Function não esteja publicada
  }

  const { apiKey, environment, baseUrl } = await getAsaasConfig();

  let subResponse: AsaasSubscriptionResponse;

  if (!apiKey) {
    console.info('[Asaas Sandbox/Simulação] Simulando criação de assinatura para o plano:', plan.name);
    const mockId = `sub_sim_${Date.now()}`;
    const mockPixCode =
      paymentMethod === 'PIX'
        ? `00020126580014br.gov.bcb.pix0136nossodia-${plan.slug}-${Date.now()}5204000053039865405${valueInReais.toFixed(2)}5802BR5913NOSSO DIA APP6009SAO PAULO62070503***6304ABCD`
        : undefined;

    subResponse = {
      id: mockId,
      customer: customerId,
      value: valueInReais,
      nextDueDate: tomorrow,
      cycle,
      billingType: paymentMethod,
      status: 'ACTIVE',
      paymentLink: `https://sandbox.asaas.com/i/mock_${Date.now()}`,
      pixQrCode: mockPixCode,
    };
  } else {
    try {
      const resolvedCustomerId = await resolveOrCreateAsaasCustomerId(
        baseUrl,
        apiKey,
        environment,
        customerId,
        options
      );

      const res = await fetch(`${baseUrl}/subscriptions`, {
        method: 'POST',
        headers: buildAsaasHeaders(apiKey, true),
        body: JSON.stringify({
          customer: resolvedCustomerId,
          billingType: paymentMethod,
          value: valueInReais,
          nextDueDate: tomorrow,
          cycle,
          externalReference: options?.familyId || undefined,
          description: `Assinatura Nosso Dia - ${plan.name} (${plan.billing_interval === 'YEARLY' ? 'Anual' : 'Mensal'})`,
        }),
      });

      if (!res.ok) {
        throw await parseAsaasError(res, 'Erro ao gerar assinatura no Asaas', environment);
      }

      const data = await res.json();
      let invoiceUrl = data.paymentLink || undefined;
      let pixPayload: string | undefined;
      let pixQrImage: string | undefined;

      // Busca a 1ª cobrança gerada pela assinatura para extrair o link da fatura e o QR Code Pix
      try {
        const paymentsRes = await fetch(`${baseUrl}/subscriptions/${data.id}/payments`, {
          headers: buildAsaasHeaders(apiKey)
        });
        if (paymentsRes.ok) {
          const paymentsJson = await paymentsRes.json();
          const firstPayment = paymentsJson?.data?.[0];
          if (firstPayment) {
            invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || invoiceUrl;
            if (paymentMethod === 'PIX' && firstPayment.id) {
              const pixRes = await fetch(`${baseUrl}/payments/${firstPayment.id}/pixQrCode`, {
                headers: buildAsaasHeaders(apiKey)
              });
              if (pixRes.ok) {
                const pixJson = await pixRes.json();
                pixPayload = pixJson?.payload || undefined;
                pixQrImage = pixJson?.encodedImage ? `data:image/png;base64,${pixJson.encodedImage}` : undefined;
              }
            }
          }
        }
      } catch {
        // Silencioso se não conseguir buscar o QR Code imediatamente
      }

      subResponse = {
        id: data.id,
        customer: data.customer,
        value: data.value,
        nextDueDate: data.nextDueDate,
        cycle: data.cycle,
        billingType: data.billingType,
        status: 'ACTIVE',
        paymentLink: invoiceUrl,
        pixQrCode: pixPayload,
        pixQrCodeImage: pixQrImage
      };
    } catch (err: any) {
      console.error('[Asaas] Falha ao criar assinatura:', err);
      throw normalizeAsaasFetchError(err);
    }
  }

  // Persiste os dados da cobrança Asaas na assinatura da família no Supabase
  if (options?.familyId) {
    try {
      const { data: planRow } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', plan.slug)
        .maybeSingle();

      const updatePayload: Record<string, any> = {
        asaas_customer_id: subResponse.customer || customerId,
        asaas_subscription_id: subResponse.id,
        billing_type: paymentMethod,
        billing_cycle: cycle,
        cpf_cnpj: options.cpfCnpj ? options.cpfCnpj.replace(/\D/g, '') : null,
        last_invoice_url: subResponse.paymentLink || null,
        last_pix_payload: subResponse.pixQrCode || null,
        updated_at: new Date().toISOString()
      };

      if (planRow?.id) {
        updatePayload.plan_id = planRow.id;
      }

      await supabase
        .from('subscriptions')
        .update(updatePayload)
        .eq('family_id', options.familyId);
    } catch {
      // Silencioso caso colunas opcionais ainda não tenham sido migradas
    }
  }

  return subResponse;
}

/**
 * Trata webhooks do Asaas para atualizar status de assinatura no Supabase.
 * Reconhece PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE e SUBSCRIPTION_CANCELED.
 */
export function parseWebhookEvent(eventPayload: any): ParsedWebhookResult {
  const event = eventPayload?.event || '';
  const payment = eventPayload?.payment || {};
  const subscriptionId = payment?.subscription || eventPayload?.subscription?.id || null;
  const customerId = payment?.customer || eventPayload?.customer?.id || null;
  const paymentId = payment?.id || null;

  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      return {
        event,
        subscriptionId,
        customerId,
        paymentId,
        newStatus: 'ACTIVE',
        message: 'Pagamento recebido com sucesso. Assinatura ativa.',
        receivedAt: new Date().toISOString(),
      };

    case 'PAYMENT_OVERDUE':
      return {
        event,
        subscriptionId,
        customerId,
        paymentId,
        newStatus: 'PAST_DUE',
        message: 'Cobrança vencida. Assinatura em atraso.',
        receivedAt: new Date().toISOString(),
      };

    case 'PAYMENT_DELETED':
    case 'SUBSCRIPTION_CANCELED':
    case 'SUBSCRIPTION_INACTIVATED':
      return {
        event,
        subscriptionId,
        customerId,
        paymentId,
        newStatus: 'CANCELED',
        message: 'Assinatura cancelada ou inativada.',
        receivedAt: new Date().toISOString(),
      };

    default:
      return {
        event,
        subscriptionId,
        customerId,
        paymentId,
        newStatus: 'UNKNOWN',
        message: `Evento ignorado: ${event}`,
        receivedAt: new Date().toISOString(),
      };
  }
}

/**
 * Formata centavos para Real brasileiro (R$).
 * Ex: 2990 -> "R$ 29,90"
 */
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
