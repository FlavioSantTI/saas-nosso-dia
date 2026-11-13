-- =============================================================================
-- MIGRAÇÃO: RESUMO DIÁRIO VIA WHATSAPP (WAHA + n8n)
-- Data: 2026-11-13
-- Objetivo:
--   1. Telefone WhatsApp + consentimento (opt-in LGPD) por membro da família
--   2. Log de envios com trava anti-duplicidade (1 resumo por membro/dia)
--   3. RPCs para o n8n: claim_whatsapp_daily_digests, log_whatsapp_digest,
--      whatsapp_opt_out_by_phone (resposta "SAIR")
--
-- Convenção de horário do Nosso Dia: events.start_time é gravado como horário
-- NOMINAL local com sufixo +00:00 (ex.: 08:00 local => 08:00+00:00). Por isso
-- a data/hora do evento é lida com "AT TIME ZONE 'UTC'", enquanto o "hoje" de
-- cada família é calculado com families.timezone.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. COLUNAS DE WHATSAPP E CONSENTIMENTO EM family_members
-- -----------------------------------------------------------------------------
ALTER TABLE public.family_members
    ADD COLUMN IF NOT EXISTS whatsapp_phone      TEXT        NULL,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in     BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at  TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS digest_hour         SMALLINT    NOT NULL DEFAULT 6;

ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS chk_family_members_digest_hour;
ALTER TABLE public.family_members
    ADD CONSTRAINT chk_family_members_digest_hour CHECK (digest_hour BETWEEN 0 AND 23);

ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS chk_family_members_whatsapp_phone;
ALTER TABLE public.family_members
    ADD CONSTRAINT chk_family_members_whatsapp_phone
    CHECK (whatsapp_phone IS NULL OR whatsapp_phone ~ '^[0-9]{10,15}$');

CREATE INDEX IF NOT EXISTS idx_family_members_whatsapp_opt_in
    ON public.family_members (whatsapp_opt_in)
    WHERE whatsapp_opt_in = true;

-- Normaliza telefone (só dígitos, prefixo 55 para números BR) e registra datas de opt-in/opt-out
CREATE OR REPLACE FUNCTION public.normalize_family_member_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_digits TEXT;
BEGIN
    IF NEW.whatsapp_phone IS NOT NULL THEN
        v_digits := regexp_replace(NEW.whatsapp_phone, '[^0-9]', '', 'g');
        IF v_digits = '' THEN
            v_digits := NULL;
        ELSIF length(v_digits) IN (10, 11) THEN
            v_digits := '55' || v_digits; -- DDD + número sem código do país
        END IF;
        NEW.whatsapp_phone := v_digits;
    END IF;

    -- Sem telefone não há como manter consentimento ativo
    IF NEW.whatsapp_phone IS NULL THEN
        NEW.whatsapp_opt_in := false;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.whatsapp_opt_in THEN
            NEW.whatsapp_opt_in_at := now();
            NEW.whatsapp_opt_out_at := NULL;
        END IF;
    ELSE
        IF NEW.whatsapp_opt_in AND NOT OLD.whatsapp_opt_in THEN
            NEW.whatsapp_opt_in_at := now();
            NEW.whatsapp_opt_out_at := NULL;
        ELSIF NOT NEW.whatsapp_opt_in AND OLD.whatsapp_opt_in THEN
            NEW.whatsapp_opt_out_at := now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_family_member_whatsapp ON public.family_members;
CREATE TRIGGER trg_normalize_family_member_whatsapp
    BEFORE INSERT OR UPDATE OF whatsapp_phone, whatsapp_opt_in ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_family_member_whatsapp();

-- Acelera a verificação de ocorrências de rotina já materializadas
CREATE INDEX IF NOT EXISTS idx_events_routine ON public.events (routine_id);

