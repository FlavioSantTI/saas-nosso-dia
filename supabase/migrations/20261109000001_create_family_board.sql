-- =============================================================================
-- MIGRAÇÃO: MURAL DA FAMÍLIA (family_board_items) E ANEXOS (board-attachments)
-- Data: 2026-11-09
-- Objetivo: Criar estrutura para avisos não-horários (Provas/Avaliações, Trabalhos,
--           Materiais/Compras, Autorizações e Recados Gerais) com checklist,
--           metadados ricos em JSONB e suporte a anexos de comunicados originais.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.family_board_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EXAM', 'ASSIGNMENT', 'SUPPLY', 'PERMISSION', 'NOTE')),
    title TEXT NOT NULL,
    notes TEXT,
    due_date DATE,
    related_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    assigned_to_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE', 'ARCHIVED')),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    attachment_path TEXT,
    attachment_name TEXT,
    attachment_mime TEXT,
    attachment_extracted_text TEXT,
    created_by UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Índices para consultas rápidas por família, status e prazo
CREATE INDEX IF NOT EXISTS idx_family_board_items_family_status_due
    ON public.family_board_items (family_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_family_board_items_related_member
    ON public.family_board_items (related_member_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_family_board_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_board_items_updated_at ON public.family_board_items;
CREATE TRIGGER trg_family_board_items_updated_at
    BEFORE UPDATE ON public.family_board_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_family_board_items_updated_at();

-- Habilitar RLS e criar política compatível com o modelo do Nosso Dia
ALTER TABLE public.family_board_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on family_board_items" ON public.family_board_items;
CREATE POLICY "Allow all on family_board_items"
    ON public.family_board_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Bucket de Storage para anexos originais do Mural (PDF, DOCX, Imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('board-attachments', 'board-attachments', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Em buckets públicos, o download via URL pública não precisa de política SELECT ampla
-- (evita que clientes listem todos os arquivos do bucket). Liberamos apenas INSERT, UPDATE e DELETE.
DROP POLICY IF EXISTS "Allow all on board-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert on board-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow update on board-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete on board-attachments" ON storage.objects;

CREATE POLICY "Allow insert on board-attachments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'board-attachments');

CREATE POLICY "Allow update on board-attachments"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'board-attachments')
    WITH CHECK (bucket_id = 'board-attachments');

CREATE POLICY "Allow delete on board-attachments"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'board-attachments');

