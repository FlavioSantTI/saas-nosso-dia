import { Plan } from '../types';

export interface LandingPlan extends Plan {
  badge?: string;
  isPopular?: boolean;
  trialDays?: number;
  discountNote?: string;
  modalitiesLabels?: string[];
}

/**
 * Planos estáticos locais para fallback de resiliência.
 * Utilizados caso a consulta à tabela public.plans do Supabase sofra timeout (>3s) ou falha de rede.
 */
export const FALLBACK_PLANS: LandingPlan[] = [
  {
    id: 'plan-trial',
    name: 'Degustação',
    slug: 'trial',
    price_cents: 0,
    billing_interval: 'MONTHLY',
    max_members: 4,
    has_ai_access: true,
    monthly_ai_credits: 10,
    allowed_ai_modalities: ['TEXT'],
    trialDays: 14,
    badge: '14 dias grátis',
    features: [
      '14 dias de teste completo sem cobrança',
      '10 créditos mensais de IA (Texto)',
      'Coordenação semanal para até 4 membros',
      'Sincronização em tempo real entre celulares',
      'Alertas de conflito de rotinas',
      'Sem exigência de cartão de crédito',
    ],
    is_active: true,
  },
  {
    id: 'plan-essencial',
    name: 'Família Essencial',
    slug: 'essencial',
    price_cents: 3990,
    billing_interval: 'MONTHLY',
    max_members: 5,
    has_ai_access: true,
    monthly_ai_credits: 45,
    allowed_ai_modalities: ['TEXT', 'AUDIO'],
    features: [
      '45 créditos de IA por mês',
      'Captura por Texto e Áudio / Mensagem de Voz',
      'Até 5 membros da família conectados',
      'Briefing matinal e resumo operacional',
      'Kanban semanal com drag & drop',
      'Notificações e lembretes inteligentes',
    ],
    is_active: true,
  },
  {
    id: 'plan-pro-ia',
    name: 'Família Pro IA',
    slug: 'pro-ia',
    price_cents: 6990,
    billing_interval: 'MONTHLY',
    max_members: 10,
    has_ai_access: true,
    monthly_ai_credits: 120,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE'],
    isPopular: true,
    badge: 'Mais escolhido',
    features: [
      '120 créditos de IA por mês',
      'Captura multimodal: Texto, Voz e Fotos de bilhetes',
      'Membros familiares ilimitados (até 10)',
      'Leitura de recados escolares por foto',
      'Balanço de logística e divisão equilibrada entre o casal',
      'Suporte prioritário via WhatsApp',
    ],
    is_active: true,
  },
  {
    id: 'plan-pro-ia-anual',
    name: 'Família Pro IA Anual',
    slug: 'pro-ia-anual',
    price_cents: 67999,
    billing_interval: 'YEARLY',
    max_members: 10,
    has_ai_access: true,
    monthly_ai_credits: 250,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
    badge: 'Melhor Valor',
    discountNote: 'Economia de R$ 158,81 em relação ao plano mensal',
    features: [
      '250 créditos de IA por mês (3.000 no ano)',
      'Suporte completo a PDFs, Fotos, Voz e Texto',
      'Leitura de cronogramas escolares em PDF',
      'Desconto anual de R$ 158,81 em relação ao mensal',
      'Membros familiares ilimitados (até 10)',
      'Processamento prioritário com IA',
    ],
    is_active: true,
  },
];

/**
 * Formatação de moeda BRL segura e limpa
 */
export function formatPlanPrice(priceCents: number, interval: 'MONTHLY' | 'YEARLY'): string {
  if (priceCents === 0) return 'Grátis';
  const val = priceCents / 100;
  const formatted = val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted}${interval === 'YEARLY' ? '/ano' : '/mês'}`;
}
