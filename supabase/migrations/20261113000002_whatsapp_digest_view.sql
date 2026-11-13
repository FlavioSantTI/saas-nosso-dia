-- =============================================================================
-- Migration: 20261113000002_whatsapp_digest_view.sql
-- Description: Atualiza a função de texto (removendo link de URL) e cria
--              a VIEW v_pending_whatsapp_digests para consumo nativo no n8n.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.build_whatsapp_digest_text(
    p_member_id UUID,
    p_date      DATE,
    p_app_url   TEXT DEFAULT NULL
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

    -- Radar do Mural: itens em aberto nos próximos 7 dias
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
        || E'\n\n_Responda SAIR para não receber mais._';
END;
$$;

-- VIEW para consumo nativo pelo nó Supabase do n8n
CREATE OR REPLACE VIEW public.v_pending_whatsapp_digests AS
WITH member_context AS (
  SELECT
    fm.id AS member_id,
    fm.family_id,
    fm.name AS member_name,
    fm.whatsapp_phone AS phone,
    COALESCE(fm.digest_hour, 7) AS digest_hour,
    COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo') AS tz,
    (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo'))::date AS local_date,
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(f.timezone, ''), 'America/Sao_Paulo')))::integer AS local_hour
  FROM public.family_members fm
  JOIN public.families f ON f.id = fm.family_id
  LEFT JOIN public.subscriptions s ON s.family_id = f.id
  WHERE fm.whatsapp_opt_in = true
    AND fm.whatsapp_phone IS NOT NULL
    AND LENGTH(TRIM(fm.whatsapp_phone)) >= 10
    AND fm.role <> 'CHILD'
    AND (s.id IS NULL OR s.status IN ('ACTIVE', 'TRIAL', 'TRIALING'))
)
SELECT
  mc.member_id,
  mc.family_id,
  mc.member_name,
  mc.phone,
  mc.local_date AS digest_date,
  mc.local_hour,
  mc.digest_hour,
  public.build_whatsapp_digest_text(
    mc.member_id,
    mc.local_date
  ) AS message_text
FROM member_context mc
WHERE mc.local_hour >= mc.digest_hour
  AND mc.local_hour < (mc.digest_hour + 3)
  AND NOT EXISTS (
    SELECT 1 
    FROM public.whatsapp_digest_logs l
    WHERE l.member_id = mc.member_id
      AND l.digest_date = mc.local_date
      AND l.status IN ('SENT', 'PENDING')
  );

GRANT SELECT ON public.v_pending_whatsapp_digests TO authenticated, service_role, anon;

