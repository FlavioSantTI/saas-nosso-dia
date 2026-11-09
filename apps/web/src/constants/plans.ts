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
    monthly_ai_credits: 15,
    allowed_ai_modalities: ['TEXT', 'PDF'],
    trialDays: 14,
    badge: '14 dias grátis',
    features: [
      '14 dias de teste completo sem cartão',
      '15 créditos de IA por mês',
      '1 importação teste de roteiro de provas (PDF/Foto)',
      'Mural da Família & Escola compartilhado',
      'Coordenação semanal para até 4 membros',
      'Alertas de conflito de rotinas e caronas',
    ],
    is_active: true,
  },
  {
    id: 'plan-essencial',
    name: 'Família Essencial',
    slug: 'essencial',
    price_cents: 5990,
    billing_interval: 'MONTHLY',
    max_members: 5,
    has_ai_access: true,
    monthly_ai_credits: 60,
    allowed_ai_modalities: ['TEXT', 'AUDIO'],
    badge: 'Para Começar',
    features: [
      '60 créditos de IA por mês',
      'Captura rápida por Texto e Mensagem de Voz',
      'Mural da Família com criação manual + 2 importações IA/mês',
      'Até 5 membros da família conectados',
      'Briefing matinal e resumo operacional no WhatsApp',
      'Kanban semanal com drag & drop',
      'Alertas de logística e lembretes inteligentes',
    ],
    is_active: true,
  },
  {
    id: 'plan-pro-ia',
    name: 'Família Pro IA',
    slug: 'pro-ia',
    price_cents: 8990,
    billing_interval: 'MONTHLY',
    max_members: 10,
    has_ai_access: true,
    monthly_ai_credits: 160,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
    isPopular: true,
    badge: 'Mais Escolhido',
    features: [
      '160 créditos de IA por mês',
      'Mural Escolar Completo com Importação IA (PDF, Word e Fotos)',
      'Extração automática de provas, capítulos e trabalhos da nota',
      'Visualizador do documento original anexado (📎 Ver original)',
      'Captura multimodal completa: Texto, Áudio, Fotos e PDFs',
      'Membros da família ilimitados (até 10)',
      'Balanço de logística e divisão equilibrada entre o casal',
      'Suporte prioritário via WhatsApp',
    ],
    is_active: true,
  },
  {
    id: 'plan-pro-ia-anual',
    name: 'Família Pro IA Anual',
    slug: 'pro-ia-anual',
    price_cents: 87990,
    billing_interval: 'YEARLY',
    max_members: 10,
    has_ai_access: true,
    monthly_ai_credits: 320,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
    badge: 'Melhor Valor',
    discountNote: 'Economia de R$ 198,90 em relação ao plano mensal (~R$ 73,32/mês)',
    features: [
      '320 créditos de IA por mês (3.840 no ano)',
      'Economia de R$ 198,90 em relação ao mensal',
      'Suporte total durante todo o ano letivo escolar',
      'Mural Escolar Ilimitado com IA e leitor de PDFs/Docs',
      '1 GB de armazenamento para circulares, roteiros e anexos',
      'Membros da família ilimitados (até 10)',
      'Processamento prioritário com IA Gemini 2.5',
      'Acesso antecipado a novos recursos e automações',
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
