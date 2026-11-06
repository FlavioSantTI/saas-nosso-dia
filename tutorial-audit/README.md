# 📱 Nosso Dia — Auditoria Visual & Gerador de Tutoriais (Playwright)

Suíte automatizada em **TypeScript / Node.js** projetada para auditar os fluxos essenciais da aplicação **Nosso Dia (PWA)**, capturando screenshots com destaque visual nos elementos focado (CSS outline), gravando vídeo nativo da navegação em viewport mobile (`390x844`), e compilando os artefatos em:
1. `metadata.json`: Dados estruturados de cada etapa (título, descrição, seletor focado e caminhos das imagens).
2. `tutorial.html`: Página interativa moderna estilizada com Tailwind CSS contendo cards passo a passo e player do vídeo gravado.
3. `tutorial.pdf`: Documento PDF em alta resolução (formato A4) renderizado via Playwright Headless, pronto para impressão e distribuição.

---

## 🛠️ Pré-requisitos & Instalação

Dentro da pasta `tutorial-audit`:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Instalar os binários dos navegadores do Playwright (Chromium é o principal)
npx playwright install chromium
```

---

## 🚀 Execução dos Scripts

### 1. Executar a Auditoria Completa (Captura de Telas + Compilação HTML/PDF)
```bash
npm run audit:all
```

### 2. Executar Apenas os Testes & Captura de Telas
```bash
# Modo Headless
npm run test

# Modo Visual (Interface gráfica com navegador aberto)
npm run test:headed
```

### 3. Compilar Apenas os Documentos (HTML e PDF a partir de capturas já existentes)
```bash
npm run build:docs
```

---

## ⚙️ Variáveis de Ambiente Suportadas

Você pode direcionar a auditoria para instâncias locais ou de produção:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `APP_URL` | `http://localhost:5173` | URL base da aplicação (local ou `https://nossodia.flaviosantiago.com.br`) |
| `TEST_USER_EMAIL` | `familia@exemplo.com` | E-mail do membro adulto para login automático |
| `TEST_USER_PASSWORD` | `Familia2026!` | Senha de acesso do membro adulto |

Exemplo de execução apontando para homologação/produção:
```bash
APP_URL=https://nossodia.flaviosantiago.com.br npm run audit:all
```

---

## 📂 Estrutura de Artefatos Gerados

```
tutorial-audit/
├── playwright.config.ts        # Configuração do Viewport Mobile (390x844) e Vídeo
├── package.json
├── tsconfig.json
├── tests/
│   └── flow.spec.ts            # Roteiro de navegação e injeção de destaque CSS
├── scripts/
│   └── build-docs.ts           # Compilador de tutorial.html e tutorial.pdf
└── tutorial-output/            # 📁 Pasta onde os artefatos são salvos
    ├── metadata.json           # Dicionário de etapas e seletores
    ├── screenshots/            # Capturas de tela sequenciais com destaque
    │   ├── 01_landing_page.png
    │   ├── 02_login_modal.png
    │   ├── 03_dashboard_agenda.png
    │   ├── 04_meu_dia_resumo.png
    │   ├── 05_menu_adicionar.png
    │   ├── 06_modal_cadastro_atividade.png
    │   └── 07_filtro_responsavel.png
    ├── videos/                 # Gravação contínua em vídeo .webm
    ├── tutorial.html           # Tutorial web responsivo (Tailwind CSS)
    └── tutorial.pdf            # PDF formatado para A4
```
