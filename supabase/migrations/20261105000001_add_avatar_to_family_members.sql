-- Migration: Adiciona suporte a avatar/ícone personalizável para perfis familiares
-- Permite associar um identificador de ícone do Font Awesome (ex: 'user-tie', 'futbol', 'heart')

ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;

COMMENT ON COLUMN public.family_members.avatar IS 'Identificador do ícone/avatar escolhido para o membro (Font Awesome)';