-- -----------------------------------------------------------------------------
-- 2. LOG DE ENVIOS (trava anti-duplicidade por membro/dia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_digest_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    digest_date     DATE NOT NULL,
    phone           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    attempts        SMALLINT NOT NULL DEFAULT 1,
    waha_message_id TEXT NULL,
    error_message   TEXT NULL,
    claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_digest_member_date UNIQUE (member_id, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_digest_logs_date_status
    ON public.whatsapp_digest_logs (digest_date, status);

ALTER TABLE public.whatsapp_digest_logs ENABLE ROW LEVEL SECURITY;

-- Apenas Super-Admin lê pela API; o n8n usa service_role (ignora RLS)
DROP POLICY IF EXISTS "Super admins can view whatsapp digest logs" ON public.whatsapp_digest_logs;
CREATE POLICY "Super admins can view whatsapp digest logs"
    ON public.whatsapp_digest_logs FOR SELECT
    USING (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- 3. MONTAGEM DO TEXTO DO RESUMO (formatação WhatsApp: *negrito*, _itálico_)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_whatsapp_digest_text(
    p_member_id UUID,
    p_date      DATE,
    p_app_url   TEXT DEFAULT 'https://nossodia.flaviosantiago.com.br'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member     RECORD;
    v_weekdays   TEXT[] := ARRAY['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                                 'quinta-feira', 'sexta-feira', 'sábado'];
    v_first_name TEXT;
    v_agenda     TEXT;
    v_radar      TEXT;
BEGIN
    SELECT fm.id, fm.name, fm.family_id, f.name AS family_name
      INTO v_member
      FROM public.family_members fm
      JOIN public.families f ON f.id = fm.family_id
     WHERE fm.id = p_member_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_first_name := split_part(trim(v_member.name), ' ', 1);

    -- Agenda do dia: eventos concretos + ocorrências de rotina ainda não materializadas
    v_agenda := (
        WITH day_items AS (
            SELECT e.is_all_day,
                   to_char(e.start_time AT TIME ZONE 'UTC', 'HH24:MI') AS hhmm,
                   e.title,
                   l.name          AS location_name,
                   r.name          AS responsible_name,
                   e.responsible_id
              FROM public.events e
              LEFT JOIN public.locations l      ON l.id = e.location_id
              LEFT JOIN public.family_members r ON r.id = e.responsible_id
             WHERE e.family_id = v_member.family_id
               AND e.status <> 'CANCELLED'
               AND (e.start_time AT TIME ZONE 'UTC')::date = p_date

            UNION ALL

            SELECT false,
                   substr(rt.start_time::text, 1, 5),
                   rt.title,
                   l.name,
                   r.name,
                   rt.default_responsible_id
              FROM public.routines rt
              LEFT JOIN public.locations l      ON l.id = rt.location_id
              LEFT JOIN public.family_members r ON r.id = rt.default_responsible_id
             WHERE rt.family_id = v_member.family_id
               AND rt.is_active
               AND EXTRACT(DOW FROM p_date)::int = ANY (rt.days_of_week)
               AND (to_jsonb(rt) ->> 'end_date' IS NULL OR (to_jsonb(rt) ->> 'end_date')::date >= p_date)
               AND NOT EXISTS (
                     SELECT 1 FROM public.events e2
                      WHERE e2.routine_id = rt.id
                        AND (e2.start_time AT TIME ZONE 'UTC')::date = p_date
               )
        )
        SELECT string_agg(
                   '• ' || (CASE WHEN is_all_day THEN '*Dia todo*' ELSE '*' || hhmm || '*' END)
                   || ' ' || title
                   || COALESCE(' 📍 ' || location_name, '')
                   || COALESCE(' — 👤 ' || responsible_name, '')
                   || (CASE WHEN responsible_id = p_member_id THEN ' ⭐' ELSE '' END),
                   E'\n' ORDER BY is_all_day DESC, hhmm
               )
          FROM day_items
    );

    -- Radar do Mural: itens em aberto nos próximos 7 dias (inclui provas e entregas da semana)
    v_radar := (
        SELECT string_agg(
                   (CASE b.type
                       WHEN 'EXAM'       THEN '📝'
                       WHEN 'ASSIGNMENT' THEN '📚'
                       WHEN 'SUPPLY'     THEN '🛒'
                       WHEN 'PERMISSION' THEN '✍️'
                       ELSE '💬'
                   END)
                   || ' *' || b.title || '*'
                   || COALESCE(' (' || split_part(trim(rm.name), ' ', 1) || ')', '')
                   || ' — ' || (CASE
                                   WHEN b.due_date = p_date     THEN '*hoje*'
                                   WHEN b.due_date = p_date + 1 THEN '*amanhã*'
                                   ELSE v_weekdays[EXTRACT(DOW FROM b.due_date)::int + 1] || ', ' || to_char(b.due_date, 'DD/MM') || ' (em ' || (b.due_date - p_date) || ' dias)'
                               END),
                   E'\n' ORDER BY b.due_date, b.type
               )
          FROM public.family_board_items b
          LEFT JOIN public.family_members rm ON rm.id = b.related_member_id
         WHERE b.family_id = v_member.family_id
           AND b.status = 'OPEN'
           AND b.due_date BETWEEN p_date AND p_date + 7
    );

    RETURN
        '☀️ *Bom dia, ' || v_first_name || '!*' || E'\n'
        || '📅 *' || v_member.family_name || '* — '
        || v_weekdays[EXTRACT(DOW FROM p_date)::int + 1] || ', ' || to_char(p_date, 'DD/MM')
        || E'\n\n'
        || COALESCE('*Agenda de hoje*' || E'\n' || v_agenda,
                    '🌿 Nenhum compromisso na agenda hoje. Dia livre para relaxar!')
        || COALESCE(E'\n\n🎯 *No Radar do Mural (Provas & Entregas)*\n' || v_radar, '')
        || CASE WHEN v_agenda LIKE '%⭐%' THEN E'\n\n_⭐ = você é o responsável_' ELSE '' END
        || E'\n\n🔗 ' || p_app_url
        || E'\n_Responda SAIR para não receber mais._';
END;
$$;

-- -----------------------------------------------------------------------------
-- 3.1. RESUMO DEDICADO DO MURAL (Provas, Trabalhos e Entregas dos próximos dias)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_whatsapp_mural_radar_text(
    p_member_id UUID,
    p_days      INT  DEFAULT 7,
    p_app_url   TEXT DEFAULT 'https://nossodia.flaviosantiago.com.br'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member   RECORD;
    v_weekdays TEXT[] := ARRAY['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                               'quinta-feira', 'sexta-feira', 'sábado'];
    v_today    DATE;
    v_items    TEXT;
    v_count    INT;
BEGIN
    SELECT fm.id, fm.name, fm.family_id, f.name AS family_name,
           (now() AT TIME ZONE COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo'))::date AS local_date
      INTO v_member
      FROM public.family_members fm
      JOIN public.families f ON f.id = fm.family_id
     WHERE fm.id = p_member_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_today := v_member.local_date;

    SELECT count(*)::int
      INTO v_count
      FROM public.family_board_items b
     WHERE b.family_id = v_member.family_id
       AND b.status = 'OPEN'
       AND b.due_date BETWEEN v_today AND v_today + p_days;

    v_items := (
        SELECT string_agg(
                   (CASE b.type
                       WHEN 'EXAM'       THEN '📝 *PROVA*'
                       WHEN 'ASSIGNMENT' THEN '📚 *TRABALHO*'
                       WHEN 'SUPPLY'     THEN '🛒 *MATERIAL*'
                       WHEN 'PERMISSION' THEN '✍️ *AUTORIZAÇÃO*'
                       ELSE '💬 *AVISO*'
                   END)
                   || ': *' || b.title || '*'
                   || COALESCE(' (' || split_part(trim(rm.name), ' ', 1) || ')', '') || E'\n'
                   || '   📅 ' || v_weekdays[EXTRACT(DOW FROM b.due_date)::int + 1] || ', '
                   || to_char(b.due_date, 'DD/MM')
                   || (CASE
                          WHEN b.due_date = v_today     THEN ' (*HOJE!*)'
                          WHEN b.due_date = v_today + 1 THEN ' (*AMANHÃ!*)'
                          ELSE ' (em ' || (b.due_date - v_today) || ' dias)'
                      END)
                   || COALESCE(E'\n   🎯 Nota: ' || (b.details ->> 'grade_composition'), ''),
                   E'\n\n' ORDER BY b.due_date, b.type
               )
          FROM public.family_board_items b
          LEFT JOIN public.family_members rm ON rm.id = b.related_member_id
         WHERE b.family_id = v_member.family_id
           AND b.status = 'OPEN'
           AND b.due_date BETWEEN v_today AND v_today + p_days
    );

    IF v_count = 0 OR v_items IS NULL THEN
        RETURN
            '🎯 *Radar do Mural — ' || v_member.family_name || '*' || E'\n\n'
            || '🌿 Nenhuma prova ou entrega com prazo nos próximos ' || p_days || ' dias! Tudo sob controle na rotina escolar.'
            || E'\n\n🔗 ' || p_app_url;
    END IF;

    RETURN
        '🎯 *No Radar do Mural (Provas & Entregas Próximas)*' || E'\n'
        || '📅 *' || v_member.family_name || '* • Próximos ' || p_days || ' dias' || E'\n\n'
        || v_items
        || E'\n\n'
        || '💡 _Dica: Você pode marcar os capítulos estudados diretamente no Mural do aplicativo._'
        || E'\n🔗 ' || p_app_url;
END;
$$;

    IF v_count = 0 OR v_items IS NULL THEN
        RETURN
            '🎯 *Radar do Mural — ' || v_member.family_name || '*' || E'\n\n'
            || '🌿 Nenhuma prova ou entrega com prazo nos próximos ' || p_days || ' dias! Tudo sob controle na rotina escolar.'
            || E'\n\n🔗 ' || p_app_url;
    END IF;

    RETURN
        '🎯 *No Radar do Mural (Provas & Entregas Próximas)*' || E'\n'
        || '📅 *' || v_member.family_name || '* • Próximos ' || p_days || ' dias' || E'\n\n'
        || v_items
        || E'\n\n'
        || '💡 _Dica: Você pode marcar os capítulos estudados diretamente no Mural do aplicativo._'
        || E'\n🔗 ' || p_app_url;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. RPC DO n8n: SEPARA (CLAIM) OS RESUMOS QUE DEVEM SAIR AGORA
--    Rodar de hora em hora. Envia para quem está na janela
--    [digest_hour, digest_hour + p_window_hours) no fuso da família.
--    Reenvia FAILED até 3 tentativas e PENDING travado há mais de 30 min.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_whatsapp_daily_digests(
    p_limit        INT DEFAULT 200,
    p_window_hours INT DEFAULT 3
)
RETURNS TABLE (
    log_id       UUID,
    member_id    UUID,
    family_id    UUID,
    member_name  TEXT,
    phone        TEXT,
    digest_date  DATE,
    message_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    -- NULL = execução direta no SQL Editor; anon/authenticated já são barrados pelo GRANT
    IF COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH candidates AS (
        SELECT fm.id            AS c_member_id,
               fm.family_id     AS c_family_id,
               fm.whatsapp_phone AS c_phone,
               fm.digest_hour   AS c_digest_hour,
               (now() AT TIME ZONE COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo'))::date AS c_local_date,
               EXTRACT(HOUR FROM now() AT TIME ZONE COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo'))::int AS c_local_hour
          FROM public.family_members fm
          JOIN public.families f      ON f.id = fm.family_id
          JOIN public.subscriptions s ON s.family_id = fm.family_id
                                     AND s.status IN ('TRIAL', 'ACTIVE')
         WHERE fm.whatsapp_opt_in = true
           AND fm.whatsapp_phone IS NOT NULL
           AND fm.role IN ('ADMIN', 'MEMBER')
    ),
    due AS (
        SELECT c.*
          FROM candidates c
         WHERE c.c_local_hour >= c.c_digest_hour
           AND c.c_local_hour <  c.c_digest_hour + p_window_hours
           AND NOT EXISTS (
                 SELECT 1 FROM public.whatsapp_digest_logs x
                  WHERE x.member_id = c.c_member_id
                    AND x.digest_date = c.c_local_date
                    AND x.status IN ('SENT', 'SKIPPED')
           )
         LIMIT p_limit
    ),
    claimed AS (
        INSERT INTO public.whatsapp_digest_logs AS l
               (member_id, family_id, digest_date, phone, status, attempts, claimed_at)
        SELECT d.c_member_id, d.c_family_id, d.c_local_date, d.c_phone, 'PENDING', 1, now()
          FROM due d
        ON CONFLICT ON CONSTRAINT uq_whatsapp_digest_member_date DO UPDATE
           SET status        = 'PENDING',
               attempts      = l.attempts + 1,
               phone         = EXCLUDED.phone,
               claimed_at    = now(),
               error_message = NULL,
               updated_at    = now()
         WHERE (l.status = 'FAILED'  AND l.attempts < 3)
            OR (l.status = 'PENDING' AND l.claimed_at < now() - INTERVAL '30 minutes')
        RETURNING l.id, l.member_id, l.family_id, l.phone, l.digest_date
    )
    SELECT cl.id,
           cl.member_id,
           cl.family_id,
           fm.name,
           cl.phone,
           cl.digest_date,
           public.build_whatsapp_digest_text(cl.member_id, cl.digest_date)
      FROM claimed cl
      JOIN public.family_members fm ON fm.id = cl.member_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC DO n8n: REGISTRA O RESULTADO DE CADA ENVIO
--    p_status: SENT | FAILED | SKIPPED (SKIPPED = número sem WhatsApp, não reenvia)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_whatsapp_digest(
    p_log_id          UUID,
    p_status          TEXT,
    p_waha_message_id TEXT DEFAULT NULL,
    p_error           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role.' USING ERRCODE = '42501';
    END IF;

    IF upper(p_status) NOT IN ('SENT', 'FAILED', 'SKIPPED') THEN
        RAISE EXCEPTION 'Status inválido: % (use SENT, FAILED ou SKIPPED).', p_status;
    END IF;

    UPDATE public.whatsapp_digest_logs
       SET status          = upper(p_status),
           waha_message_id = COALESCE(p_waha_message_id, waha_message_id),
           error_message   = left(p_error, 500),
           sent_at         = CASE WHEN upper(p_status) = 'SENT' THEN now() ELSE sent_at END,
           updated_at      = now()
     WHERE id = p_log_id;

    RETURN jsonb_build_object('success', FOUND, 'log_id', p_log_id, 'status', upper(p_status));
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. RPC DO n8n: OPT-OUT QUANDO O CLIENTE RESPONDE "SAIR"
--    Aceita "5563999998888", "+55 (63) 99999-8888" ou "5563999998888@c.us".
--    Trata o 9º dígito brasileiro (WhatsApp pode informar o número sem ele).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.whatsapp_opt_out_by_phone(p_phone TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_digits TEXT;
    v_count  INT;
BEGIN
    IF COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role.' USING ERRCODE = '42501';
    END IF;

    v_digits := regexp_replace(split_part(COALESCE(p_phone, ''), '@', 1), '[^0-9]', '', 'g');
    IF v_digits = '' THEN
        RETURN 0;
    END IF;

    UPDATE public.family_members
       SET whatsapp_opt_in = false,
           updated_at      = now()
     WHERE whatsapp_opt_in = true
       AND (
             whatsapp_phone = v_digits
          OR (length(v_digits) = 12 AND v_digits LIKE '55%'
              AND whatsapp_phone = substr(v_digits, 1, 4) || '9' || substr(v_digits, 5))
       );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. PERMISSÕES: somente service_role (n8n) executa as RPCs de envio
--    (Supabase concede EXECUTE a anon/authenticated por padrão — revogamos)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.build_whatsapp_digest_text(UUID, DATE, TEXT)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.build_whatsapp_mural_radar_text(UUID, INT, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_whatsapp_daily_digests(INT, INT)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_whatsapp_digest(UUID, TEXT, TEXT, TEXT)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_opt_out_by_phone(TEXT)                   FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.build_whatsapp_digest_text(UUID, DATE, TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION public.build_whatsapp_mural_radar_text(UUID, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_daily_digests(INT, INT)         TO service_role;
GRANT EXECUTE ON FUNCTION public.log_whatsapp_digest(UUID, TEXT, TEXT, TEXT)    TO service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_opt_out_by_phone(TEXT)                TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_digest_logs TO service_role;

-- Recarrega o cache do PostgREST para expor as novas RPCs imediatamente
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- TESTES RÁPIDOS (rode manualmente no SQL Editor, substituindo os valores)
-- =============================================================================
-- 1) Cadastrar seu WhatsApp com opt-in:
--    UPDATE public.family_members
--       SET whatsapp_phone = '63999998888', whatsapp_opt_in = true, digest_hour = 6
--     WHERE id = '<SEU_MEMBER_ID>';
--
-- 2) Pré-visualizar o texto do Resumo Diário Completo (Agenda + Radar):
--    SELECT public.build_whatsapp_digest_text('<SEU_MEMBER_ID>', CURRENT_DATE);
--
-- 3) Pré-visualizar APENAS o Radar do Mural (Provas e Entregas dos próximos 7 dias):
--    SELECT public.build_whatsapp_mural_radar_text('<SEU_MEMBER_ID>', 7);
--
-- 4) Simular o claim do n8n (CRIA linhas PENDING no log!):
--    SELECT * FROM public.claim_whatsapp_daily_digests(10, 24);

