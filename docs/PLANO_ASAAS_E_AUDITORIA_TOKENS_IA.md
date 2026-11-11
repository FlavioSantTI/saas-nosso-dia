# 📊 Plano Arquitetural e Operacional: Integração Asaas & Auditoria de Tokens/Custos de IA

**Projeto:** Nosso Dia (v3.0.0)  
**Data:** 08/11/2026  
**Status:** Planejamento Técnico e Comercial (Aguardando Revisão)

---

## 1. Contexto e Catálogo Comercial Vigente (v3.0.0)

Com o lançamento do **Mural da Família & Escola** e da **Importação em Lote de Documentos (PDF, Word e Fotos) via IA**, o catálogo comercial foi reprecificado para refletir o alto valor entregue às famílias e cobrir com folga o aumento no consumo de tokens de entrada/saída:

| Plano | Preço | Créditos IA / mês | Modalidades Permitidas | Regra do Mural & Anexos |
| :--- | :--- | :--- | :--- | :--- |
| **🎁 Degustação (Trial)** | **Grátis** (14 dias) | **15 créditos** | `TEXT`, `PDF` *(1x teste)* | Manual + **1 Importação IA de Degustação** (20 MB) |
| **🏡 Família Essencial** | **R$ 59,90 / mês** | **60 créditos** | `TEXT`, `AUDIO` | Manual + 2 importações IA/mês (100 MB) |
| **🚀 Família Pro IA** | **R$ 89,90 / mês** | **160 créditos** | `TEXT`, `AUDIO`, `IMAGE`, `PDF` | **Ilimitado manual + Importações IA** (500 MB) |
| **👑 Família Pro IA Anual** | **R$ 879,90 / ano** *(~R$ 73,32/mês)* | **320 créditos / mês** *(3.840/ano)* | `TEXT`, `AUDIO`, `IMAGE`, `PDF` | **Ilimitado manual + Importações IA** (1 GB) |

### Pesos de Consumo de Créditos (`public.platform_settings`)
- **Texto simples (`ai_cost_text`):** `1 crédito` (~600 tokens | < R$ 0,001)
- **Áudio / Mensagem de Voz (`ai_cost_audio`):** `2 créditos` (~1.500 tokens | ~R$ 0,003)
- **Foto de Bilhete (`ai_cost_image`):** `3 créditos` (~3.000 tokens | ~R$ 0,008)
- **Documento / PDF de Provas em Lote (`ai_cost_pdf`):** `5 créditos` (~8.000 a 18.000 tokens | ~R$ 0,02 a R$ 0,04)

---

## 2. Diagnóstico do Estado Atual no Código

### 2.1. Integração Asaas (`apps/web/src/lib/asaas.ts`)
- **Já implementado:**
  - Funções `createAsaasCustomer`, `createSubscription` e `parseWebhookEvent` em `apps/web/src/lib/asaas.ts`.
  - Interface de seleção de plano e método de pagamento (`PIX` ou `CREDIT_CARD`) em `apps/web/src/components/FamilyManageModal.tsx`.
  - Tabelas `public.plans` e `public.subscriptions` no Supabase.
