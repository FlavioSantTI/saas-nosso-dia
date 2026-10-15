-- Migration: 20261014000001_secure_ai_keys_aes256.sql
-- Criptografia em Repouso AES-256 via OpenPGP (pgcrypto) para Chaves de Inteligência Artificial

-- 1. Habilita a extensão pgcrypto para criptografia simétrica com chave mestra
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela segura para credenciais e chaves de plataforma cifradas
CREATE TABLE IF NOT EXISTS public.platform_secure_settings (
    key TEXT PRIMARY KEY,
    encrypted_value BYTEA NOT NULL,
    key_fingerprint TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Ativa RLS para blindagem total (nenhuma leitura direta permitida via API pública)
ALTER TABLE public.platform_secure_settings ENABLE ROW LEVEL SECURITY;

-- 3. Função RPC para o Super-Admin salvar e criptografar a chave em AES-256
CREATE OR REPLACE FUNCTION public.admin_set_platform_setting(
    p_key TEXT,
    p_value TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_fingerprint TEXT;
    v_clean_val TEXT;
    v_enc BYTEA;
    v_secret TEXT;
BEGIN
    -- Validação estrita: apenas Super-Admins ou service_role
    IF NOT (public.is_super_admin() OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Super-Administradores podem gerenciar chaves de IA.';
    END IF;

    v_clean_val := TRIM(p_value);
    IF v_clean_val IS NULL OR LENGTH(v_clean_val) < 6 THEN
        RAISE EXCEPTION 'Valor da chave inválido ou muito curto.';
    END IF;

    -- Gera fingerprint mascarado seguro (ex: AIzaSy...9x4m)
    IF LENGTH(v_clean_val) > 10 THEN
        v_fingerprint := SUBSTRING(v_clean_val FROM 1 FOR 6) || '...' || SUBSTRING(v_clean_val FROM LENGTH(v_clean_val) - 3 FOR 4);
    ELSE
        v_fingerprint := SUBSTRING(v_clean_val FROM 1 FOR 2) || '...' || SUBSTRING(v_clean_val FROM LENGTH(v_clean_val) - 1 FOR 2);
    END IF;

    -- Chave mestra interna da base (combina segredo da instância ou salt padrão de infra)
    v_secret := COALESCE(NULLIF(current_setting('app.settings.encryption_key', true), ''), 'nosso_dia_vault_aes256_kdf_2026');

    -- Criptografia com algoritmo simétrico OpenPGP (AES-256)
    v_enc := pgp_sym_encrypt(v_clean_val, v_secret, 'cipher-algo=aes256');

    -- Gravação atômica
    INSERT INTO public.platform_secure_settings (
        key,
        encrypted_value,
        key_fingerprint,
        description,
        updated_at,
        updated_by
    )
    VALUES (
        TRIM(p_key),
        v_enc,
        v_fingerprint,
        p_description,
        now(),
        auth.uid()
    )
    ON CONFLICT (key) DO UPDATE SET
        encrypted_value = EXCLUDED.encrypted_value,
        key_fingerprint = EXCLUDED.key_fingerprint,
        description = COALESCE(EXCLUDED.description, public.platform_secure_settings.description),
        updated_at = now(),
        updated_by = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Chave criptografada com AES-256 e salva com sucesso!',
        'key', TRIM(p_key),
        'key_fingerprint', v_fingerprint
    );
END;
$$;

-- 4. Função RPC para listar as configurações com fingerprint mascarado (NUNCA retorna a chave aberta)
CREATE OR REPLACE FUNCTION public.admin_get_platform_settings()
RETURNS TABLE (
    key TEXT,
    key_fingerprint TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
BEGIN
    IF NOT (public.is_super_admin() OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Super-Administradores podem inspecionar configurações.';
    END IF;

    RETURN QUERY
    SELECT 
        s.key,
        s.key_fingerprint,
        s.description,
        s.updated_at
    FROM public.platform_secure_settings s
    ORDER BY s.key ASC;
END;
$$;

-- 5. Função RPC para descriptografar a chave em memória RAM durante requisição autorizada
CREATE OR REPLACE FUNCTION public.get_active_ai_key(p_provider TEXT DEFAULT 'gemini')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_key_name TEXT;
    v_enc BYTEA;
    v_secret TEXT;
    v_decrypted TEXT;
    v_has_access BOOLEAN;
BEGIN
    -- Verifica se o usuário está autenticado
    IF auth.role() IS NULL OR auth.role() = 'anon' THEN
        RAISE EXCEPTION 'Acesso não autorizado.';
    END IF;

    -- Verifica se o usuário é super admin ou membro de família com acesso ativo/trial
    IF public.is_super_admin() OR auth.role() = 'service_role' THEN
        v_has_access := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 
            FROM public.family_members fm
            JOIN public.subscriptions sub ON sub.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
            AND sub.status IN ('TRIAL', 'ACTIVE')
        ) INTO v_has_access;
    END IF;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Plano sem permissão de acesso à Inteligência Artificial.';
    END IF;

    IF LOWER(p_provider) = 'gemini' THEN
        v_key_name := 'gemini_api_key';
    ELSE
        v_key_name := TRIM(p_provider);
    END IF;

    SELECT encrypted_value INTO v_enc
    FROM public.platform_secure_settings
    WHERE key = v_key_name;

    IF v_enc IS NULL THEN
        RETURN NULL;
    END IF;

    v_secret := COALESCE(NULLIF(current_setting('app.settings.encryption_key', true), ''), 'nosso_dia_vault_aes256_kdf_2026');

    BEGIN
        v_decrypted := pgp_sym_decrypt(v_enc, v_secret);
        RETURN v_decrypted;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao descriptografar chave de IA: %', SQLERRM;
        RETURN NULL;
    END;
END;
$$;

-- 6. Concessão de permissões de execução
GRANT EXECUTE ON FUNCTION public.admin_set_platform_setting(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_settings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_ai_key(TEXT) TO authenticated, service_role;

-- 7. Recarrega o cache do PostgREST para disponibilizar as RPCs imediatamente
NOTIFY pgrst, 'reload schema';
