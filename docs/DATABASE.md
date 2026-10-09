# NOSSO DIA — Database Design & Schema
**Versão:** 1.0  
**Banco de Dados:** PostgreSQL 15 (Supabase)

## 1. Diagrama de Relacionamento de Entidades (ERD)
```text
  auth.users (Global Supabase Auth)
      │
      └──< family_members (N:N via user_id)
                │
                ▲
    families (Tenants - Unidade de Isolamento)
        ├──< family_members (Perfis: Adultos ou Dependentes sem login)
        ├──< locations (Locais frequentes)
        ├──< routines (Regras de Recorrência)
        │       └──< events (Instâncias de atividades geradas)
        └──< events (Eventos avulsos ou instâncias de rotina)
                ├──< event_participants (N membros da família)
                └──- responsible_id (1 membro adulto)
```

## 2. Dicionário de Dados e Entidades

### `families` (Tenants)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `name`: TEXT NOT NULL (ex: "Família Santiago")
- `timezone`: TEXT NOT NULL DEFAULT 'America/Araguaina'
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### `family_members` (Perfis Familiares & Memberships)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `family_id`: UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE
- `user_id`: UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL (NULL para crianças)
- `name`: TEXT NOT NULL (ex: "Rafael", "Flávio")
- `role`: TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'CHILD'))
- `color`: TEXT NOT NULL DEFAULT '#3B82F6' (cor do card/avatar)
- `birth_date`: DATE NULL
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### `locations` (Locais Cadastrados)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `family_id`: UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE
- `name`: TEXT NOT NULL (ex: "Clube", "Escola", "Clínica")
- `address`: TEXT NULL
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### `routines` (Regras de Atividades Recorrentes)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `family_id`: UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE
- `title`: TEXT NOT NULL (ex: "Natação")
- `days_of_week`: INTEGER[] NOT NULL (array [0..6], onde 0=Domingo, 1=Segunda, etc.)
- `start_time`: TIME NOT NULL (ex: '18:00:00')
- `duration_minutes`: INTEGER NOT NULL DEFAULT 60
- `location_id`: UUID NULL REFERENCES locations(id) ON DELETE SET NULL
- `default_responsible_id`: UUID NULL REFERENCES family_members(id) ON DELETE SET NULL
- `is_active`: BOOLEAN NOT NULL DEFAULT true
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### `events` (Ocorrências Concretas & Compromissos Avulsos)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `family_id`: UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE
- `routine_id`: UUID NULL REFERENCES routines(id) ON DELETE CASCADE (NULL se for avulso)
- `title`: TEXT NOT NULL
- `start_time`: TIMESTAMPTZ NOT NULL
- `end_time`: TIMESTAMPTZ NOT NULL
- `is_all_day`: BOOLEAN NOT NULL DEFAULT false
- `location_id`: UUID NULL REFERENCES locations(id) ON DELETE SET NULL
- `responsible_id`: UUID NULL REFERENCES family_members(id) ON DELETE SET NULL
- `status`: TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
- `notes`: TEXT NULL
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### `event_participants` (Participantes da Atividade)
- `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `event_id`: UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE
- `member_id`: UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE
- UNIQUE(event_id, member_id)

## 3. Índices Estratégicos
- `CREATE INDEX idx_family_members_family ON family_members(family_id);`
- `CREATE INDEX idx_family_members_user ON family_members(user_id);`
- `CREATE INDEX idx_events_family_time ON events(family_id, start_time, end_time);`
- `CREATE INDEX idx_events_responsible ON events(responsible_id);`
- `CREATE INDEX idx_event_participants_event ON event_participants(event_id);`
- `CREATE INDEX idx_routines_family ON routines(family_id);`
