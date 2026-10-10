/**
 * Utilitário para resolução da URL base e links da aplicação.
 */

export const getAppBaseUrl = (): string => {
  // 1. Prioriza a variável de ambiente se configurada
  if (import.meta.env.VITE_APP_URL) {
    return (import.meta.env.VITE_APP_URL as string).replace(/\/+$/, '');
  }

  // 2. Se estiver rodando no navegador em domínio público (não localhost)
  if (typeof window !== 'undefined' && window.location.origin) {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  // 3. Fallback oficial do ambiente de produção
  return 'https://nossodia.flaviosantiago.com.br';
};

/**
 * Gera a URL completa para convite de novos responsáveis na família.
 */
export const getFamilyInviteUrl = (familyId: string): string => {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/?join_family=${familyId}`;
};
