-- Adiciona coluna de nickname (nome familiar/apelido) na entidade family_members
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS nickname TEXT NULL;
