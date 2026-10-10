-- ============================================================================
-- NOSSO DIA — Correção de Políticas RLS para Operação da Aplicação (Anon & Auth)
-- Version: 1.1.0
-- Permite que usuários acessem e gerenciem a família, membros e rotinas
-- utilizando a chave da aplicação (Supabase anon key / link de convite).
-- ============================================================================

-- 1. FAMILIES
-- Permitir atualização do nome/timezone da família
DROP POLICY IF EXISTS "Admins can update their family" ON public.families;
DROP POLICY IF EXISTS "Allow update families" ON public.families;
CREATE POLICY "Allow update families"
    ON public.families FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Permitir criação de novas famílias se necessário
DROP POLICY IF EXISTS "Authenticated users can create a family" ON public.families;
DROP POLICY IF EXISTS "Allow insert families" ON public.families;
CREATE POLICY "Allow insert families"
    ON public.families FOR INSERT
    TO public
    WITH CHECK (true);

-- Permitir leitura de famílias
DROP POLICY IF EXISTS "Users can view their families" ON public.families;
DROP POLICY IF EXISTS "Allow select families" ON public.families;
CREATE POLICY "Allow select families"
    ON public.families FOR SELECT
    TO public
    USING (true);


-- 2. FAMILY MEMBERS
-- Permitir leitura de membros
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;
DROP POLICY IF EXISTS "Allow select family members" ON public.family_members;
CREATE POLICY "Allow select family members"
    ON public.family_members FOR SELECT
    TO public
    USING (true);

-- Permitir inserção de membros
DROP POLICY IF EXISTS "Admins or initial creators can manage family members" ON public.family_members;
DROP POLICY IF EXISTS "Allow insert family members" ON public.family_members;
CREATE POLICY "Allow insert family members"
    ON public.family_members FOR INSERT
    TO public
    WITH CHECK (true);

-- Permitir atualização de membros (nome, papel, cor)
DROP POLICY IF EXISTS "Admins can update family members" ON public.family_members;
DROP POLICY IF EXISTS "Allow update family members" ON public.family_members;
CREATE POLICY "Allow update family members"
    ON public.family_members FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Permitir exclusão de membros
DROP POLICY IF EXISTS "Admins can delete family members" ON public.family_members;
DROP POLICY IF EXISTS "Allow delete family members" ON public.family_members;
CREATE POLICY "Allow delete family members"
    ON public.family_members FOR DELETE
    TO public
    USING (true);


-- 3. LOCATIONS, ROUTINES, EVENTS & PARTICIPANTS
-- Garantir permissões completas para manipulação da agenda familiar
DROP POLICY IF EXISTS "Family members have full access to locations" ON public.locations;
DROP POLICY IF EXISTS "Allow all on locations" ON public.locations;
CREATE POLICY "Allow all on locations"
    ON public.locations FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Family members have full access to routines" ON public.routines;
DROP POLICY IF EXISTS "Allow all on routines" ON public.routines;
CREATE POLICY "Allow all on routines"
    ON public.routines FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Family members have full access to events" ON public.events;
DROP POLICY IF EXISTS "Allow all on events" ON public.events;
CREATE POLICY "Allow all on events"
    ON public.events FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Family members have full access to event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Allow all on event participants" ON public.event_participants;
CREATE POLICY "Allow all on event participants"
    ON public.event_participants FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);


-- 4. ATUALIZAÇÃO DA RPC PARA MATERIALIZAÇÃO DE ROTINAS
CREATE OR REPLACE FUNCTION public.rpc_materialize_routines(
    p_family_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_routine RECORD;
    v_curr_date DATE;
    v_dow INTEGER;
    v_start_ts TIMESTAMPTZ;
    v_end_ts TIMESTAMPTZ;
    v_tz TEXT;
BEGIN
    -- Obter timezone da família
    SELECT timezone INTO v_tz FROM public.families WHERE id = p_family_id;
    IF v_tz IS NULL THEN
        v_tz := 'America/Araguaina';
    END IF;

    -- Iterar rotinas ativas da família
    FOR v_routine IN 
        SELECT * FROM public.routines 
        WHERE family_id = p_family_id AND is_active = true
    LOOP
        v_curr_date := p_start_date;
        WHILE v_curr_date <= p_end_date LOOP
            v_dow := EXTRACT(DOW FROM v_curr_date)::INTEGER;
            
            IF v_dow = ANY(v_routine.days_of_week) THEN
                v_start_ts := (v_curr_date || ' ' || v_routine.start_time)::TIMESTAMP AT TIME ZONE v_tz;
                v_end_ts := v_start_ts + (v_routine.duration_minutes || ' minutes')::INTERVAL;
                
                IF NOT EXISTS (
                    SELECT 1 FROM public.events 
                    WHERE routine_id = v_routine.id 
                      AND start_time = v_start_ts
                ) THEN
                    INSERT INTO public.events (
                        family_id,
                        routine_id,
                        title,
                        start_time,
                        end_time,
                        location_id,
                        responsible_id,
                        status
                    ) VALUES (
                        p_family_id,
                        v_routine.id,
                        v_routine.title,
                        v_start_ts,
                        v_end_ts,
                        v_routine.location_id,
                        v_routine.default_responsible_id,
                        'SCHEDULED'
                    );
                    v_count := v_count + 1;
                END IF;
            END IF;
            
            v_curr_date := v_curr_date + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Limpar membro temporário de teste se existir
DELETE FROM public.family_members WHERE name = 'Teste Temp';
