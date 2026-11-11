-- =============================================================================
-- MIGRAÇÃO: AUDITORIA DE TOKENS/CRÉDITOS DE IA E COBRANÇA ASAAS (v3.1.0)
-- Data: 2026-11-11
-- Objetivo:
--   1. Garantir colunas de créditos e faturamento em plans, subscriptions e platform_settings.
--   2. Criar a tabela public.ai_usage_logs para auditoria por família e global.
--   3. Criar RPCs verify_ai_quota_before_call e record_ai_usage (com regra de 1 importação
--      no Trial, 2 no Essencial e controle estrito de créditos).
-- =============================================================================

-- 1. Garantir colunas em public.plans
ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS monthly_ai_credits INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS allowed_ai_modalities TEXT[] NOT NULL DEFAULT ARRAY['TEXT']::TEXT[];

-- 2. Garantir colunas em public.subscriptions e política permissiva de leitura/atualização familiar
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
    ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'PIX',
    ADD COLUMN IF NOT EXISTS last_invoice_url TEXT,
    ADD COLUMN IF NOT EXISTS last_pix_payload TEXT;

DROP POLICY IF EXISTS "Allow family and admin access on subscriptions" ON public.subscriptions;
CREATE POLICY "Allow family and admin access on subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Garantir tabela public.platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_cost_text INTEGER NOT NULL DEFAULT 1,
    ai_cost_audio INTEGER NOT NULL DEFAULT 2,
    ai_cost_image INTEGER NOT NULL DEFAULT 3,
    ai_cost_pdf INTEGER NOT NULL DEFAULT 5,
    ai_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read on platform_settings" ON public.platform_settings;
CREATE POLICY "Allow read on platform_settings"
    ON public.platform_settings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow write on platform_settings" ON public.platform_settings;
CREATE POLICY "Allow write on platform_settings"
    ON public.platform_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

