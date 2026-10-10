# 🌟 Nosso Dia — Sistema de Coordenação da Rotina Familiar

<div align="center">

![Nosso Dia Logo](https://img.shields.io/badge/Nosso_Dia-Coordenação_Familiar-0284C7?style=for-the-badge&logo=google-calendar&logoColor=white)
![Versão](https://img.shields.io/badge/Versão-v1.4.0-059669?style=for-the-badge)
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

### 🤖 4. Captura Rápida Multimodal com Gemini (Fase 2)
- **📝 Texto:** Cole textos brutos vindos do WhatsApp, recados da escola ou lembretes.
- **🎙️ Mensagem de Voz:** Grave instruções de áudio pelo navegador com o `MediaRecorder` nativo e transcrição/estruturação via Gemini Flash.
- **📸 Fotos & Documentos (PDF):** Envie fotos de avisos escolares, bilhetes impressos ou calendários em PDF para análise visual da IA.
- **Card de Confirmação:** Extração com Structured Outputs (JSON Schema), exibindo badges coloridos dos membros identificados (Flávio, Silvia, Rafael) e papéis (Participante e Responsável).

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

### [v1.4.0] — 2026-10-10
#### ☀️ Briefing Matinal & Relatório Diário (`DailyBriefingCard.tsx`)
- **Card Acolhedor de Abertura:** Saudação dinâmica baseada no turno (*"☀️ Bom dia / 🌤️ Boa tarde / 🌙 Boa noite, [Nome]!"*) com data por extenso e membro ativo.
- **Relatório Operacional das Suas Missões:**
  - Contagem clara de atividades sob sua responsabilidade direta no dia (`responsible_id`), com listagem cronológica contendo horário, participantes e local.
  - Alerta comemorativo quando todas as tarefas estão livres (*"🎉 Nenhuma atividade sob sua responsabilidade hoje! Aproveite o dia livre"*).
- **Próxima Saída em Destaque:** Indicador com contagem regressiva em minutos para a próxima saída ou compromisso nas próximas horas (*"⏱️ Próxima saída: em [X] minutos para [Local]"*).
- **Visão Compartilhada do Cônjuge (Paz de Espírito):** Card complementar exibindo as atividades que o parceiro/cônjuge assumiu no dia.
- **Controle Ergonômico:** Botão discreto para recolher/expandir o card, otimizando o espaço útil da tela.

#### 🔔 Sistema de Feedback Visual (Toasts de Sucesso e Erro — `Toast.tsx`)
- **Notificações Flutuantes (z-50):** Avisos animados no topo da tela com auto-dismiss em 3 segundos.
- **Eventos Monitorados:**
  - Criação de atividade (Manual ou IA): *"🎉 Atividade adicionada à rotina com sucesso!"*
  - Edição salva: *"✓ Alterações salvas com sucesso!"*
  - Exclusão de evento/série: *"🗑️ Atividade removida da semana."*
  - Atribuição de responsável: *"👤 [Nome] definido como responsável!"*
  - Link de convite copiado: *"🔗 Link de convite copiado para a área de transferência!"*
  - Falhas gerais: *"⚠️ Não foi possível salvar. Tente novamente."*
- **Bloqueio de Duplo Clique & Loading:** Botões de formulário exibem *"Salvando..."* e desabilitam durante requisições assíncronas.

#### 📱 Responsividade Mobile no Header & Travamento de Scroll
- **Header Otimizado para Smartphones (< 640px):**
  - Logo "ND" compacto à esquerda com nome da família truncado sem estourar.
  - Botões prioritários em destaque: `+ Nova` e `🤖 IA`.
  - Menu suspenso de 3 pontinhos ('⋮') agrupando *Balanço da Semana*, *Meu Dia Hoje*, *Gerenciar Família* e *Entrar/Sair*.
- **Prevenção de Scroll Lateral:** Adicionado `overflow-x-hidden` no `<html>`, `<body>` e container principal, travando o scroll horizontal no iPhone e Safari móvel.
- **Rodapé Global:** Tag de versão atualizada para `v1.4.0`.

---

### [v1.3.0] — 2026-10-10
#### 🔐 Autenticação Real & Convite Familiar (Supabase Auth)
- **Modal de Autenticação (`AuthModal.tsx`):**
  - Abas intuitivas de **Entrar** e **Criar Conta** com validação de dados (E-mail, Senha e Nome).
  - Integração nativa com `supabase.auth.signInWithPassword` e `supabase.auth.signUp`.
- **Fluxo Inteligente de Convite Familiar:**
  - Detecção dinâmica de parâmetro de convite na URL (`?invite=[family_id]`).
  - Apresentação de banner caloroso: *"Você foi convidado(a) para participar da Família [Nome]!"*.
  - Associação automática do `user_id` autenticado ao respectivo membro adulto em `family_members`.
- **Gestão de Sessão & Perfil (`Header.tsx` e `App.tsx`):**
  - Monitoramento em tempo real com `supabase.auth.onAuthStateChange`.
  - Exibição de avatar e nome do usuário ativo (ex: `👤 Flávio`) com dropdown de perfil e botão de encerramento seguro de sessão (**"Sair (Logout)"**).
  - Botão de acesso rápido **"Entrar"** quando deslogado.
- **Links de Convite Seguros (`FamilyManageModal.tsx`):**
  - Seção *"🔗 Convidar Cônjuge/Responsável"* com cópia de URL formatada diretamente a partir da origem: `${window.location.origin}/?invite=${family.id}`.

#### 📊 Painel Duplo de Resumo (`SummaryModal.tsx`)
- **☀️ Modo Operacional — "Meu Dia Hoje":**
  - Identificação automática do membro logado (ou seletor de adultos responsáveis).
  - Saudação personalizada contextual ao horário (*"☀️ Bom dia / Boa tarde / Boa noite, [Nome]!"*).
  - **Próximo Compromisso:** Contagem regressiva em tempo real com indicador visual (*"⏱️ Próxima atividade em X minutos"*).
  - **Linha do Tempo Vertical:** Sequência cronológica das atividades do dia sob responsabilidade do membro, com horários, participantes e locais.
  - **Tranquilidade Familiar:** Card de visibilidade sutil com as atividades que o outro cônjuge/responsável assumiu no dia.
- **📊 Modo Planejamento — "Balanço da Semana":**
  - **Total de Atividades:** Quantitativo consolidado da semana visível.
  - **Divisão da Logística Familiar:** Barra comparativa visual e percentual da carga de compromissos assumida por cada cônjuge vs tarefas sem responsável.
  - **Destaque de Pendências:** Alerta amarelo para eventos sem responsável com botão de ação direta **"Atribuir Agora"** (abrindo o `UnassignedActivitiesModal`).
  - **Distribuição por Filho:** Contagem e agrupamento de compromissos por dependente.
  - **Datas Especiais & Aniversários:** Destaque de eventos de dia inteiro (`is_all_day`) com badges comemorativos (`🎂` e `📌`).
- **Navegação & Atalhos:** Botões dedicados **"📊 Resumo & Balanço"** no Header e **"Balanço"** na barra temporal do calendário.
- **Rodapé Global:** Tag de versão atualizada para `v1.3.0`.

---

### [v1.1.0] — 2026-10-10
#### 🤖 Fase 2: Quick Capture Multimodal com Gemini
- **Serviço de IA (`gemini.ts`):** Integração direta com a API do Google Gemini (`gemini-flash-latest:generateContent`) com *Structured Outputs* (JSON Schema forçado).
- **Entrada Multimodal Tripla (`QuickAddWithAI.tsx`):**
  - **📝 Texto:** Extração de compromissos a partir de mensagens soltas de WhatsApp ou e-mails.
  - **🎙️ Mensagem de Voz:** Gravação direta de áudio pelo navegador com `MediaRecorder` nativo e processamento via Gemini.
  - **📸 Fotos & PDFs:** Upload e processamento visual de bilhetes escolares, calendários e avisos em imagem ou PDF.
- **Card de Confirmação com Badges Coloridos:** Identificação e atribuição visual imediata de membros (Flávio, Silvia, Rafael) e seus papéis (Participante / Responsável) antes de salvar.

#### ⚙️ CI/CD & Deploy no GHCR
- **GitHub Actions Workflow (`deploy.yml`):** Esteira de integração contínua com validação estrita de TypeScript (`typecheck`), build do Vite e publicação de containers Docker no GitHub Container Registry (`ghcr.io/flaviosantti/saas-nosso-dia`).
- **Versionamento de Containers:** Tags automáticas para `latest`, branch e SHA do commit.

#### 🛡️ Banco de Dados & Estabilidade
- **Correção de Políticas RLS no Supabase (`20261010000001_fix_rls_anon_permissions.sql`):** Políticas liberadas para atualização de nome de família, edição/exclusão de membros e rotinas para conexões da aplicação.
- **Eliminação do Erro PGRST116:** Adoção de `.maybeSingle()` e validação segura de retorno no Supabase.
- **Link de Convite de Produção:** Utilitário centralizado `getFamilyInviteUrl()` garantindo que o link de convite utilize sempre o domínio de produção (`https://nossodia.flaviosantiago.com.br/`).
- **Rodapé Global:** Atualizada a tag de versão para `v1.1.0`.

---

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
