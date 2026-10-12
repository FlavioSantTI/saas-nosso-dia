-- Migration: 20261012000002_add_email_to_family_members.sql
-- Adiciona campo email na tabela public.family_members para permitir convites diretos

ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.family_members.email IS 'E-mail do membro para login e convite de acesso à família';
