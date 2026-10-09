# NOSSO DIA — Especificação de API e Contratos de Dados
**Versão:** 1.0  
**Protocolo:** Supabase PostgREST + RPCs Seguras

## 1. Contratos de Dados em TypeScript

```typescript
export type MemberRole = 'ADMIN' | 'MEMBER' | 'CHILD';
export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Family {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string | null;
  name: string;
  role: MemberRole;
  color: string;
  birth_date?: string | null;
}

export interface Location {
  id: string;
  family_id: string;
  name: string;
  address?: string | null;
}

export interface Routine {
  id: string;
  family_id: string;
  title: string;
  days_of_week: number[]; // 0 = Domingo, 1 = Segunda, etc.
  start_time: string; // "18:00:00"
  duration_minutes: number;
  location_id?: string | null;
  default_responsible_id?: string | null;
  is_active: boolean;
}

export interface EventItem {
  id: string;
  family_id: string;
  routine_id?: string | null;
  title: string;
  start_time: string; // ISO 8601 UTC
  end_time: string; // ISO 8601 UTC
  is_all_day: boolean;
  location_id?: string | null;
  responsible_id?: string | null;
  status: EventStatus;
  notes?: string | null;
  participants?: FamilyMember[];
  location?: Location | null;
  responsible?: FamilyMember | null;
}
```

## 2. Funções RPC de Domínio (PostgreSQL)

### `rpc_get_week_overview(p_family_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)`
Retorna os eventos da semana com participantes agregados e flag de conflito de responsáveis.

### `rpc_generate_routine_instances(p_family_id UUID, p_days_ahead INTEGER)`
Materializa com segurança as instâncias da janela deslizante para todas as rotinas ativas da família.
