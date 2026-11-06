import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuração Playwright para Auditoria Visual e Extração de Passos (Nosso Dia PWA)
 * Viewport padrão: 390x844 (Mobile PWA / iPhone 12/13/14)
 * Gravação nativa de vídeo ativada em ./tutorial-output/videos/
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1, // Execução sequencial para gravação consistente de vídeo contínuo
  reporter: [
    ['list'],
    ['html', { outputFolder: './tutorial-output/playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1 NossoDiaPWA/2.3.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2, // Retina display para screenshots de alta fidelidade
    video: {
      mode: 'on',
      size: { width: 390, height: 844 }
    },
    contextOptions: {
      recordVideo: {
        dir: path.resolve('./tutorial-output/videos/'),
        size: { width: 390, height: 844 }
      }
    }
  },
  projects: [
    {
      name: 'Mobile-PWA-Audit',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1 NossoDiaPWA/2.3.1',
      },
    },
  ],
});
