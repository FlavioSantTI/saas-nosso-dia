import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Interface dos Metadados exportados por etapa
 */
export interface TutorialStepMetadata {
  step: number;
  id: string;
  title: string;
  description: string;
  focusedSelector: string;
  imagePath: string;
  timestamp: string;
}

const OUTPUT_DIR = path.resolve('./tutorial-output');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

/**
 * Helper para aplicar destaque visual dinâmico via CSS,
 * aguardar estabilização, capturar screenshot sequencial e registrar metadados.
 */
async function captureStep(
  page: Page,
  stepNumber: number,
  id: string,
  title: string,
  description: string,
  selector: string,
  metadataList: TutorialStepMetadata[]
): Promise<void> {
  const paddedNum = String(stepNumber).padStart(2, '0');
  const filename = `${paddedNum}_${id}.png`;
  const fullPath = path.join(SCREENSHOTS_DIR, filename);
  const relativePath = `screenshots/${filename}`;

  // Aguarda estabilização da rede e renderização
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch {}
  await page.waitForTimeout(600);

  // Aplica destaque CSS dinâmico no elemento focado
  let appliedSelector = selector;
  if (selector && selector !== 'body') {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2500 })) {
        await element.scrollIntoViewIfNeeded();
        await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el) {
            el.setAttribute('data-tutorial-highlight', 'true');
            el.style.outline = '3.5px solid #0284C7';
            el.style.outlineOffset = '3px';
            el.style.boxShadow = '0 0 22px rgba(2, 132, 199, 0.45)';
            el.style.borderRadius = '12px';
            el.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
          }
        }, selector);
      }
    } catch {
      appliedSelector = 'body';
    }
  }

  // Pausa para estabilização visual da animação e gravação no vídeo
  await page.waitForTimeout(500);

  // Captura o screenshot da tela mobile
  await page.screenshot({
    path: fullPath,
    fullPage: false,
    animations: 'disabled'
  });

  // Limpa o destaque antes de avançar para a próxima etapa
  if (selector && selector !== 'body') {
    try {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          el.removeAttribute('data-tutorial-highlight');
          el.style.outline = '';
          el.style.outlineOffset = '';
          el.style.boxShadow = '';
          el.style.borderRadius = '';
        }
      }, selector);
    } catch {}
  }

  // Registra metadados
  const stepMeta: TutorialStepMetadata = {
    step: stepNumber,
    id,
    title,
    description,
    focusedSelector: appliedSelector,
    imagePath: relativePath,
    timestamp: new Date().toISOString()
  };

  metadataList.push(stepMeta);
  console.log(`[PASS ${paddedNum}] ${title} -> ${filename}`);
}

/**
 * Configura interceptações de rotas do Supabase para garantir
 * execução 100% autônoma, determinística e rica em dados visuais.
 */
