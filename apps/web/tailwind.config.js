/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Escala tipográfica padronizada para mobile-first (evita fontes < 13px ilegíveis)
        'caption': ['0.8125rem', { lineHeight: '1.125rem' }], // 13px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'body': ['1rem', { lineHeight: '1.5rem' }],           // 16px (tamanho mínimo para inputs no iOS)
        'title-sm': ['1.125rem', { lineHeight: '1.5rem' }],   // 18px
        'title': ['1.375rem', { lineHeight: '1.75rem' }],     // 22px
        'display': ['1.75rem', { lineHeight: '2.25rem' }],    // 28px
      },
      boxShadow: {
        // Suporte retrocompatível para utilitários usados no projeto
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      colors: {
        brand: {
          blue: '#0284C7',
          'blue-dark': '#0369A1',
          'blue-light': '#E0F2FE',
          orange: '#EA580C',
          'orange-light': '#FFEDD5',
        },
      },
    },
  },
  plugins: [],
};
