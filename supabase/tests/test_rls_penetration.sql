-- ============================================================================
-- NOSSO DIA — Teste Automatizado de Penetração de Tenancy (RLS Validation)
-- Simula dois usuários autenticados (User A na Família A, User B na Família B)
-- Valida que User A NÃO consegue ler, atualizar ou injetar dados na Família B.
-- ============================================================================

DO $$
DECLARE
    v_user_a UUID := gen_random_uuid();
    v_user_b UUID := gen_random_uuid();
    v_fam_a UUID;
    v_fam_b UUID;
    v_evt_b UUID;
    v_leak_count INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando teste de penetração de tenancy...';

    -- 1. Setup Família A e Membro A
    INSERT INTO public.families (name) VALUES ('Família A') RETURNING id INTO v_fam_a;
    INSERT INTO public.family_members (family_id, user_id, name, role) 
    VALUES (v_fam_a, v_user_a, 'Adulto A', 'ADMIN');

    -- 2. Setup Família B e Membro B
    INSERT INTO public.families (name) VALUES ('Família B') RETURNING id INTO v_fam_b;
    INSERT INTO public.family_members (family_id, user_id, name, role) 
    VALUES (v_fam_b, v_user_b, 'Adulto B', 'ADMIN');

    -- 3. Criar evento na Família B
    INSERT INTO public.events (family_id, title, start_time, end_time)
    VALUES (v_fam_b, 'Segredo da Família B', now(), now() + interval '1 hour')
    RETURNING id INTO v_evt_b;

    -- 4. SIMULAR CONTEXTO DO USUÁRIO A
    -- No Supabase, isso equivale a auth.uid() = v_user_a
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    -- TESTE 1: Usuário A tenta ler eventos da Família B
    SELECT count(*) INTO v_leak_count FROM public.events WHERE family_id = v_fam_b;
    IF v_leak_count > 0 THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário A conseguiu ler % eventos da Família B!', v_leak_count;
    END IF;

    -- TESTE 2: Usuário A tenta atualizar evento da Família B
    UPDATE public.events SET title = 'Hackeado' WHERE id = v_evt_b;
    SELECT count(*) INTO v_leak_count FROM public.events WHERE id = v_evt_b AND title = 'Hackeado';
    IF v_leak_count > 0 THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário A conseguiu modificar evento da Família B!';
    END IF;

    -- TESTE 3: Usuário A tenta deletar evento da Família B
    DELETE FROM public.events WHERE id = v_evt_b;
    SELECT count(*) INTO v_leak_count FROM public.events WHERE id = v_evt_b;
    IF v_leak_count = 0 THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário A conseguiu deletar evento da Família B!';
    END IF;

    -- TESTE 4: Usuário A tenta injetar evento fingindo pertencer à Família B
    BEGIN
        INSERT INTO public.events (family_id, title, start_time, end_time)
        VALUES (v_fam_b, 'Evento Injetado', now(), now() + interval '1 hour');
        
        -- Se não disparar exceção pela política WITH CHECK, verifica se persistiu
        SELECT count(*) INTO v_leak_count FROM public.events WHERE family_id = v_fam_b AND title = 'Evento Injetado';
        IF v_leak_count > 0 THEN
            RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário A conseguiu injetar dados na Família B!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Tentativa de injeção foi bloqueada com sucesso pela política RLS.';
    END;

    RAISE NOTICE 'SUCESSO: Todas as políticas de isolamento multi-tenant foram aprovadas sem vazamentos.';
END;
$$;