INSERT INTO public.platform_settings (ai_cost_text, ai_cost_audio, ai_cost_image, ai_cost_pdf, ai_enabled)
SELECT 1, 2, 3, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 4. Criar tabela de Auditoria de Tokens e Uso de IA (public.ai_usage_logs)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    user_id UUID,
    feature TEXT NOT NULL CHECK (feature IN ('AGENDA_QUICK_ADD', 'BOARD_IMPORT')),
    modality TEXT NOT NULL CHECK (modality IN ('TEXT', 'AUDIO', 'IMAGE', 'PDF', 'DOCX')),
    model_used TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    credits_charged INTEGER NOT NULL DEFAULT 1,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    items_generated INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'ERROR', 'BLOCKED_QUOTA')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_family_date
    ON public.ai_usage_logs (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
    ON public.ai_usage_logs (created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Allow all on ai_usage_logs"
    ON public.ai_usage_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. RPC: Validação de Cota e Regras Comerciais Antes da Chamada de IA
CREATE OR REPLACE FUNCTION public.verify_ai_quota_before_call(
    p_family_id UUID,
    p_feature TEXT DEFAULT 'AGENDA_QUICK_ADD',
    p_modality TEXT DEFAULT 'TEXT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings RECORD;
    v_sub RECORD;
    v_trial_plan_id UUID;
    v_cost INTEGER := 1;
    v_used INTEGER := 0;
    v_limit INTEGER := 15;
    v_plan_slug TEXT := 'trial';
    v_plan_name TEXT := 'Degustação';
    v_board_imports_count INTEGER := 0;
    v_modality_upper TEXT := UPPER(TRIM(COALESCE(p_modality, 'TEXT')));
    v_feature_upper TEXT := UPPER(TRIM(COALESCE(p_feature, 'AGENDA_QUICK_ADD')));
BEGIN
    -- 1. Lê parâmetros globais (kill-switch e pesos de créditos)
    SELECT * INTO v_settings
    FROM public.platform_settings
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_settings IS NOT NULL AND v_settings.ai_enabled = FALSE THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'AI_DISABLED',
            'message', 'O assistente de IA está temporariamente pausado para manutenção pelo administrador.'
        );
    END IF;

    -- Determina o custo em créditos da operação solicitada
    IF v_modality_upper = 'AUDIO' THEN
        v_cost := COALESCE(v_settings.ai_cost_audio, 2);
    ELSIF v_modality_upper = 'IMAGE' THEN
        v_cost := COALESCE(v_settings.ai_cost_image, 3);
    ELSIF v_modality_upper IN ('PDF', 'DOCX') THEN
        v_cost := COALESCE(v_settings.ai_cost_pdf, 5);
    ELSE
        v_cost := COALESCE(v_settings.ai_cost_text, 1);
    END IF;

    -- 2. Busca assinatura da família (ou cria assinatura Trial padrão automaticamente)
    SELECT
        s.id,
        s.status,
        s.ai_credits_used,
        s.current_period_end,
        p.slug AS plan_slug,
        p.name AS plan_name,
        p.monthly_ai_credits,
        p.allowed_ai_modalities
    INTO v_sub
    FROM public.subscriptions s
    LEFT JOIN public.plans p ON p.id = s.plan_id
    WHERE s.family_id = p_family_id
    LIMIT 1;

    IF v_sub IS NULL AND p_family_id IS NOT NULL THEN
        SELECT id INTO v_trial_plan_id FROM public.plans WHERE slug = 'trial' LIMIT 1;
        IF v_trial_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (family_id, plan_id, status, ai_credits_used, current_period_end)
            VALUES (p_family_id, v_trial_plan_id, 'TRIAL', 0, now() + INTERVAL '14 days')
            ON CONFLICT (family_id) DO NOTHING;

            SELECT
                s.id,
                s.status,
                s.ai_credits_used,
                s.current_period_end,
                p.slug AS plan_slug,
                p.name AS plan_name,
                p.monthly_ai_credits,
                p.allowed_ai_modalities
            INTO v_sub
            FROM public.subscriptions s
            LEFT JOIN public.plans p ON p.id = s.plan_id
            WHERE s.family_id = p_family_id
            LIMIT 1;
        END IF;
    END IF;

    IF v_sub IS NOT NULL THEN
        v_used := COALESCE(v_sub.ai_credits_used, 0);
        v_limit := COALESCE(v_sub.monthly_ai_credits, 15);
        v_plan_slug := COALESCE(v_sub.plan_slug, 'trial');
        v_plan_name := COALESCE(v_sub.plan_name, 'Degustação');

        IF v_sub.status IN ('CANCELED', 'PAST_DUE') THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'SUBSCRIPTION_INACTIVE',
                'plan_slug', v_plan_slug,
                'credits_cost', v_cost,
                'credits_used', v_used,
                'credits_limit', v_limit,
                'message', 'Sua assinatura encontra-se pendente ou inativa. Regularize seu plano para utilizar a Inteligência Artificial.'
            );
        END IF;
    END IF;

    -- 3. Regra de Importação de Documentos no Mural (BOARD_IMPORT)
    IF v_feature_upper = 'BOARD_IMPORT' THEN
        IF v_plan_slug = 'trial' THEN
            SELECT COUNT(*) INTO v_board_imports_count
            FROM public.ai_usage_logs
            WHERE family_id = p_family_id
              AND feature = 'BOARD_IMPORT'
              AND status = 'SUCCESS';

            IF v_board_imports_count >= 1 THEN
                RETURN jsonb_build_object(
                    'allowed', false,
                    'reason', 'TRIAL_IMPORT_LIMIT',
                    'plan_slug', v_plan_slug,
                    'credits_cost', v_cost,
                    'credits_used', v_used,
                    'credits_limit', v_limit,
                    'message', 'Você já utilizou sua 1 importação gratuita de roteiro escolar na Degustação! Faça upgrade para o Família Pro IA para continuar importando PDFs e comunicados.'
                );
            END IF;
        ELSIF v_plan_slug = 'essencial' THEN
            SELECT COUNT(*) INTO v_board_imports_count
            FROM public.ai_usage_logs
            WHERE family_id = p_family_id
              AND feature = 'BOARD_IMPORT'
              AND status = 'SUCCESS'
              AND created_at >= date_trunc('month', now());

            IF v_board_imports_count >= 2 THEN
                RETURN jsonb_build_object(
                    'allowed', false,
                    'reason', 'ESSENCIAL_IMPORT_LIMIT',
                    'plan_slug', v_plan_slug,
                    'credits_cost', v_cost,
                    'credits_used', v_used,
                    'credits_limit', v_limit,
                    'message', 'Você atingiu o limite de 2 importações mensais de documentos do plano Família Essencial. Faça upgrade para o Família Pro IA para importações ilimitadas!'
                );
            END IF;
        END IF;
    END IF;

    -- 4. Verifica saldo de créditos mensais da família
    IF (v_used + v_cost) > v_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'INSUFFICIENT_CREDITS',
            'plan_slug', v_plan_slug,
            'credits_cost', v_cost,
            'credits_used', v_used,
            'credits_limit', v_limit,
            'message', format(
                'Saldo insuficiente de créditos de IA (%s/%s usados no plano %s; esta ação requer %s crédito(s)). Faça upgrade do seu plano para liberar mais créditos!',
                v_used, v_limit, v_plan_name, v_cost
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'plan_slug', v_plan_slug,
        'plan_name', v_plan_name,
        'credits_cost', v_cost,
        'credits_used', v_used,
        'credits_limit', v_limit,
        'credits_remaining', GREATEST(0, v_limit - v_used)
    );
END;
$$;

-- 6. RPC: Registro de Auditoria de Tokens e Débito Atômico de Créditos
CREATE OR REPLACE FUNCTION public.record_ai_usage(
    p_family_id UUID,
    p_member_id UUID DEFAULT NULL,
    p_feature TEXT DEFAULT 'AGENDA_QUICK_ADD',
    p_modality TEXT DEFAULT 'TEXT',
    p_model_used TEXT DEFAULT 'gemini-2.5-flash',
    p_prompt_tokens INTEGER DEFAULT 0,
    p_completion_tokens INTEGER DEFAULT 0,
    p_total_tokens INTEGER DEFAULT 0,
    p_credits_charged INTEGER DEFAULT 1,
    p_estimated_cost_usd NUMERIC DEFAULT 0,
    p_items_generated INTEGER DEFAULT 1,
    p_status TEXT DEFAULT 'SUCCESS',
    p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_new_used INTEGER := 0;
BEGIN
    IF p_family_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'family_id ausente');
    END IF;

    INSERT INTO public.ai_usage_logs (
        family_id,
        member_id,
        user_id,
        feature,
        modality,
        model_used,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        credits_charged,
        estimated_cost_usd,
        items_generated,
        status,
        error_message
    )
    VALUES (
        p_family_id,
        p_member_id,
        auth.uid(),
        UPPER(TRIM(COALESCE(p_feature, 'AGENDA_QUICK_ADD'))),
        UPPER(TRIM(COALESCE(p_modality, 'TEXT'))),
        COALESCE(p_model_used, 'gemini-2.5-flash'),
        GREATEST(0, COALESCE(p_prompt_tokens, 0)),
        GREATEST(0, COALESCE(p_completion_tokens, 0)),
        GREATEST(0, COALESCE(p_total_tokens, COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0))),
        GREATEST(0, COALESCE(p_credits_charged, 1)),
        GREATEST(0, COALESCE(p_estimated_cost_usd, 0)),
        GREATEST(0, COALESCE(p_items_generated, 1)),
        UPPER(TRIM(COALESCE(p_status, 'SUCCESS'))),
        p_error_message
    )
    RETURNING id INTO v_log_id;

    -- Debita os créditos na assinatura da família apenas se a execução teve sucesso
    IF UPPER(TRIM(COALESCE(p_status, 'SUCCESS'))) = 'SUCCESS' AND COALESCE(p_credits_charged, 0) > 0 THEN
        UPDATE public.subscriptions
        SET
            ai_credits_used = COALESCE(ai_credits_used, 0) + p_credits_charged,
            updated_at = now()
        WHERE family_id = p_family_id
        RETURNING ai_credits_used INTO v_new_used;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'log_id', v_log_id,
        'ai_credits_used', COALESCE(v_new_used, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ai_quota_before_call(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_usage(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

