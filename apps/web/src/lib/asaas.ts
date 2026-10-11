import { Plan } from '../types';

/**
 * Configurações do Gateway Asaas.
 * Suporta Sandbox (ambiente de teste) e Produção.
 */
const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';
const ASAAS_BASE_URL =
  import.meta.env.VITE_ASAAS_API_URL ||
  (import.meta.env.PROD ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3');

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
  if (!ASAAS_API_KEY) {
    console.info('[Asaas Mock/Sandbox] VITE_ASAAS_API_KEY não configurada. Simulando criação de cliente.');
    return {
      id: `cus_sim_${Date.now()}`,
      name,
      email,
      cpfCnpj: cpfCnpj || '000.000.000-00',
    };
  }

  try {
    const res = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.errors?.[0]?.description || `Erro HTTP Asaas: ${res.status}`);
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
    throw err;
  }
}

/**
 * Cria uma assinatura recorrente no Asaas (Pix ou Cartão de Crédito).
 */
export async function createSubscription(
  customerId: string,
  plan: Plan,
  paymentMethod: 'PIX' | 'CREDIT_CARD'
): Promise<AsaasSubscriptionResponse> {
  const valueInReais = plan.price_cents / 100;
  const cycle = plan.billing_interval === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (!ASAAS_API_KEY) {
    console.info('[Asaas Mock/Sandbox] Simulando criação de assinatura para o plano:', plan.name);
    return {
      id: `sub_sim_${Date.now()}`,
      customer: customerId,
      value: valueInReais,
      nextDueDate: tomorrow,
      cycle,
      billingType: paymentMethod,
      status: 'ACTIVE',
      paymentLink: `https://sandbox.asaas.com/i/mock_${Date.now()}`,
      pixQrCode: paymentMethod === 'PIX' ? '00020126580014br.gov.bcb.pix0136mock-nosso-dia-pix-qrcode' : undefined,
    };
  }

  try {
    const res = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: paymentMethod,
        value: valueInReais,
        nextDueDate: tomorrow,
        cycle,
        description: `Assinatura Nosso Dia - ${plan.name} (${plan.billing_interval === 'YEARLY' ? 'Anual' : 'Mensal'})`,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.errors?.[0]?.description || `Erro ao gerar assinatura no Asaas (${res.status})`);
    }

    const data = await res.json();
    return {
      id: data.id,
      customer: data.customer,
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      billingType: data.billingType,
      status: 'ACTIVE',
      paymentLink: data.paymentLink || undefined,
    };
  } catch (err: any) {
    console.error('[Asaas] Falha ao criar assinatura:', err);
    throw err;
  }
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
