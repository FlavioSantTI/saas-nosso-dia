# NOSSO DIA — Políticas de Segurança e Row Level Security (RLS)
**Versão:** 1.0  
**Princípio:** Zero Trust Multi-Tenant

## 1. Funções de Suporte ao RLS (Security Definer)
Para evitar repetição e garantir máxima performance nas políticas:

```sql
-- Retorna os IDs das famílias às quais o usuário autenticado pertence
CREATE OR REPLACE FUNCTION public.get_user_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- Verifica se o usuário autenticado pertence a uma família específica
CREATE OR REPLACE FUNCTION public.is_member_of_family(target_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = target_family_id AND user_id = auth.uid()
  );
$$;
```

## 2. Matriz de Políticas de RLS por Tabela

### Tabela `families`
- `SELECT`: Apenas famílias onde `id IN (SELECT get_user_family_ids())`.
- `INSERT`: Qualquer usuário autenticado pode criar uma nova família.
- `UPDATE`: Apenas membros com role 'ADMIN'.
- `DELETE`: Apenas membros com role 'ADMIN'.

### Tabela `family_members`
- `SELECT`: Membros onde `family_id IN (SELECT get_user_family_ids())`.
- `INSERT/UPDATE/DELETE`: Apenas membros 'ADMIN' da família.

### Tabelas `locations`, `routines`, `events`, `event_participants`
- `ALL (SELECT, INSERT, UPDATE, DELETE)`:
  `USING (is_member_of_family(family_id)) WITH CHECK (is_member_of_family(family_id));`

## 3. Teste Automatizado de Penetração de Tenancy
O pipeline de testes executa cenários simulando:
1. Usuário A autenticado consulta `events` -> Recebe apenas eventos da Família A.
2. Usuário A tenta injetar um evento com `family_id` da Família B -> O banco rejeita via RLS.
3. Usuário A tenta atualizar o perfil de um filho da Família B -> Retorno de 0 linhas afetadas.
