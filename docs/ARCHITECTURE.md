# NOSSO DIA — Arquitetura de Sistema
**Versão:** 1.0  
**Stack Homologada:** React + TypeScript + Vite + Tailwind CSS + PWA | Supabase (PostgreSQL, Auth, RLS) | Vercel

## 1. Visão Geral da Topologia
```text
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND PWA (Vercel)                  │
│       React 18 + TypeScript strict + Vite + Tailwind CSS    │
│       Client SPA Responsivo + Service Worker PWA            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS (Supabase Client)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND & DADOS (Supabase)                  │
│  - Supabase Auth: Sessão JWT para Adultos/Responsáveis      │
│  - PostgreSQL 15: Schema Relacional + Funções RPC           │
│  - Row Level Security (RLS): Isolamento Hermético por Tenant │
│  - Timestamps: UTC (TIMESTAMPTZ) com fuso local no Tenant   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Princípios Arquiteturais
1. **Multi-Tenancy Zero Trust:** Cada consulta é isolada pela chave estrangeira `family_id`. O banco de dados valida se o `auth.uid()` pertence à família correspondente via RLS.
2. **Separação entre Regra de Rotina e Instância de Evento:**
   - `routines` armazena a regra abstrata (ex.: terças e quintas às 18h).
   - `events` armazena as ocorrências temporais concretas em uma janela deslizante de 60 dias.
3. **Conversão de Fuso Horário:** Armazenamento estrito em UTC. O frontend converte para o fuso do tenant (`America/Araguaina`) na exibição e formatação.
