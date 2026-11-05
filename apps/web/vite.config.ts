import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import pkg from './package.json';

const BUILD_TIME = Date.now();

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME)
  },
  plugins: [
    react(),
    {
      name: 'generate-pwa-version-json',
      buildStart() {
        if (!fs.existsSync('./public')) {
          fs.mkdirSync('./public', { recursive: true });
        }
        fs.writeFileSync(
          './public/version.json',
          JSON.stringify(
            {
              version: pkg.version,
              buildTime: BUILD_TIME
            },
            null,
            2
          )
        );
      }
    }
  ],
  server: {
    port: 5173
  }
});
