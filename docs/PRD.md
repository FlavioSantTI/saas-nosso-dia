# NOSSO DIA — Product Requirements Document (PRD)
**Versão:** 1.0 (MVP)  
**Status:** Aprovado  
**Público-Alvo:** Famílias com filhos e rotinas distribuídas (Customer Zero: Família do Fundador em Palmas/TO)

## 1. Visão e Tese de Produto
O **Nosso Dia** é um sistema de coordenação da rotina familiar. Não é um calendário corporativo compartilhado nem uma simples lista de tarefas.
Seu propósito central é responder:
> *"O que nossa família precisa realizar esta semana, com quem, onde e quem é o adulto responsável por viabilizar?"*

## 2. Job to be Done (JTBD)
*"Quando planejo a semana da minha casa, quero ter certeza absoluta de que todos os compromissos e rotinas dos meus filhos e da família estão visíveis, com responsáveis claros, para que ninguém se sobrecarregue, nada seja esquecido e a rotina flua com tranquilidade."*

## 3. Escopo Funcional do MVP (v0.1)
1. **Gestão de Família & Membros:**
   - Criação da Família (Tenant com timezone padrão `America/Araguaina`).
   - Cadastro de Membros:
     - Dependentes/Crianças: perfil gerenciado com nome, data de nascimento e cor distintiva (sem login).
     - Adultos/Responsáveis: perfil associado à conta autenticada no Supabase Auth.
   - Convite para o segundo cônjuge/adulto via link/e-mail.
2. **Rotinas Semanais Recorrentes:**
   - Cadastro de atividades fixas (ex: Natação ter/qui às 18h, Inglês seg/qua às 15h, Escola seg a sex das 07h às 12h).
   - Definição de dias da semana, horário, duração, local, participante(s) e responsável pela logística.
3. **Compromissos Pontuais & Datas Especiais:**
   - Cadastro de eventos avulsos (consultas médicas, reuniões escolares, festas).
   - Cadastro de aniversários (eventos de dia inteiro).
4. **Visão Semanal Central (Core UI):**
   - Grade semanal navegável, responsiva, destacando cards por pessoa (cores).
   - Alerta visual proeminente para atividades que estão sem responsável atribuído.
5. **Detecção Básica de Conflitos:**
   - Alerta visual quando o mesmo responsável tiver compromissos com horários sobrepostos no mesmo dia.

## 4. O que está FORA do MVP
- Sincronização externa (Google Calendar / Outlook).
- Geolocalização e cálculo dinâmico de trânsito.
- Controle financeiro, compras e tarefas domésticas.
- Assinaturas e cobranças automáticas.
