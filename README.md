# 🌟 Nosso Dia — Sistema de Coordenação da Rotina Familiar

<div align="center">

![Nosso Dia Logo](https://img.shields.io/badge/Nosso_Dia-Coordenação_Familiar-0284C7?style=for-the-badge&logo=google-calendar&logoColor=white)
![Versão](https://img.shields.io/badge/Versão-v1.0.3-059669?style=for-the-badge)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)

<p align="center">
  <strong>Um sistema inteligente e acolhedor para famílias com filhos e rotinas dinâmicas.</strong><br>
  Visibilidade total sobre o que fazer, quando, onde e quem é o adulto responsável por viabilizar.
</p>

<p align="center">
  🌐 <strong>Produção:</strong> <a href="https://nossodia.flaviosantiago.com.br/">nossodia.flaviosantiago.com.br</a>
</p>

</div>

---

## 📖 Sobre o Projeto

O **Nosso Dia** não é uma simples lista de tarefas e nem um calendário corporativo frio. É um **hub central de coordenação da vida doméstica e escolar** desenhado sob medida para famílias com rotinas distribuídas.

### 🎯 Job to be Done (JTBD)
> *"Quando planejo a semana da minha casa, quero ter certeza absoluta de que todos os compromissos e rotinas dos meus filhos e da família estão visíveis, com responsáveis claros, para que ninguém se sobrecarregue, nada seja esquecido e a rotina flua com tranquilidade."*

---

## ✨ Principais Funcionalidades

### 🗓️ 1. Grade Semanal & Visões Temporais
- **Visão Semanal Viva:** Exibição clara de segunda a domingo com contadores de atividades e destaque do dia de hoje.
- **Empty States Acolhedores:** Mensagens motivacionais e amigáveis em dias livres (*"Dia livre para relaxar! ☀️"*).
- **Visão Diária Detalhada & Visão Mensal:** Navegação completa em formato cápsula (estilo macOS/iOS) para inspecionar meses e dias com precisão.
- **Drag & Drop:** Arraste e solte atividades entre dias da semana para reagendamento ágil.

### 👨‍👩‍👧‍👦 2. Gestão Familiar & Membros Multi-Tenant
- **Cores Distintivas por Membro:** Cada participante possui sua cor de identificação rápida (ex.: Flávio em Azul Oceano, Silvia em Terracota, Rafael em Verde Sálvia).
- **Filtro Rápido por Pessoa:** Filtre a grade com 1 clique para ver a agenda de um filho ou de toda a família.
- **Convite Dinâmico:** Link de convite gerado dinamicamente para o domínio atual (`window.location.origin`), pronto para WhatsApp.
- **Perfis Gerenciados vs Adultos:** Dependentes/crianças não necessitam de login; adultos possuem gestão de permissões.

### 🔄 3. Rotinas Recorrentes & Exclusão Seletiva
- **Geração Inteligente de Ocorrências:** Cadastro de rotinas semanais (ex.: Natação ter/qui às 18h) com expansão automática no calendário.
- **Exclusão Seletiva (Estilo Google Calendar):**
  - 🗑️ *Apenas esta ocorrência* — apaga o dia selecionado mantendo os outros intactos.
  - 🔥 *Excluir esta e todas as futuras* — apaga em série e encerra a rotina no banco.

### 🤖 4. Captura Rápida com IA
- Cole textos brutos vindos do WhatsApp, recados da escola ou e-mails.
- A inteligência artificial extrai automaticamente título, participante, horário, responsável e local para confirmação instantânea.

### ⚠️ 5. Alerta de Conflitos & Atividades Sem Responsável
- **Detecção de Sobreposição:** Alerta visual proeminente quando o mesmo adulto tiver dois compromissos no mesmo horário.
- **Banner de Atividades Pendentes:** Aviso fixo quando houver eventos sem responsável definido, com modal de atribuição rápida em lote.

### 🔔 6. Notificações & Lembretes Locais
- Disparo de notificações no navegador com tempo customizável (5, 10, 15 ou 30 min antes).

---

## 🎨 Design System: "Modern Craft / Natureza & Equilíbrio"

- **Tipografia:** `Plus Jakarta Sans` (Google Fonts) para alta legibilidade e sofisticação.
- **Paleta de Cores:** Tons orgânicos e acolhedores (`#F4F8FA`, Azul Oceano `#0284C7`, Verde Sálvia `#059669`, Terracota `#EA580C`).
- **Glassmorphism:** Efeito vidro fosco (`backdrop-blur-md`, `bg-white/85`) no cabeçalho e modais.
- **Iconografia:** Ícones consistentes e modernos da biblioteca [Lucide React](https://lucide.dev/).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React 18, TypeScript (strict mode), Vite 5, Tailwind CSS |
| **Ícones & UI** | Lucide React, Plus Jakarta Sans |
| **Container & Proxy** | Docker (Multi-stage Node 20 + Nginx Alpine), Docker Compose |
| **Backend & Auth** | Supabase (PostgreSQL 15, Auth JWT, Row Level Security) |
| **PWA & Offline** | Service Worker, Web App Manifest |

---

## 📁 Estrutura de Diretórios

```bash
saas-nosso-dia/
├── apps/
│   └── web/                         # Aplicação Frontend React + Vite
│       ├── nginx.conf               # Configuração do Nginx para SPA
│       ├── index.html               # Entrypoint HTML com Plus Jakarta Sans
│       ├── package.json             # Dependências e scripts do web
│       ├── src/
│       │   ├── App.tsx              # Componente raiz e orquestrador de estado
│       │   ├── components/          # Componentes modulares de UI
│       │   │   ├── ActivityCard.tsx              # Card de atividade com metadados
│       │   │   ├── AddManualActivityModal.tsx    # Modal de cadastro de rotinas/eventos
│       │   │   ├── CalendarNavigation.tsx        # Barra de período e modos (Dia/Sem/Mês)
│       │   │   ├── DayView.tsx                   # Visão diária
│       │   │   ├── EditActivityModal.tsx         # Edição e exclusão seletiva
│       │   │   ├── FamilyManageModal.tsx         # Gestão de membros e cores
│       │   │   ├── Header.tsx                    # Header glassmorphism com botões
│       │   │   ├── MonthView.tsx                 # Visão mensal
│       │   │   ├── Onboarding.tsx                # Boas-vindas e setup inicial
│       │   │   ├── QuickAddWithAI.tsx            # Captura rápida com IA
│       │   │   ├── UnassignedActivitiesModal.tsx # Atribuição rápida de responsáveis
│       │   │   └── WeekView.tsx                  # Grade semanal principal
│       │   ├── lib/
│       │   │   ├── notifications.ts # Lógica de Web Notifications
│       │   │   └── supabase.ts      # Cliente Supabase
│       │   └── types/
│       │       └── index.ts         # Interfaces e tipagens TypeScript
│       └── vite.config.ts
├── docs/                            # Documentação técnica e funcional
│   ├── ARCHITECTURE.md              # Topologia e decisões arquiteturais
│   ├── DATABASE.md                  # Esquema relacional e RLS
│   ├── PRD.md                       # Product Requirements Document
│   └── SECURITY.md                  # Políticas de segurança e Zero-Trust
├── supabase/
│   ├── migrations/                  # Scripts SQL de schema e políticas RLS
│   └── tests/                       # Testes de penetração de segurança SQL
├── Dockerfile                       # Multi-stage build para produção
├── docker-compose.yml               # Execução local orquestrada
├── .dockerignore                    # Otimização de contexto Docker
└── README.md                        # Documentação do projeto
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior) ou **Docker**
- Projeto no [Supabase](https://supabase.com/) configurado

### 1. Clonar o Repositório
```bash
git clone https://github.com/FlavioSantTI/saas-nosso-dia.git
cd saas-nosso-dia
```

### 2. Configurar Variáveis de Ambiente
Na pasta `apps/web/`, crie ou edite o arquivo `.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 3. Execução em Modo Desenvolvimento (Node.js)
```bash
cd apps/web
npm install
npm run dev
```
Acesse no navegador: `http://localhost:5173`

### 4. Execução com Docker (Produção Local)
```bash
# Na raiz do projeto:
docker compose up -d --build
```
Acesse no navegador: `http://localhost:8080`

### 5. Validação de Tipos (TypeScript)
```bash
cd apps/web
npm run typecheck
```

---

## 🗄️ Banco de Dados & Migrações Supabase

Execute a migração inicial localizada em `supabase/migrations/20261007000001_init_nosso_dia.sql` no SQL Editor do Supabase para criar:
- Tabelas: `families`, `family_members`, `routines`, `events`, `locations`.
- Chaves estrangeiras e índices de performance.
- Regras de **Row Level Security (RLS)** para isolamento absoluto entre famílias.

---

## 📜 Controle de Versão (Changelog)

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e aderente ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

### [v1.0.3] — 2026-10-09
#### ✨ Adicionado
- **Rodapé Global:** Adicionado rodapé fixo na aplicação com versão `v1.0.0` e assinatura *"Powered by Flavio Santiago Consultor IA — 2026"*.
- **Controle de Versão no README:** Documentação detalhada de histórico e versionamento do ecossistema.

#### 🐛 Corrigido
- **Link de Convite Multi-Ambiente:** Substituído host fixo `localhost:5173` por `window.location.origin` no modal de Gestão Familiar, gerando links perfeitos para produção (`https://nossodia.flaviosantiago.com.br/`).

---

### [v1.0.2] — 2026-10-09
#### 🐳 Infraestrutura & Containerização
- **Dockerfile Multi-Stage:** Build otimizado com Node 20 Alpine e servidor final Nginx Alpine.
- **Nginx SPA Configuration:** Regras de roteamento fallback para `index.html`, compressão Gzip e cache de assets.
- **Docker Compose:** Orquestração automatizada para deploy e testes locais (`docker-compose.yml` e `.dockerignore`).

---

### [v1.0.1] — 2026-10-09
#### 🎨 UI / UX Redesign (Modern Craft / Natureza & Equilíbrio)
- **Tipografia:** Integração global da fonte *Plus Jakarta Sans*.
- **Cabeçalho Glassmorphism:** Vidro fosco translúcido (`backdrop-blur-md`), cápsula de logo ND em azul suave e radar de status verde sálvia.
- **Grade Semanal e Empty States:** Destaque do dia atual (*Hoje*) com borda céu suave e visual acolhedor com ícone `Sun` (*"Dia livre para relaxar! ☀️"*).
- **Cards & Ícones:** Adoção de ícones do *Lucide React* (`Clock`, `MapPin`, `User`, `Bell`, `AlertTriangle`).
- **Modais de Ação:** Diálogos com desfoque de fundo suave e cantos arredondados (`rounded-3xl`).
- **Exclusão Seletiva Unificada:** Opções incondicionais no modal de exclusão com fallback automático por título e horário para registros legados.

---

### [v1.0.0] — 2026-10-07
#### 🚀 Lançamento Inicial (MVP)
- Core de cadastro de rotinas semanais recorrentes e eventos pontuais.
- Multi-tenancy com isolamento hermético via Supabase Row Level Security (RLS).
- Gestão de membros familiares com cores distintivas e perfis independentes.
- Detecção básica de conflitos de horários por responsável.
- Captura rápida com Inteligência Artificial para mensagens de texto e WhatsApp.
- Suporte a notificações locais no navegador (Web Notifications API).

---

## 👤 Autor & Créditos

Desenvolvido por **Flávio Santiago** — Consultor em Inteligência Artificial e Engenharia de Software.

* **GitHub:** [@FlavioSantTI](https://github.com/FlavioSantTI)
* **Plataforma:** [nossodia.flaviosantiago.com.br](https://nossodia.flaviosantiago.com.br/)

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais informações.
