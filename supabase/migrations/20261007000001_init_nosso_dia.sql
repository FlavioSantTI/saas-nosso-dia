-- ============================================================================
-- NOSSO DIA — Initial Database Migration
-- Version: 1.0.0
-- Platform: Supabase / PostgreSQL 15+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- ----------------------------------------------------------------------------

-- Families (Tenants)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Araguaina',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Family Members (Profiles & Memberships)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'CHILD')),
    color TEXT NOT NULL DEFAULT '#3B82F6',
    birth_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_family_user UNIQUE NULLS NOT DISTINCT (family_id, user_id)
);

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Routines (Recurring rules)
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    days_of_week INTEGER[] NOT NULL, -- [0..6] (0=Sunday, 1=Monday, etc.)
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location_id UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL,
    default_responsible_id UUID NULL REFERENCES public.family_members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events (Concrete occurrences & standalone appointments)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    routine_id UUID NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    location_id UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL,
    responsible_id UUID NULL REFERENCES public.family_members(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event Participants (N:N relationship)
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_event_member UNIQUE (event_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_family ON public.locations(family_id);
CREATE INDEX IF NOT EXISTS idx_routines_family ON public.routines(family_id);
CREATE INDEX IF NOT EXISTS idx_events_family ON public.events(family_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON public.events(family_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_responsible ON public.events(responsible_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member ON public.event_participants(member_id);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) ZERO TRUST POLICIES
-- ----------------------------------------------------------------------------

-- Enable and force RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families FORCE ROW LEVEL SECURITY;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines FORCE ROW LEVEL SECURITY;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants FORCE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.get_user_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_family(target_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = target_family_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_family(target_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = target_family_id AND user_id = auth.uid() AND role = 'ADMIN'
    );
$$;

-- Policies: families
CREATE POLICY "Users can view their families"
    ON public.families FOR SELECT
    USING (id IN (SELECT public.get_user_family_ids()));

CREATE POLICY "Authenticated users can create a family"
    ON public.families FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update their family"
    ON public.families FOR UPDATE
    USING (public.is_admin_of_family(id))
    WITH CHECK (public.is_admin_of_family(id));

-- Policies: family_members
CREATE POLICY "Users can view members of their families"
    ON public.family_members FOR SELECT
    USING (family_id IN (SELECT public.get_user_family_ids()));

CREATE POLICY "Admins or initial creators can manage family members"
    ON public.family_members FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin_of_family(family_id) 
        OR NOT EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_members.family_id)
    );

CREATE POLICY "Admins can update family members"
    ON public.family_members FOR UPDATE
    USING (public.is_admin_of_family(family_id))
    WITH CHECK (public.is_admin_of_family(family_id));

CREATE POLICY "Admins can delete family members"
    ON public.family_members FOR DELETE
    USING (public.is_admin_of_family(family_id));

-- Policies: locations
CREATE POLICY "Family members have full access to locations"
    ON public.locations FOR ALL
    USING (public.is_member_of_family(family_id))
    WITH CHECK (public.is_member_of_family(family_id));

-- Policies: routines
CREATE POLICY "Family members have full access to routines"
    ON public.routines FOR ALL
    USING (public.is_member_of_family(family_id))
    WITH CHECK (public.is_member_of_family(family_id));

-- Policies: events
CREATE POLICY "Family members have full access to events"
    ON public.events FOR ALL
    USING (public.is_member_of_family(family_id))
    WITH CHECK (public.is_member_of_family(family_id));

-- Policies: event_participants
CREATE POLICY "Family members have full access to event participants"
    ON public.event_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_participants.event_id 
              AND public.is_member_of_family(e.family_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_participants.event_id 
              AND public.is_member_of_family(e.family_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 4. DOMAIN PROCEDURES & RPC
-- ----------------------------------------------------------------------------

-- Materialize instances for routines within sliding window
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
    -- Verify access
    IF NOT public.is_member_of_family(p_family_id) THEN
        RAISE EXCEPTION 'Access denied to family %', p_family_id;
    END IF;

    -- Get family timezone
    SELECT timezone INTO v_tz FROM public.families WHERE id = p_family_id;
    IF v_tz IS NULL THEN
        v_tz := 'America/Araguaina';
    END IF;

    -- Iterate active routines
    FOR v_routine IN 
        SELECT * FROM public.routines 
        WHERE family_id = p_family_id AND is_active = true
    LOOP
        v_curr_date := p_start_date;
        WHILE v_curr_date <= p_end_date LOOP
            v_dow := EXTRACT(DOW FROM v_curr_date)::INTEGER;
            
            -- Check if dow matches routine
            IF v_dow = ANY(v_routine.days_of_week) THEN
                -- Compute UTC start and end timestamps from local time
                v_start_ts := (v_curr_date || ' ' || v_routine.start_time)::TIMESTAMP AT TIME ZONE v_tz;
                v_end_ts := v_start_ts + (v_routine.duration_minutes || ' minutes')::INTERVAL;
                
                -- Insert event if not already materialized
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
