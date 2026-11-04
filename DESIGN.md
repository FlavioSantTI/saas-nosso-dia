---
name: Nosso Dia
description: Central Inteligente da Rotina e Logística Familiar
colors:
  primary: "#0284C7"
  primary-dark: "#0369A1"
  primary-light: "#E0F2FE"
  secondary: "#059669"
  secondary-light: "#D1FAE5"
  amber-solar: "#D97706"
  amber-light: "#FEF3C7"
  terracota: "#EA580C"
  neutral-bg: "#F4F8FA"
  surface: "#FFFFFF"
  text-primary: "#0F172A"
  text-secondary: "#475569"
  text-muted: "#64748B"
  border-subtle: "#E2E8F0"
  border-focus: "#0284C7"
typography:
  display:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title-sm:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  card-activity:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
---

# Design System — Nosso Dia

## 1. Overview
O **Nosso Dia** utiliza uma linguagem visual acolhedora, moderna e extremamente funcional (*Modern Craft*). O objetivo estético é transmitir tranquilidade, ordem e cumplicidade para pais e mães que gerenciam agendas intensas de filhos e da casa. Distancia-se da rigidez corporativa cinzenta e de dashboards analíticos frios, priorizando legibilidade instantânea sob a luz do sol e conforto ergonômico no uso com uma mão só (Mobile-First).

## 2. Colors
A paleta combina o frescor do azul e verde com o calor solar do âmbar e da terracota:
- **Azul Oceano (`#0284C7` / `#0369A1`):** Cor primária de navegação, cabeçalhos, ações principais e foco.
- **Verde Sálvia (`#059669` / `#D1FAE5`):** Confirmações, pontualidade, badges de conclusão e sucesso.
- **Âmbar Solar (`#D97706` / `#FEF3C7`):** Destaque para o resumo matinal ("Meu Dia"), IA e alertas amigáveis (atividades sem responsável).
- **Terracota Suave (`#EA580C`):** Energia, datas comemorativas e notificações de atenção.
- **Fundo Off-White (`#F4F8FA`):** Superfície base de baixo cansaço visual, substituindo o branco puro estéril.
- **Hierarquia de Textos (WCAG 2.2 AA):**
  - Títulos e Destaques: `slate-900` (`#0F172A`) — contraste > 10:1.
  - Textos de Apoio e Rótulos: `slate-700` (`#334155`) e `slate-600` (`#475569`) — contraste > 5:1.
  - **Proibição Estrita:** Não utilizar `text-slate-400` em textos informativos de horário, responsável ou local sobre fundos claros, pois apresenta contraste de apenas 2.9:1.

## 3. Typography
- **Família Tipográfica Principal:** `Plus Jakarta Sans` (Google Fonts), com fallbacks nativos `system-ui, -apple-system, sans-serif`.
- **Tamanhos e Pesos:**
  - `Display / H1`: 28px (`1.75rem`), peso 800, tracking -0.02em.
  - `Title / H2`: 20px-22px (`1.375rem`), peso 700.
  - `Title-SM / H3`: 18px (`1.125rem`), peso 700.
  - `Body / Inputs`: 16px (`1rem`), peso 500 — **Regra de Ouro:** Inputs de texto e seleção devem ter no mínimo 16px para evitar zoom automático no iOS Safari.
  - `Body-SM`: 14px (`0.875rem`), peso 500.
  - `Caption`: 13px (`0.8125rem`), peso 600.

## 4. Layout
- **Estrutura App Shell:**
  - Container raiz fixo com `h-[100dvh] overflow-hidden` para comportamento de aplicativo nativo.
  - Header compacto superior (48px - 54px) com identidade e busca.
  - Frame central com rolagem suave independente (`flex-1 overflow-y-auto overscroll-contain`).
  - Menu Bar no rodapé (`BottomNavBar`) fixo com área segura inferior (`pb-[env(safe-area-inset-bottom)]`).
- **Navegação Semanal no Mobile:**
  - Fita horizontal de dias da semana (Date Strip) no topo da tela, permitindo troca imediata do dia focado com toque ou swipe.
- **Navegação no Desktop:**
  - Grade expandida de 7 colunas alinhadas confortavelmente dentro do frame máximo de `max-w-7xl`.

## 5. Elevation & Depth
- O sistema privilegia **camadas tonais suaves** em vez de sombras pesadas:
  - Cards e Painéis: `shadow-2xs` (`0 1px 2px rgba(0,0,0,0.04)`) e bordas suaves `border-sky-100` ou `border-slate-200/80`.
  - Botão Central FAB: Sombra projetada `shadow-lg shadow-sky-500/35` para destacar o botão central na zona do polegar.
  - Modais e Bottom Sheets: `shadow-2xl` com backdrop blur de 4px (`backdrop-blur-xs bg-slate-900/40`).

## 6. Shapes
- **Raios de Borda (Border Radius):**
  - Elementos principais (Cards, Modais, Bottom Bar): `rounded-2xl` (16px) a `rounded-3xl` (24px).
  - Botões, Chips e Tags: `rounded-xl` (12px).
  - Badges e Avatares: `rounded-full` (9999px).
- **Alvos de Toque (Touch Targets):**
  - Todo elemento interativo em telas móveis possui área de toque mínima de **44px x 44px** (WCAG 2.2 SC 2.5.8), expandindo o padding de botões compactos.

## 7. Components
- **`ActivityCard`:** Card de compromisso familiar contendo badge de participante(s) com cor individual, horário nítido em destaque, local e responsável identificado.
- **`BottomNavBar`:** Barra de navegação inferior com 5 abas ergonômicas (`Agenda`, `Meu Dia`, `+ Criar`, `Balanço`, `Família`).
- **`DateStrip` (Fita de Dias):** 7 chips horizontais compactos na semana móvel com número do dia, abreviação e bolinhas com as cores dos membros que possuem tarefas.
- **`DailyBriefingCard`:** Card solene do resumo diário, com contagem regressiva para a próxima missão, status do parceiro e atalho para disparo no WhatsApp.
- **`BalanceView`:** Gráfico comparativo proporcional de tarefas e dedicação semanal entre os adultos.

## 8. Do's and Don'ts
- **Faça:**
  - Exiba as cores individuais dos membros da família para identificação imediata sem precisar ler textos longos.
  - Destaque com clareza amigável quando um compromisso estiver sem responsável pela logística (`⚠️ Sem responsável`).
  - Garanta contraste mínimo de 4.5:1 para qualquer horário, local ou nome de responsável.
  - Mantenha ações frequentes acessíveis no terço inferior da tela do smartphone.
- **Não Faça:**
  - Não use cinzas fracos (`text-slate-400`) sobre fundos claros em dados importantes.
  - Não empilhe 7 colunas verticais longas de 500px cada no celular gerando páginas infinitas.
  - Não coloque inputs com menos de 16px no mobile para não forçar zoom no iOS Safari.
  - Não use jargões corporativos ("tasks", "sprint", "deadline") — use linguagem acolhedora familiar ("missões", "rotina", "quem leva/busca").
