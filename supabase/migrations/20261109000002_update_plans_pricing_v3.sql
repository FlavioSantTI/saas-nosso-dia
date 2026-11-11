-- =============================================================================
-- MIGRAÇÃO: ATUALIZAÇÃO DO CATÁLOGO DE PLANOS COMERCIAIS (v3.0.0)
-- Data: 2026-11-09
-- Objetivo: Reprecificar os planos e atualizar cotas de IA e features (JSONB)
--           para contemplar o novo Mural da Família e Leitor de Documentos (PDF).
-- =============================================================================

-- 1. Atualizar planos com novos valores em centavos, allowed_ai_modalities (text[]) e features (jsonb)
UPDATE public.plans
SET 
    price_cents = 0,
    monthly_ai_credits = 15,
    allowed_ai_modalities = ARRAY['TEXT', 'PDF']::text[],
    features = jsonb_build_array(
      '14 dias de teste completo sem cartão',
      '15 créditos de IA por mês',
      '1 importação teste de roteiro de provas (PDF/Foto)',
      'Mural da Família & Escola compartilhado',
      'Coordenação semanal para até 4 membros',
      'Alertas de conflito de rotinas e caronas'
    )
WHERE slug = 'trial';

UPDATE public.plans
SET 
    price_cents = 5990,
    monthly_ai_credits = 60,
    allowed_ai_modalities = ARRAY['TEXT', 'AUDIO']::text[],
    features = jsonb_build_array(
      '60 créditos de IA por mês',
      'Captura rápida por Texto e Mensagem de Voz',
      'Mural da Família com criação manual + 2 importações IA/mês',
      'Até 5 membros da família conectados',
      'Briefing matinal e resumo operacional no WhatsApp',
      'Kanban semanal com drag & drop',
      'Alertas de logística e lembretes inteligentes'
    )
WHERE slug = 'essencial';

UPDATE public.plans
SET 
    price_cents = 8990,
    monthly_ai_credits = 160,
    allowed_ai_modalities = ARRAY['TEXT', 'AUDIO', 'IMAGE', 'PDF']::text[],
    features = jsonb_build_array(
      '160 créditos de IA por mês',
      'Mural Escolar Completo com Importação IA (PDF, Word e Fotos)',
      'Extração automática de provas, capítulos e trabalhos da nota',
      'Visualizador do documento original anexado (📎 Ver original)',
      'Captura multimodal completa: Texto, Áudio, Fotos e PDFs',
      'Membros da família ilimitados (até 10)',
      'Balanço de logística e divisão equilibrada entre o casal',
      'Suporte prioritário via WhatsApp'
    )
WHERE slug = 'pro-ia';

UPDATE public.plans
SET 
    price_cents = 87990,
    monthly_ai_credits = 320,
    allowed_ai_modalities = ARRAY['TEXT', 'AUDIO', 'IMAGE', 'PDF']::text[],
    features = jsonb_build_array(
      '320 créditos de IA por mês (3.840 no ano)',
      'Economia de R$ 198,90 em relação ao mensal',
      'Suporte total durante todo o ano letivo escolar',
      'Mural Escolar Ilimitado com IA e leitor de PDFs/Docs',
      '1 GB de armazenamento para circulares, roteiros e anexos',
      'Membros da família ilimitados (até 10)',
      'Processamento prioritário com IA Gemini 2.5',
      'Acesso antecipado a novos recursos e automações'
    )
WHERE slug = 'pro-ia-anual';

-- 2. Atualizar custos de IA na tabela platform_settings (pesos de créditos)
UPDATE public.platform_settings
SET 
    ai_cost_text = 1,
    ai_cost_audio = 2,
    ai_cost_image = 3,
    ai_cost_pdf = 5,
    updated_at = now()
WHERE id IS NOT NULL;



