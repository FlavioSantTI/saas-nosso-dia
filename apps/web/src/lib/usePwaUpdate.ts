import { useEffect, useState } from 'react';
import { APP_VERSION } from '../constants/version';

export function usePwaUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>(APP_VERSION);

  const checkForUpdate = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.version && data.version !== APP_VERSION) {
          setHasUpdate(true);
          setLatestVersion(data.version);
        }
      }
    } catch {
      // Silencioso se estiver offline
    }
  };

  useEffect(() => {
    checkForUpdate();

    // Checa imediatamente quando o usuário desbloqueia o celular ou retorna ao app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    const onOnline = () => {
      checkForUpdate();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    // Verificação periódica de fundo a cada 15 minutos
    const interval = setInterval(checkForUpdate, 15 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, []);

  const reloadApp = async () => {
    try {
      // Limpa caches do Service Worker e navegador se disponíveis
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch {
      // Prossegue para reload mesmo se houver falha de cache
    }
    window.location.reload();
  };

  return {
    hasUpdate,
    currentVersion: APP_VERSION,
    latestVersion,
    reloadApp
  };
}
