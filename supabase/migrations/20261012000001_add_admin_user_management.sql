-- Migration: 20261012000001_add_admin_user_management.sql
-- Adiciona RPCs para gestão administrativa de usuários pelo Super-Admin

-- 1. RPC para ativar/desativar usuário
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(p_user_id UUID, p_activate BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se o executor é super admin ou service_role
    IF NOT (
        EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Super-Admins podem alterar o status de usuários.';
    END IF;

    IF p_activate THEN
        -- Reativa usuário limpando data de banimento
        UPDATE auth.users 
        SET banned_until = NULL, updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        -- Desativa o usuário aplicando banimento permanente até que seja reativado
        UPDATE auth.users 
        SET banned_until = '2999-12-31 23:59:59+00'::timestamptz, updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- 2. Concede permissão de execução para usuários autenticados (a validação de super admin é feita internamente)
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(UUID, BOOLEAN) TO service_role;
