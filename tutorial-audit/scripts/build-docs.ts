import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

interface StepMetadata {
  step: number;
  id: string;
  title: string;
  description: string;
  focusedSelector: string;
  imagePath: string;
  timestamp: string;
}

const TUTORIAL_DIR = path.resolve('./tutorial-output');
const METADATA_PATH = path.join(TUTORIAL_DIR, 'metadata.json');
const VIDEOS_DIR = path.join(TUTORIAL_DIR, 'videos');
const HTML_OUTPUT_PATH = path.join(TUTORIAL_DIR, 'tutorial.html');
const PDF_OUTPUT_PATH = path.join(TUTORIAL_DIR, 'tutorial.pdf');

async function buildDocs() {
  console.log('🚀 Iniciando compilação do Tutorial Visual Interativo...');

  // 1. Carrega o metadata.json
  if (!fs.existsSync(METADATA_PATH)) {
    console.error(`❌ Arquivo de metadados não encontrado em ${METADATA_PATH}. Execute 'npm test' primeiro.`);
    process.exit(1);
  }

  const rawMetadata = fs.readFileSync(METADATA_PATH, 'utf-8');
  const steps: StepMetadata[] = JSON.parse(rawMetadata);
  console.log(`📄 Carregados ${steps.length} passos do arquivo de metadados.`);

  // 2. Localiza o vídeo gravado mais recente (em tutorial-output/videos ou test-results)
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  let videoRelativePath = '';

  // Procura primeiro em test-results se houver gravação recente do Playwright
  const testResultsDir = path.resolve('./test-results');
  if (fs.existsSync(testResultsDir)) {
    const findVideos = (dir: string): string[] => {
      let results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(findVideos(full));
        } else if (entry.name.endsWith('.webm') || entry.name.endsWith('.mp4')) {
          results.push(full);
        }
      }
      return results;
    };

    const foundVideos = findVideos(testResultsDir);
    if (foundVideos.length > 0) {
      // Ordena por data decrescente
      foundVideos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      const targetPath = path.join(VIDEOS_DIR, 'sessao_completa.webm');
      fs.copyFileSync(foundVideos[0], targetPath);
      videoRelativePath = 'videos/sessao_completa.webm';
      console.log(`🎥 Vídeo copiado de test-results para: ${videoRelativePath}`);
    }
  }

  // Fallback para vídeos já existentes em VIDEOS_DIR
  if (!videoRelativePath && fs.existsSync(VIDEOS_DIR)) {
    const videoFiles = fs
      .readdirSync(VIDEOS_DIR)
      .filter((file) => file.endsWith('.webm') || file.endsWith('.mp4'))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(VIDEOS_DIR, file)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (videoFiles.length > 0) {
      videoRelativePath = `videos/${videoFiles[0].name}`;
      console.log(`🎥 Vídeo gravado localizado em: ${videoRelativePath}`);
    }
  }

  // 3. Converte imagens para Base64 para garantir que o HTML e PDF sejam 100% autocontidos
  const stepsWithBase64 = steps.map((step) => {
    const imageFullPath = path.join(TUTORIAL_DIR, step.imagePath);
    let base64Src = step.imagePath;

    if (fs.existsSync(imageFullPath)) {
      const buffer = fs.readFileSync(imageFullPath);
      base64Src = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return {
      ...step,
      base64Src,
    };
  });

  // 4. Monta o template HTML com Tailwind CSS
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tutorial Visual Interativo — Nosso Dia PWA</title>
  <!-- Google Fonts: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              900: '#0c4a6e',
            }
          }
        }
      }
    }
  </script>
  <style>
    @media print {
      body {
        background-color: #ffffff !important;
        color: #0f172a !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      .card-step {
        break-inside: avoid;
        box-shadow: none !important;
        border: 1px solid #e2e8f0 !important;
      }
    }
  </style>
