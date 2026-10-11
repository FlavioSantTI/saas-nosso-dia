-- ==============================================================================
-- MÓDULO SUPER-ADMIN, PLANOS E ASSINATURAS (ASAAS GATEWAY)
-- ==============================================================================

-- 1. Tabela de Administradores da Plataforma (Super-Admins)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_platform_admin_user UNIQUE (user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view admin list"
    ON public.platform_admins FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- 2. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL DEFAULT 0,
    billing_interval TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY', 'YEARLY')),
    max_members INTEGER NOT NULL DEFAULT 5,
    has_ai_access BOOLEAN NOT NULL DEFAULT false,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Planos são públicos para leitura por qualquer usuário autenticado ou visitante
CREATE POLICY "Anyone can view active plans"
    ON public.plans FOR SELECT
    USING (true);

CREATE POLICY "Super admins can manage plans"
    ON public.plans FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
    );

-- Inserção de Planos Padrão do Nosso Dia
INSERT INTO public.plans (id, name, slug, price_cents, billing_interval, max_members, has_ai_access, features, is_active)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'Degustação (Trial)', 'trial', 0, 'MONTHLY', 4, true, '["Até 4 membros familiares", "Sincronização em tempo real", "Captura com Inteligência Artificial (14 dias)", "Visualização Semana, Dia e Mês"]'::jsonb, true),
    ('d2222222-2222-2222-2222-222222222222', 'Família Essencial', 'essencial', 2990, 'MONTHLY', 5, false, '["Até 5 membros familiares", "Sincronização ilimitada", "Painel de Resumo & Balanço", "Histórico de atividades", "Lembretes e notificações"]'::jsonb, true),
    ('d3333333-3333-3333-3333-333333333333', 'Família Pro IA', 'pro-ia', 4990, 'MONTHLY', 10, true, '["Membros familiares ilimitados (até 10)", "Captura Inteligente com Gemini IA", "Briefing Matinal Personalizado", "Sugestão automática de responsáveis", "Suporte prioritário via WhatsApp"]'::jsonb, true),
    ('d4444444-4444-4444-4444-444444444444', 'Família Pro IA Anual', 'pro-ia-anual', 47880, 'YEARLY', 10, true, '["2 meses grátis (economia de R$ 120/ano)", "Membros familiares ilimitados", "Acesso total a recursos de IA", "Briefing Matinal e Resumo Semanal"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    features = EXCLUDED.features;

-- 3. Tabela de Assinaturas (Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED')),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
    asaas_customer_id TEXT NULL,
    asaas_subscription_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_family_subscription UNIQUE (family_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_members.family_id = subscriptions.family_id 
            AND family_members.user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Admins or platform admins can update subscriptions"
    ON public.subscriptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
    );

-- 4. Função RPC: is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE user_id = auth.uid()
    );
$$;
