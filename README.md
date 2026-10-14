# 🌟 Nosso Dia — Sistema de Coordenação da Rotina Familiar

<div align="center">

![Nosso Dia Logo](https://img.shields.io/badge/Nosso_Dia-Coordenação_Familiar-0284C7?style=for-the-badge&logo=google-calendar&logoColor=white)
![Versão](https://img.shields.io/badge/Versão-v1.5.7-059669?style=for-the-badge)
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

### [v1.5.7] — 2026-10-13
#### 🕒 Correção Definitiva de Horários Literais, Sumiço Noturno (21h) e Duplicatas
- **Novo módulo central `apps/web/src/lib/dateUtils.ts`:**
  - `extractLiteralTime` / `formatTimeLiteral`: extrai `HH:mm` direto da string do banco, sem conversão de fuso — acaba com o deslocamento de **-3h** (ex.: `18:00` exibido como `15:00`).
  - `extractLiteralDate`: extrai `YYYY-MM-DD` literal do timestamp.
  - `getLocalDateString` / `toLocalDateString`: data de hoje pelo relógio local do dispositivo — **sem `toISOString()`**, eliminando o sumiço das atividades após as 21:00 (meia-noite UTC).
  - `parseSafeLocalDate`, `getLiteralDayOfWeek`, `buildNominalTimestamp`, `buildNominalEndTimestamp`.
  - `deduplicateAndCleanEvents`: deduplicação por `routine_id + data + hora` (ou `título + data + hora`), unificando participantes (ex.: *Rafa, Maria*) no mesmo card.
- **Deduplicação automática (`App.tsx`):** eventos duplicados são removidos da tela na hora e excluídos do banco em segundo plano. A materialização de rotinas (`ensureRoutineEvents` e sincronização de 90 dias) verifica a chave literal antes de inserir, impedindo novas duplicatas.
- **Gravação nominal:** criação, edição e arrastar-e-soltar de atividades passam a salvar o horário exatamente como escolhido pelo usuário.
- **Componentes atualizados:** `ActivityCard`, `DayView`, `WeekView`, `MonthView`, `DailyBriefingCard`, `SummaryModal`, `EditActivityModal`, `UnassignedActivitiesModal` — filtros, ordenação, contagem regressiva e detecção de conflitos agora usam data/hora literais.
- **Fim do texto colado ("escolaEscola"):** título e local sempre separados visualmente (`• 📍 Local`).
- **Calendário abre no dia atual** (antes iniciava fixo em 05/10/2026).

#### 🔐 Admin, Segurança e Alarmes
- **`components/AdminUserManagement.tsx` (standalone):** ativação direta e troca de senha com listagem própria via `admin_list_users` e mensagem pronta para WhatsApp (link em texto puro). *Ainda não integrado ao `/admin`; a versão em uso continua sendo `components/admin/AdminUserManagement.tsx`.*
- **`nginx.conf`:** headers OWASP mantidos junto com CSP e gzip; headers de segurança agora também aplicados aos assets estáticos (correção da herança de `add_header` no Nginx).
- **`lib/alarmIcsGenerator.ts`:** geração de `.ics` com `VALARM` (15 min antes e no horário), compatível com RFC 5545 (VTIMEZONE `America/Araguaina`, `DTSTAMP` UTC, escape de texto e dobra de linhas). *Botão de uso na interface pendente.*
- **Rótulo Global de Versão:** atualizado para `v1.5.7` no rodapé, no `package.json` e no `README.md`.

### [v1.5.6] — 2026-10-13
#### 🔑 Painel Root Admin: Ativação Direta de Usuários & Gestão de Senhas
- **Novo Componente de Gestão Direta (`AdminUserManagement.tsx`):**
  - Permite ao Root Super-Admin ativar contas, redefinir senhas e criar acessos imediatos para usuários sem depender de links ou e-mails de confirmação.
  - **Formulário Ágil de Credenciais:**
    - Campo de e-mail com validação rigorosa de formato e sanitização `.trim()`.
    - Campo de nova senha exibido visível por padrão (com alternador de visibilidade `Eye` / `EyeOff`) para conferência antes do compartilhamento.
    - Botão **"Gerar Senha Fácil" / "Sugerir Senha Amigável"** com rotação de senhas amigáveis e seguras (ex.: `NossoDia2026!`, `Familia2026!`, `AcessoFacil26`, `RotinaLeve26!`, `VidaFeliz2026!`).
    - Botão **"Ativar & Definir Senha"** disparando a RPC segura `admin_set_user_credentials` no Supabase com indicador de carregamento e travamento contra cliques duplicados.
  - **Card de Sucesso & Compartilhamento via WhatsApp:**
    - Exibição de card visual confirmando a ativação instantânea com dados de acesso.
    - Botão **"📋 Copiar Acesso para WhatsApp"** que copia a mensagem oficial padronizada para a área de transferência:
      ```text
      Oi! Já deixei seu acesso pronto no Nosso Dia.

      📱 Link: https://nossodia.flaviosantiago.com.br
      📧 E-mail: {email}
      🔑 Senha: {password}

      É só abrir o link, colocar esse e-mail e senha e entrar. Não precisa confirmar nada no e-mail!
      ```
    - Ação auxiliar para abrir o WhatsApp Web diretamente com mensagem pré-preenchida e botão para cópia rápida apenas da senha.
- **Integração no Painel Administrativo (`AdminDashboard.tsx`):**
  - Módulo posicionado no topo da aba *"👥 Gestão de Usuários > Contas de Acesso (Auth & Login)"*.
  - Adoção prioritária da RPC `admin_list_users()` na listagem de usuários do banco, trazendo registros reais de `auth.users` com fallback resiliente.
  - Adicionado botão **"🔑 Definir Senha Direta"** por linha da tabela de usuários, preenchendo o formulário superior e rolando a tela suavemente para a ação.
- **Rótulo Global de Versão:** Atualizado para `v1.5.6` no rodapé da aplicação, no `package.json` e no `README.md`.

### [v1.5.5] — 2026-10-12
#### 🚀 Landing Page Pública & Roteamento de Entrada Inteligente
- **Nova Landing Page Pública (`LandingPage.tsx`):**
  - Porta de entrada pública moderna e acolhedora projetada para apresentar a proposta de valor do Nosso Dia e converter visitantes em degustações de 14 dias sem cartão de crédito.
  - Aderente às diretrizes de acessibilidade WCAG AA (contraste mínimo 4,5:1), mobile-first em 375px sem scroll lateral e navegação fluida por teclado (`Tab`, `Enter`, `Espaço`, `Esc`).
  - **9 Seções Semânticas Estruturadas:**
    1. **Header Público:** Logo oficial, links âncora com rolagem suave (`#como-funciona`, `#recursos`, `#planos`, `#duvidas`), botão *"Já sou cadastrado"* e menu hambúrguer responsivo para smartphones.
    2. **Hero Section:** HeroBadge com ícone, `<h1>` único de alto impacto, subtítulo explicativo, CTA primário *"Experimente grátis por 14 dias"*, microcopy de PWA e maquete visual ilustrativa da grade semanal com dados didáticos genéricos (sem dados reais de crianças).
    3. **A Dor Familiar:** Três cards acolhedores (*Recados escolares esquecidos*, *Desencontro de caronas* e *Sobrecarga mental concentrada*).
    4. **Os Três Pilares da Solução:** *Semana em foco* (ciclos de 7 dias), *Responsabilidade definida por compromisso* (quem leva e quem busca) e *Alertas antes dos conflitos*.
    5. **Recursos:** Grid interativo destacando o Kanban semanal, Briefing matinal diário, Captura rápida com Inteligência Artificial e Lembretes locais.
    6. **Catálogo de Planos (#planos):** Consulta assíncrona ao Supabase com fallback de resiliência de 3s (`FALLBACK_PLANS`), cartões dinâmicos com créditos de IA (`⚡ [X] Créditos de IA / mês`), selos de mídia com ícones do Lucide (`Texto`, `Voz`, `Fotos`, `PDFs`), preços formatados em BRL e botões diretos de adesão.
    7. **Privacidade & Conformidade LGPD:** Box de destaque com ícone `ShieldCheck`, compromisso com criptografia e isolamento hermético via Row Level Security (RLS), com link para minuta marcada como `[PENDENTE REVISÃO JURÍDICA]`.
    8. **FAQ Acessível:** Acordeão dinâmico com 5 respostas diretas para as dúvidas mais frequentes dos pais, com suporte a teclado e telemetria de abertura (`faq_open`).
    9. **Rodapé Oficial:** Copyright 2026, menção à Software House Agêntica e links para políticas legais.
  - **Sticky Bar Mobile:** Botão inferior fixo com ação rápida *"Experimente grátis"* ativado contextualmente ao rolar a página em smartphones.
  - **Telemetria / Eventos de Interação:** Disparo de eventos `login_header_click`, `cta_hero_click`, `cta_planos_click` e `faq_open`.

- **Roteamento de Entrada Inteligente (`App.tsx`):**
  - **Carregamento Inicial Neutro:** Tela de espera anti-flash com spinner sobre fundo suave (`#F4F8FA`), garantindo que nem a landing nem o painel sejam renderizados antes da checagem de sessão do Supabase Auth.
  - **Visitantes Não Autenticados:** Renderização da Landing Page pública com acionamento do `AuthModal` sob demanda nas abas corretas (`login` ou `register`).
  - **Preservação de Convite Familiar:** O parâmetro de query string `?invite=...` é preservado intacto na URL até que o usuário conclua seu fluxo de cadastro.
  - **Usuários Autenticados Sem Família:** Encaminhamento estrito e mandatório para o fluxo de `Onboarding` (criação de família). Estes usuários nunca visualizam a Landing Page pública.
  - **Usuários Autenticados Com Família:** Acesso direto e inalterado ao painel semanal da família (`WeekView`, `BriefingCard`, etc.).

- **SEO & Metadados (`index.html`):**
  - Título otimizado: `Nosso Dia — A Central Inteligente da Rotina Familiar`.
  * Meta description para conversão em buscadores.
  - Tags OpenGraph completas (1200x630, locale `pt_BR`) e Twitter Card para visualização enriquecida no WhatsApp, Facebook e redes sociais.

- **Resiliência e Constantes (`plans.ts`):**
  - Criação de `apps/web/src/constants/plans.ts` com tipagem `LandingPlan` e fallback resiliente dos planos comerciais (Degustação, Família Essencial, Família Pro IA e Família Pro IA Anual).
- **Rótulo Global de Versão:** Atualizado para `v1.5.5` no rodapé da aplicação e no `package.json`.

### [v1.5.1] — 2026-10-12
#### ✉️ E-mail em Perfis Familiares & Disparo Rápido de Convites
- **Campo de E-mail no Cadastro/Edição de Membros (`FamilyMember`):**
  - Adicionado suporte a `email?: string | null` nos tipos do TypeScript e coluna `email TEXT` na tabela `public.family_members`.
  - Formulário intuitivo nos modais (`FamilyManageModal.tsx` e `/admin`):
    - Label explicativa: *"E-mail (opcional para crianças, necessário para acesso)"*.
    - Input otimizado para e-mail com placeholder demonstrativo.
- **Botão de Disparo Rápido de Convite (`[ ✉️ Enviar Convite de Acesso ]`):**
  - Exibido para membros adultos (`role !== 'CHILD'`) que possuem e-mail informado.
  - Integração com Supabase OTP (`supabase.auth.signInWithOtp({ email, options: { data: { family_id } } })`), disparando link mágico diretamente para a caixa de entrada do membro.
  - Feedback visual imediato com Toast verde de sucesso: *"Convite de acesso enviado com sucesso para [e-mail]!"*.
- **Migration SQL:**
  - `20261012000002_add_email_to_family_members.sql`: Adiciona coluna `email` com índice de busca em `family_members`.

#### 👥 Painel de Gestão e Acessos de Usuários no Super-Admin (`/admin`)
- **Nova Aba "Gestão de Usuários" (`AdminDashboard.tsx`):**
  - Adicionada aba dedicada **`[ 👥 Gestão de Usuários ]`** no topo do painel administrativo.
  - Interface tipada `AdminUserListItem` consolidando dados de contas: E-mail, Família Vinculada, Data de Cadastro, Último Acesso, Status de Ativação e indicação de Super-Admin.
- **Tabela Moderna e Ações Administrativas:**
  - **Coluna 1 (Usuário):** E-mail com badge visual `🛡️ Super-Admin` e UID do Supabase.
  - **Coluna 2 (Família Vinculada):** Nome da família/tenant associado com badge estilizado.
  - **Coluna 3 (Cadastro & Último Acesso):** Datas formatadas em padrão pt-BR com horário do último login.
  - **Coluna 4 (Status):** Pílulas interativas `● Ativo` (verde) e `● Desativado` (vermelho).
  - **Coluna 5 (Ações):**
    - **[ Desativar ] / [ Reativar ]:** Aciona a RPC `admin_toggle_user_status` no Supabase, com atualização otimista na tela e feedback via Toast.
    - **[ Redefinir Senha ]:** Dispara e-mail oficial de redefinição de senha pelo Supabase Auth (`supabase.auth.resetPasswordForEmail`) com notificação instantânea.
- **Modal de Criação / Convite Rápido de Usuário (`+ Novo Usuário / Convite`):**
  - Modal com campos para E-mail e seleção da Família de destino, disparando convite administrativo e integrando o novo usuário à plataforma.
- **Sub-Visão de Perfis Familiares e Dependentes:**
  - Alternador intuitivo permitindo gerenciar tanto as contas de autenticação (login) quanto os perfis familiares (dependentes, crianças e cores de avatar).
- **Catálogo Dinâmico de Planos com IA Multimodal:**
  - Exibição de créditos de IA (`⚡ [X] Créditos de IA / mês`) e selos de mídias suportadas (`📝 Texto`, `🎙️ Voz`, `📸 Fotos`, `📄 PDFs`) nos cards de planos do Super-Admin e no modal de assinatura.
- **Migration de Segurança no Banco:**
  - `20261012000001_add_admin_user_management.sql`: Criação da RPC `public.admin_toggle_user_status(UUID, BOOLEAN)` com verificação de privilégios de Super-Admin.
- **Rodapé Global:** Rótulo de versão atualizado para `v1.5.1`.

### [v1.5.0] — 2026-10-11
#### 🚪 Refinamento do Fluxo de Autenticação, Logout Canônico & Roteamento Standalone
- **Redirecionamento Imediato no Logout (`handleLogout`):**
  - Encerramento completo e seguro da sessão no Supabase Auth (`supabase.auth.signOut()`).
  - Limpeza profunda de tokens e credenciais locais (`localStorage.clear()` e `sessionStorage.clear()`).
  - Reset imediato em memória de todos os estados reativos da aplicação (`currentUser = null`, `currentMember = null`, `family = null`, `members = []`, `events = []`).
  - Transição instantânea sem recarregamento forçado de página (`authView = 'login'`), eliminando o efeito de piscamento ou reabertura do painel.
- **Tela de Entrada Limpa de Login (`AuthModal.tsx` Standalone):**
  - Usuários deslogados agora são direcionados para uma tela de Login limpa e dedicada com campos de E-mail e Senha, abas alternadoras [ Entrar ] / [ Criar Conta ], logotipo oficial redondo e botão de ação direta *"Entrar no Nosso Dia"*.
  - **Link Discreto de Criação:** Inclusão no rodapé do card: *"Ainda não tem uma família cadastrada? [Criar Família]"*, permitindo acesso ao Onboarding sob demanda.
- **Blindagem de Carregamento sem Sessão Ativa (`App.tsx`):**
  - A função `loadData()` passa a exigir sessão ativa no Supabase Auth antes de consultar dados de famílias, bloqueando consultas anônimas automáticas a tenants e mantendo a privacidade estrita da família.
  - Sincronização em tempo real via listener `onAuthStateChange` para zerar o estado da interface no evento `SIGNED_OUT`.
- **Feedback Visual Aprimorado (`Header.tsx`):**
  - Animação de carregamento (`Loader2`) e texto dinâmico *"Saindo..."* ao clicar no botão de logout, com bloqueio contra múltiplos cliques acidentais.
  - Detecção rigorosa de sessão ativa baseada estritamente em `!!currentUser`.
- **Rodapé Global:** Tag de versão atualizada para `v1.5.0`.

### [v1.4.1] — 2026-10-11
#### 🛡️ Módulo Super-Admin (`/admin`), Faturamento Asaas & Blindagem LGPD
- **Painel Central Super-Admin (`AdminDashboard.tsx`):**
  - **Acesso Seguro:** Protegido por verificação via RPC `is_super_admin()` e tabela `platform_admins` no Supabase com bloqueio e fallback elegante para usuários não autorizados.
  - **Aba 1: Métricas Financeiras & MRR:**
    - Cards de Total de Famílias (Tenants Ativos no Brasil), Assinantes Pagantes (Taxa de Conversão), MRR Estimado (R$) e Famílias em Degustação (Trial).
  - **Aba 2: Gestão de Tenants (100% LGPD Compliant — Zero-Knowledge Architecture):**
    - Tabela de metadados contábeis e de cobrança (Tenant ID, Nome da Família, E-mail do Responsável, Plano, Status e Vencimento).
    - **Blindagem LGPD Máxima:** Rotinas, compromissos familiares, locais e dados de crianças são estritamente isolados e inacessíveis a administradores de infraestrutura.
    - Ações diretas: `[ Trocar Plano ]`, `[ +14d Trial ]` e `[ Cancelar Assinatura ]`.
  - **Aba 3: Catálogo Comercial de Planos:**
    - Listagem de planos ativos (`Degustação`, `Família Essencial`, `Família Pro IA`, `Família Pro IA Anual`) com formulário para cadastro e edição de preços, ciclo e benefícios.
- **Integração com o Gateway de Pagamentos Asaas (`asaas.ts`):**
  - Contratos para criação de cliente (`createAsaasCustomer`) e assinaturas recorrentes (`createSubscription`) via **Pix Instantâneo (QR Code)** e **Cartão de Crédito Recorrente**.
  - Parser de webhooks para conciliação bancária (`PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_CANCELED`).
- **Aba "Plano & Assinatura" na Gestão Familiar (`FamilyManageModal.tsx`):**
  - Exibição acolhedora do plano ativo com contagem regressiva do período de degustação.
  - Seleção de planos e forma de pagamento com botão direto `[ 💳 Assinar Plano via Asaas (Pix / Cartão) ]`.

#### 👤 Evolução Arquitetural de Domínio: Nickname e Nome Canônico
- **Separação entre Nome Completo e Nome Familiar:**
  - Adicionado campo opcional `nickname` na entidade `FamilyMember` e migration SQL de banco de dados (`20261011000001_add_nickname_to_family_members.sql`).
  - Novos campos nos modais de cadastro e edição: *"Como é chamado(a) na casa? (Apelido ou Primeiro Nome)"*.
- **Função Utilitária Canônica (`formatters.ts`):**
  - Função `getMemberDisplayName(member)` aplicada universalmente no app (filtros, cards de atividade, briefing matinal, alertas de conflito e relatórios).
- **Identidade Visual Oficial:**
  - Substituição da cápsula textual "ND" pelo logotipo oficial redondo `/icons/logo-round-1024.png` com fallback resiliente.
- **Rodapé Global:** Tag de versão atualizada para `v1.4.1`.

---

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