- **O que falta para produção real:**
  1. **Proteção da API Key e CORS:** A API do Asaas (`https://api.asaas.com/v3`) bloqueia chamadas diretas vindas do navegador (CORS) e a chave `$aact_...` nunca deve ficar exposta em variáveis `VITE_*` no cliente. A chamada precisa passar por uma **Supabase Edge Function** (ou webhook backend/n8n) lendo a chave criptografada em `platform_settings`.
  2. **Coleta de CPF/CNPJ:** O Asaas exige CPF/CNPJ válido no cadastro do cliente para emitir cobranças Pix ou Cartão.
  3. **Receptor de Webhook Automático:** Um endpoint público (`asaas-webhook`) para receber os eventos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE` e `SUBSCRIPTION_CANCELED`, atualizando o status da família no banco de dados e renovando a franquia mensal de créditos de IA.

### 2.2. Medição de Tokens e Auditoria de Custos (`apps/web/src/lib/gemini.ts`)
- **Já implementado:**
  - Criptografia AES-256 da chave do Gemini no banco (`get_active_ai_key`).
  - Coluna `ai_credits_used` em `public.subscriptions`.
  - Aba de configuração de custos no Super-Admin (`apps/web/src/components/admin/AdminDashboard.tsx`).
- **O que falta para medição e auditoria real:**
  1. **Captura do `usageMetadata` da API do Gemini:** O retorno JSON do Google Gemini inclui nativamente o objeto `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`), que hoje é ignorado.
  2. **Tabela de Auditoria (`public.ai_usage_logs`) e Debitação Automática:** Registrar cada chamada individualmente (qual família, qual membro, qual funcionalidade, quantos tokens reais de entrada/saída, qual modelo respondeu e quantos créditos foram descontados) e incrementar `subscriptions.ai_credits_used`.

---

## 3. Frente 1 — Plano de Medição de Tokens por Conta e Auditoria Geral

### Etapa 1.1 — Banco de Dados (`public.ai_usage_logs` + RPCs)
Criar migração SQL contendo:

```sql
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    feature TEXT NOT NULL CHECK (feature IN ('AGENDA_QUICK_ADD', 'BOARD_IMPORT')),
    modality TEXT NOT NULL CHECK (modality IN ('TEXT', 'AUDIO', 'IMAGE', 'PDF', 'DOCX')),
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    credits_charged INTEGER NOT NULL DEFAULT 1,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    items_generated INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'ERROR', 'BLOCKED_QUOTA')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_family_date ON public.ai_usage_logs (family_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);
```

- **RPC `public.verify_ai_quota_before_call(p_family_id UUID, p_feature TEXT, p_modality TEXT)`:**
  - Verifica se a assinatura está ativa ou em período de Trial válido.
  - Verifica se a família possui créditos suficientes (`ai_credits_used + custo <= monthly_ai_credits`).
  - Aplica a regra especial do **Trial**: permite **1 importação de PDF/Foto no Mural** durante a degustação; na segunda tentativa, retorna mensagem amigável convidando para o upgrade ao **Família Pro IA**.
- **RPC `public.record_ai_usage(...)`:**
  - Insere o registro completo em `public.ai_usage_logs` e soma `credits_charged` em `public.subscriptions.ai_credits_used`.

### Etapa 1.2 — Instrumentação em `apps/web/src/lib/gemini.ts`
- Nas funções `extractRoutineWithGemini` e `extractBoardItemsWithGemini`:
  1. Antes de chamar a API do Google, validar a cota via `verify_ai_quota_before_call`.
  2. Ler `result.usageMetadata.promptTokenCount`, `result.usageMetadata.candidatesTokenCount` e `result.usageMetadata.totalTokenCount`.
  3. Calcular o custo estimado em USD do modelo Gemini Flash:
     - Entrada: `(promptTokens / 1_000_000) * 0.15`
     - Saída: `(completionTokens / 1_000_000) * 0.60`
  4. Gravar via `record_ai_usage`.

### Etapa 1.3 — Transparência para a Família (UI do Usuário)
- Exibir nos modais `QuickAddWithAI.tsx`, `BoardImportModal.tsx` e `FamilyManageModal.tsx`:
  - Barra/Pílula de saldo mensal: **`⚡ 145 de 160 créditos disponíveis neste mês`**.
  - Na Degustação: **`🎁 Você tem 1 importação gratuita de PDF de Provas disponível para testar!`**.

### Etapa 1.4 — Painel de Auditoria Geral no Super-Admin (`/admin`)
Expandir a aba **IA & Custos** do `AdminDashboard.tsx` com 3 blocos:
1. **KPIs Globais do Mês:**
   - **Total de Tokens Processados:** Soma de `prompt_tokens` + `completion_tokens` de toda a plataforma.
   - **Custo Real Google Cloud (USD e R$):** Soma de `estimated_cost_usd` convertida para BRL e comparada ao MRR para exibir a **Margem Bruta após IA (%)**.
   - **Divisão Agenda vs. Mural:** Proporção de tokens gastos com Agenda Rápida vs. Importação de Roteiros de Provas.
2. **Auditoria por Conta / Família (Tabela Analítica):**
   - Lista todas as famílias ordenadas por consumo de tokens/créditos:
     - `Família` | `Plano` | `Créditos (Usados/Limite)` | `Qtd. PDFs Mural` | `Tokens Reais (In / Out)` | `Custo Real (R$)`.
3. **Extrato em Tempo Real (`ai_usage_logs`):**
   - Últimas 100 execuções da IA com filtro por família, modalidade (`PDF`, `IMAGE`, `AUDIO`, `TEXT`) e status.

---

## 4. Frente 2 — Plano de Integração Real com Cobrança via Asaas

### Etapa 2.1 — Cofre de Credenciais Asaas no `/admin`
- Utilizar o cofre criptografado `platform_settings` (`pgp_sym_encrypt` AES-256) para guardar:
  - `asaas_api_key`: Chave de produção (`$aact_...`) ou sandbox.
  - `asaas_environment`: `'sandbox'` ou `'production'`.
  - `asaas_webhook_secret`: Token de verificação do cabeçalho `asaas-access-token`.

### Etapa 2.2 — Backend de Checkout e Webhook (Supabase Edge Functions)
1. **Edge Function `asaas-checkout`:**
   - Recebe do frontend: `{ family_id, plan_slug, billing_type: 'PIX' | 'CREDIT_CARD', cpf_cnpj, holder_name }`.
   - Descriptografa a chave do Asaas em memória.
   - Cria ou recupera o cliente no Asaas (`POST /v3/customers`) com `cpfCnpj`.
   - Cria a assinatura (`POST /v3/subscriptions`) com o valor oficial da tabela `public.plans` (`R$ 59,90`, `R$ 89,90` ou `R$ 879,90`).
   - Busca a primeira cobrança gerada (`GET /v3/subscriptions/{id}/payments`) e, se for Pix, obtém o QR Code (`GET /v3/payments/{id}/pixQrCode`).
   - Salva `asaas_customer_id` e `asaas_subscription_id` na tabela `public.subscriptions`.
   - Retorna para o modal da família: `{ invoiceUrl, pixPayload, pixEncodedImage, status }`.

2. **Edge Function `asaas-webhook`:**
   - URL configurada no painel do Asaas (*Configurações > Integrações > Webhooks*).
   - Valida o header `asaas-access-token`.
   - Eventos tratados:
     - `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`: Atualiza `subscriptions.status = 'ACTIVE'`, avança `current_period_end` (+1 mês ou +1 ano) e **reseta `ai_credits_used = 0`** para iniciar o novo ciclo mensal.
     - `PAYMENT_OVERDUE`: Atualiza `subscriptions.status = 'PAST_DUE'`.
     - `SUBSCRIPTION_CANCELED` / `SUBSCRIPTION_INACTIVATED`: Atualiza `subscriptions.status = 'CANCELED'`.

### Etapa 2.3 — Fluxo de Pagamento no Modal da Família (`FamilyManageModal.tsx`)
- Adicionar campo de **CPF/CNPJ** (com máscara automática `000.000.000-00`).
- Ao clicar em **Assinar com Pix**: exibir o **QR Code Pix escaneável na própria tela** + botão **"Copiar Código Pix (Copia e Cola)"**.
- Ao clicar em **Assinar com Cartão**: abrir o checkout seguro do Asaas (`invoiceUrl`) ou processar confirmação.

---

## 5. Ordem Sugerida para Execução Futura

1. **Fase 1 (Imediata — Controle de Custos):** Implementar a **Frente 1** (Tabela `ai_usage_logs`, captura de `usageMetadata` no `gemini.ts`, trava de cota por plano com 1 importação grátis no Trial e painel de Auditoria de Tokens no `/admin`).
2. **Fase 2 (Monetização Automatizada):** Implementar a **Frente 2** (Cofre Asaas no `/admin`, Edge Functions `asaas-checkout` e `asaas-webhook`, e tela de QR Code Pix + CPF no `FamilyManageModal.tsx`).