</head>
<body class="bg-[#F8FAFC] text-slate-800 font-sans antialiased min-h-screen selection:bg-sky-100 selection:text-sky-900">

  <!-- CABEÇALHO DO GUIA -->
  <header class="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md font-extrabold text-lg">
          ND
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Nosso Dia — Guia Visual Interativo</h1>
            <span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">v2.3.1 PWA</span>
          </div>
          <p class="text-xs text-slate-500">Auditoria Automatizada de Fluxos e Experiência Mobile</p>
        </div>
      </div>
      <div class="no-print flex items-center gap-2">
        <button onclick="window.print()" class="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200">
          <span>🖨️ Imprimir / PDF</span>
        </button>
      </div>
    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL -->
  <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

    <!-- HERO / INTRODUÇÃO -->
    <section class="bg-gradient-to-br from-sky-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
      <div class="relative z-10 max-w-2xl space-y-3">
        <span class="text-xs font-bold uppercase tracking-widest text-sky-300">Auditoria de Jornada do Usuário</span>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Fluxo Essencial de Navegação Mobile</h2>
        <p class="text-sm text-sky-100 leading-relaxed">
          Este documento foi compilado automaticamente através da suíte Playwright em viewport padrão mobile (<strong>390 × 844 px</strong>).
          Cada etapa destaca o elemento interativo acionado e documenta as ações para onboarding e treinamento.
        </p>
        <div class="flex flex-wrap gap-4 pt-2 text-xs text-sky-200">
          <div>📱 <strong>Dispositivo:</strong> iPhone 13 (PWA)</div>
          <div>⏱️ <strong>Data de Extração:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
          <div>🎯 <strong>Passos Mapeados:</strong> ${steps.length} etapas</div>
        </div>
      </div>
    </section>

    ${
      videoRelativePath
        ? `
    <!-- REPRODUTOR DE VÍDEO COMPLETO -->
    <section class="no-print bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🎥</span> Gravação Nativa da Sessão Completa
          </h3>
          <p class="text-xs text-slate-500">Acompanhe a reprodução contínua da navegação capturada pelo Playwright.</p>
        </div>
      </div>
      <div class="flex justify-center bg-slate-950 rounded-2xl p-4 overflow-hidden shadow-inner">
        <video controls class="max-h-[500px] rounded-xl shadow-lg border border-slate-800" preload="metadata">
          <source src="${videoRelativePath}" type="video/webm">
          Seu navegador não suporta a reprodução deste vídeo.
        </video>
      </div>
    </section>
    `
        : ''
    }

    <!-- CARDS PASSO A PASSO -->
    <section class="space-y-8">
      <div class="border-b border-slate-200 pb-3">
        <h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <span>📋</span> Roteiro Passo a Passo Detalhado
        </h3>
        <p class="text-xs text-slate-500">Evidências visuais com realce dinâmico nos componentes da interface.</p>
      </div>

      <div class="space-y-8">
        ${stepsWithBase64
          .map(
            (step, idx) => `
        <article class="card-step bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-6 items-center ${idx > 0 && idx % 2 === 0 ? 'page-break' : ''}">
          <!-- Coluna 1: Informações e Metadados do Passo -->
          <div class="flex-1 space-y-3.5 order-2 md:order-1">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                ${step.step}
              </span>
              <span class="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-sky-100">
                ${step.id}
              </span>
            </div>

            <h4 class="text-lg font-bold text-slate-900 leading-snug">${step.title}</h4>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${step.description}</p>

            <!-- Seletor em Destaque -->
            <div class="pt-2">
              <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Elemento Focado (CSS):</span>
              <code class="inline-block text-[11px] font-mono font-medium text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg break-all">
                ${step.focusedSelector}
              </code>
            </div>

            <div class="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5">
              <span>🕒 Registrado em:</span>
              <span class="font-medium">${new Date(step.timestamp).toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>

          <!-- Coluna 2: Mockup Mobile com Screenshot -->
          <div class="w-full md:w-[280px] shrink-0 flex justify-center order-1 md:order-2">
            <div class="relative bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-800 max-w-[280px]">
              <!-- Notch / Barra de Status superior -->
              <div class="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                <div class="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800"></div>
              </div>

              <!-- Imagem da Tela -->
              <div class="rounded-[22px] overflow-hidden bg-white border border-slate-200 shadow-inner">
                <img
                  src="${step.base64Src}"
                  alt="Captura do passo ${step.step}: ${step.title}"
                  class="w-full h-auto object-cover block"
                  loading="lazy"
                />
              </div>

              <!-- Barra inferior Home Indicator -->
              <div class="w-20 h-1 bg-slate-600 rounded-full mx-auto mt-2"></div>
            </div>
          </div>
        </article>
        `
          )
          .join('\n')}
      </div>
    </section>

    <!-- RODAPÉ TÉCNICO -->
    <footer class="pt-8 border-t border-slate-200 text-center text-xs text-slate-600 space-y-1">
      <p><strong>Nosso Dia</strong> — Sistema de Coordenação da Rotina Familiar</p>
      <p>Gerado automaticamente por Playwright & Node.js • Arquitetura de Testes & Qualidade Contínua</p>
    </footer>

  </main>
</body>
</html>`;

  // 5. Salva o HTML gerado
  fs.writeFileSync(HTML_OUTPUT_PATH, htmlContent, 'utf-8');
  console.log(`✅ HTML compilado com sucesso: ${HTML_OUTPUT_PATH}`);

  // 6. Renderiza o PDF via Playwright Headless
  console.log('🖨️ Renderizando PDF via Playwright Headless...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Carrega o HTML local
  await page.goto(`file://${HTML_OUTPUT_PATH}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Gera o PDF formato A4
  await page.pdf({
    path: PDF_OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '12mm',
      right: '12mm',
    },
    displayHeaderFooter: false,
  });

  await browser.close();
  console.log(`🎉 PDF exportado com sucesso em: ${PDF_OUTPUT_PATH}`);
  console.log('\n✨ Todos os artefatos foram compilados com êxito!');
}

buildDocs().catch((err) => {
  console.error('❌ Erro durante a compilação dos documentos:', err);
  process.exit(1);
});