async function setupMockSession(page: Page) {
  const familyId = 'fam-santiago-2026';
  const userId = 'usr-flavio-santiago';

  const mockFamily = {
    id: familyId,
    name: 'Família Santiago',
    created_at: new Date().toISOString()
  };

  const mockMembers = [
    {
      id: 'mem-flavio',
      family_id: familyId,
      user_id: userId,
      name: 'Flávio',
      nickname: 'Flávio',
      role: 'ADMIN',
      color: '#0284C7',
      avatar: 'user',
      created_at: new Date().toISOString()
    },
    {
      id: 'mem-silvia',
      family_id: familyId,
      user_id: 'usr-silvia',
      name: 'Silvia',
      nickname: 'Silvia',
      role: 'ADMIN',
      color: '#EA580C',
      avatar: 'heart',
      created_at: new Date().toISOString()
    },
    {
      id: 'mem-rafael',
      family_id: familyId,
      user_id: null,
      name: 'Rafael',
      nickname: 'Rafa',
      role: 'CHILD',
      color: '#059669',
      avatar: 'futbol',
      created_at: new Date().toISOString()
    },
    {
      id: 'mem-sofia',
      family_id: familyId,
      user_id: null,
      name: 'Sofia',
      nickname: 'Sofi',
      role: 'CHILD',
      color: '#9333EA',
      avatar: 'star',
      created_at: new Date().toISOString()
    }
  ];

  const today = new Date().toISOString().split('T')[0];

  const mockEvents = [
    {
      id: 'evt-1',
      family_id: familyId,
      title: '🏐 Treino de Voleibol - Sofia',
      date: today,
      start_time: `${today}T16:00:00`,
      end_time: `${today}T17:30:00`,
      location_name: 'Clube dos Pioneiros',
      responsible_id: 'mem-flavio',
      responsible: mockMembers[0],
      participant_id: 'mem-sofia',
      participant: mockMembers[3],
      participants: [mockMembers[3]],
      is_all_day: false,
      status: 'SCHEDULED'
    },
    {
      id: 'evt-2',
      family_id: familyId,
      title: '🏊 Natação & Condicionamento',
      date: today,
      start_time: `${today}T18:00:00`,
      end_time: `${today}T19:00:00`,
      location_name: 'Academia AquaFit',
      responsible_id: 'mem-silvia',
      responsible: mockMembers[1],
      participant_id: 'mem-rafael',
      participant: mockMembers[2],
      participants: [mockMembers[2]],
      is_all_day: false,
      status: 'SCHEDULED'
    }
  ];

  // Intercepta Auth Token do Supabase
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-jwt-token-tutorial-audit',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'flavio@nossodia.com.br',
          app_metadata: { provider: 'email' },
          user_metadata: { name: 'Flávio Santiago' },
          created_at: new Date().toISOString()
        }
      })
    });
  });

  // Intercepta REST APIs do Supabase
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/family_members')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMembers)
      });
      return;
    }

    if (url.includes('/families')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockFamily])
      });
      return;
    }

    if (url.includes('/events')) {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON() || {};
        const created = {
          id: 'evt-created-' + Date.now(),
          ...postData,
          created_at: new Date().toISOString()
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([created])
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEvents)
      });
      return;
    }

    if (url.includes('/routines')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
      return;
    }

    if (url.includes('/subscriptions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sub-123',
            family_id: familyId,
            status: 'ACTIVE',
            plan: { name: 'Família Pro IA' }
          }
        ])
      });
      return;
    }

    if (url.includes('/locations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'loc-1', name: 'Clube dos Pioneiros', family_id: familyId }
        ])
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Nosso Dia — Auditoria e Extração do Fluxo PWA', () => {
  const stepsMetadata: TutorialStepMetadata[] = [];

  test.afterAll(async () => {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(stepsMetadata, null, 2), 'utf-8');
    console.log(`\n✨ Auditoria visual concluída com ${stepsMetadata.length} passos registrados em ${METADATA_FILE}`);
  });

  test('Executa o fluxo essencial e captura evidências visuais', async ({ page }) => {
    let currentStep = 1;

    // Configura interceptação de rotas para garantir dados consistentes
    await setupMockSession(page);

    // -------------------------------------------------------------------------
    // ETAPA 1: Acesso Inicial & Landing Page Pública
    // -------------------------------------------------------------------------
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Destaque no botão de acesso / Hero na Landing Page
    const heroCta = page.locator('button:has-text("Experimente grátis por 14 dias"), button:has-text("Experimente grátis")').first();
    const isLanding = await heroCta.isVisible({ timeout: 4000 }).catch(() => false);

    if (isLanding) {
      await captureStep(
        page,
        currentStep++,
        'landing_page',
        'Página Inicial & Apresentação da Plataforma',
        'Visão geral pública do Nosso Dia no formato PWA Mobile (390x844), destacando a proposta de valor e botões de adesão.',
        'button:has-text("Experimente grátis por 14 dias"), button:has-text("Experimente grátis")',
        stepsMetadata
      );

      // Abre o menu hambúrguer para acessar o login
      const menuButton = page.locator('button[aria-label="Abrir menu de navegação"]').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(400);

        const loginMenuBtn = page.locator('button:has-text("Já sou cadastrado")').first();
        if (await loginMenuBtn.isVisible()) {
          await loginMenuBtn.click();
          await page.waitForTimeout(600);
        }
      } else {
        await heroCta.click();
        await page.waitForTimeout(600);
      }

      // -------------------------------------------------------------------------
      // ETAPA 2: Modal de Autenticação / Login
      // -------------------------------------------------------------------------
      // Se abriu em aba de cadastro, alterna para login
      const loginTab = page.locator('button:has-text("Entrar")').first();
      if (await loginTab.isVisible()) {
        await loginTab.click();
        await page.waitForTimeout(300);
      }

      await captureStep(
        page,
        currentStep++,
        'login_modal',
        'Tela de Acesso da Família (Login)',
        'Formulário simplificado de autenticação com campos de e-mail e senha para os membros adultos da família.',
        '#auth-email',
        stepsMetadata
      );

      // Preenche credenciais
      const emailInput = page.locator('#auth-email');
      const passInput = page.locator('#auth-password');
      if (await emailInput.isVisible()) {
        await emailInput.fill('flavio@nossodia.com.br');
        await passInput.fill('Familia2026!');
        await page.waitForTimeout(300);

        // Submete formulário de login
        await page.locator('button[type="submit"]:has-text("Entrar")').click();
        await page.waitForTimeout(1500);
      }
    } else {
      await captureStep(
        page,
        currentStep++,
        'home_screen',
        'Tela Principal do Aplicativo',
        'Visualização inicial do ambiente de planejamento familiar Nosso Dia.',
        'header',
        stepsMetadata
      );
    }

    // -------------------------------------------------------------------------
    // ETAPA 3: Dashboard & Visão Geral da Família (Agenda Semanal)
    // -------------------------------------------------------------------------
    await page.waitForTimeout(1000);
    await captureStep(
      page,
      currentStep++,
      'dashboard_agenda',
      'Dashboard & Grade de Coordenação Semanal',
      'Visão consolidada da semana com cartões de atividades, contadores de compromissos e navegação temporal rápida.',
      'main',
      stepsMetadata
    );

    // -------------------------------------------------------------------------
    // ETAPA 4: Briefing Familiar Diário ("Meu Dia")
    // -------------------------------------------------------------------------
    const meuDiaTab = page.locator('button:has-text("Meu Dia")').first();
    if (await meuDiaTab.isVisible({ timeout: 3000 })) {
      await meuDiaTab.click();
      await page.waitForTimeout(700);

      await captureStep(
        page,
        currentStep++,
        'meu_dia_resumo',
        'Briefing Familiar & Operação Diária ("Meu Dia")',
        'Painel diário focado no que fazer hoje, com contagem regressiva para a próxima saída e divisão clara entre os cônjuges.',
        'button:has-text("Meu Dia")',
        stepsMetadata
      );

      // Retorna para a aba Agenda
      const agendaTab = page.locator('button:has-text("Agenda")').first();
      if (await agendaTab.isVisible()) {
        await agendaTab.click();
        await page.waitForTimeout(500);
      }
    }

    // -------------------------------------------------------------------------
    // ETAPA 5: Cadastro de Novo Compromisso Compartilhado
    // -------------------------------------------------------------------------
    const plusButton = page.locator('button[aria-label="Adicionar Atividade"], button:has-text("+ Nova")').first();
    if (await plusButton.isVisible({ timeout: 3000 })) {
      await plusButton.click();
      await page.waitForTimeout(500);

      // Menu flutuante de criação
      const manualOption = page.locator('button:has-text("Atividade Manual")').first();
      if (await manualOption.isVisible({ timeout: 2000 })) {
        await captureStep(
          page,
          currentStep++,
          'menu_adicionar',
          'Menu de Ações Rápidas (IA ou Manual)',
          'Opções dinâmicas para adicionar rotinas: captura inteligente com IA multimodal ou formulário detalhado.',
          'button:has-text("Atividade Manual")',
          stepsMetadata
        );

        await manualOption.click();
        await page.waitForTimeout(800);
      }

      // Modal de Atividade Manual
      const titleInput = page.locator('#manual-activity-title').first();
      if (await titleInput.isVisible({ timeout: 4000 })) {
        await titleInput.fill('🏐 Treino de Voleibol - Sofia');
        await page.waitForTimeout(200);

        await captureStep(
          page,
          currentStep++,
          'modal_cadastro_atividade',
          'Cadastro de Compromisso Compartilhado',
          'Definição completa da atividade: título, horário, local, participante e adulto responsável pela logística.',
          '#manual-activity-title',
          stepsMetadata
        );

        // Fecha o modal
        const closeBtn = page.locator('button:has-text("✕")').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // -------------------------------------------------------------------------
    // ETAPA 6: Visualização de Eventos Filtrados por Responsável
    // -------------------------------------------------------------------------
    // Localiza e clica no filtro do primeiro membro (ex.: Flávio ou Silvia)
    const memberFilterPill = page.locator('button:has-text("Flávio"), button:has-text("Silvia")').first();
    if (await memberFilterPill.isVisible({ timeout: 3000 })) {
      await memberFilterPill.click();
      await page.waitForTimeout(600);

      await captureStep(
        page,
        currentStep++,
        'filtro_responsavel',
        'Filtro de Atividades por Membro da Família',
        'Filtragem com 1 clique da grade semanal pelo avatar e cor do responsável, isolando sua carga de compromissos.',
        'button:has-text("Flávio"), button:has-text("Silvia")',
        stepsMetadata
      );
    }
  });
});
