# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Usuários Primários:** Pais, mães e casais com filhos em idade escolar e atividades extracurriculares distribuídas (escola, natação, inglês, terapia, reforço).
- **Situação de Uso:** Sobrecarga mental diária na gestão de quem leva, quem busca e quais compromissos acontecem no dia; necessidade de dividir a logística familiar com transparência entre os cônjuges.
- **Job to be Done (JTBD):** "Quando planejo e vivo a semana da minha casa, quero ter certeza de que todos os compromissos dos meus filhos e da família estão visíveis, com responsáveis claros pela logística, para que ninguém se sobrecarregue, nada seja esquecido e a rotina flua com tranquilidade."
- **Usuários Secundários (Dependentes):** Crianças e adolescentes, cujos perfis são gerenciados pelos pais (com cores e apelidos identificadores, sem necessidade de login próprio no MVP).

## Product Purpose

O **Nosso Dia** é uma central inteligente de coordenação e harmonia da rotina familiar.
Não é um calendário corporativo frio nem um gerenciador de tarefas genérico. Ele existe para responder instantaneamente e sem esforço:
> *"O que nossa família precisa realizar esta semana/hoje, com quem, onde e quem é o adulto responsável por viabilizar?"*

O sucesso do produto é medido pela redução da carga mental dos pais, pela eliminação de conflitos de horário entre o casal e pela facilidade de transformar avisos soltos (mensagens de WhatsApp, fotos de agenda escolar, áudios) em eventos organizados.

## Positioning

Diferente do Google Calendar e Outlook (otimizados para reuniões de trabalho individuais) ou de Trello/Todoist (listas abstratas de tarefas sem logística de transporte/responsável), o Nosso Dia posiciona-se como:
- **Focado na Logística Familiar:** Cada atividade responde a "Quem participa?", "Onde acontece?" e "Quem é o adulto responsável por levar/buscar?".
- **Captura Multimodal com IA:** Converte fotos de comunicados da escola, áudios e mensagens de texto desestruturadas diretamente em atividades agendadas.
- **Briefing Matinal & Resumo WhatsApp:** Entrega o dia mastigado ao acordar com um toque para disparar a programação formatada para a família no WhatsApp.
- **Equilíbrio Conjugal Visível:** Mostra de forma construtiva a divisão de tarefas entre os adultos da casa, prevenindo a sobrecarga invisível de um dos cônjuges.

## Operating Context

- **Ambiente de Uso Principal:** Smartphone em movimento (segurando com uma mão pela manhã, na saída do colégio ou no trânsito), exigindo ergonomia rigorosa com Bottom Navigation Bar na zona do polegar (*Thumb Zone*).
- **Rituais Familiares:**
  - *Ritual Matinal:* Conferir o "Meu Dia", checar horários e disparar o roteiro no grupo de WhatsApp da família.
  - *Ritual de Recebimento de Aviso:* Tirar foto do bilhete escolar ou colar áudio/texto no modal de Captura IA para agendar em segundos.
  - *Ritual de Domingo/Segunda:* Abrir o "Balanço da Semana" para revisar a escala de quem leva e busca e atribuir atividades pendentes.
- **Ecossistema Técnico:** Web App responsivo operando como PWA (Progressive Web App) instalável na tela de início, com notificações e modo offline básico.

## Capabilities and Constraints

- **Capacidades Confirmadas:**
  - Gestão de multi-tenancy familiar (`families` e `family_members` no Supabase com Row Level Security estrito).
  - Rotinas recorrentes semanais automáticas e eventos avulsos pontuais.
  - Grade da agenda com três visualizações: Dia, Semana (com fita horizontal de dias no mobile e grade de 7 colunas no desktop) e Mês.
  - Aba matinal "Meu Dia" dedicada com contagem regressiva para a próxima missão e status de compromissos do cônjuge.
  - Botão de criação rápida central (FAB) unificando Captura com IA e Adição Manual.
  - Dashboard de "Balanço Semanal" calculando tempo investido por adulto, porcentagem de tarefas assumidas e atividades sem responsável.
  - Exportação e disparo de roteiro formatado diretamente para WhatsApp.
  - Alerta de conflito de horários para o mesmo responsável no mesmo horário.
- **Restrições & O que NÃO faz parte do escopo atual:**
  - Não sincroniza bidirecionalmente com Google Calendar ou Outlook no momento.
  - Não faz controle financeiro detalhado de mesadas ou compras de supermercado.
  - Timezone padrão da aplicação: `America/Araguaina` (ou local do dispositivo).

## Brand Commitments

- **Nome Oficial:** Nosso Dia
- **Assinatura:** A Central Inteligente da Rotina Familiar
- **Estética & Tom:** *Modern Craft*, acolhedor, humano, descomplicado e seguro. Distante de qualquer rigidez corporativa ou cinza burocrático.
- **Paleta de Identidade:**
  - Azul Oceano Primário (`#0284C7`) — Confiança, serenidade e clareza.
  - Verde Sálvia (`#059669`) — Harmonia, saúde e confirmações.
  - Âmbar Solar (`#D97706` / `#F59E0B`) — Calor matinal, destaques e alertas amigáveis.
  - Terracota Suave (`#EA580C`) — Aconchego e energia.
  - Fundo Base: Off-White suave (`#F4F8FA`).
- **Tipografia:** `Plus Jakarta Sans` com pesos equilibrados e legibilidade mobile refinada.

## Evidence on Hand

- **Customer Zero:** Em uso diário contínuo e validação prática pela Família Vilar Santiago (Palmas/TO).
- **Código em Produção Local:** `apps/web` rodando com Vite 5, React 18, Supabase Auth/Postgres, integração com Google Gemini e gateway de pagamentos Asaas configurado.
- **Documentação Base:**
  - [`docs/PRD.md`](file:///c:/Users/flavi/OneDrive/Desktop/2026/app/saas-nosso-dia/docs/PRD.md) — Documento original de requisitos de produto.
  - [`docs/ARCHITECTURE.md`](file:///c:/Users/flavi/OneDrive/Desktop/2026/app/saas-nosso-dia/docs/ARCHITECTURE.md) — Decisões de stack e arquitetura de dados.
  - [`docs/UI-UX-AUDIT.md`](file:///c:/Users/flavi/OneDrive/Desktop/2026/app/saas-nosso-dia/docs/UI-UX-AUDIT.md) — Auditoria técnica de usabilidade, mobile-first e acessibilidade.

## Product Principles

1. **Paz Mental Acima de Tudo:** A tecnologia deve acalmar a rotina, nunca sobrecarregar com excesso de telas, micro-gerenciamento ou alertas desnecessários.
2. **Ergonomia do Polegar (Mobile First):** Se não puder ser operado confortavelmente com uma mão enquanto segura a mochila de uma criança, o design falhou.
3. **Visibilidade Sem Cobrança:** A divisão de tarefas é apresentada com equilíbrio e transparência construtiva, incentivando a parceria do casal em vez de cobrança punitiva.
4. **Sem Perda de Tempo na Entrada de Dados:** Cadastrar um compromisso deve levar menos de 10 segundos via IA ou formulário simplificado.

## Accessibility & Inclusion

- **Diretriz WCAG 2.2 AA:**
  - Alvos de toque com dimensão mínima de 44x44px em todos os botões e seletores mobile.
  - Tamanho de fonte base em inputs de no mínimo 16px (`text-base` / `1rem`) para eliminar zoom automático no iOS Safari.
  - Contraste de cores mínimo de 4.5:1 para todos os textos essenciais sobre fundos claros.
  - Associação explícita entre rótulos (`htmlFor`) e campos de formulário (`id`).
