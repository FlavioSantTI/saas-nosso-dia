import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import pkg from './package.json';

export default defineConfig({
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
              buildTime: Date.now()
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
