import { useEffect, useRef, useState, useCallback } from 'react';
import { APP_VERSION } from '../constants/version';

declare const __APP_BUILD_TIME__: number | undefined;

interface UsePwaUpdateOptions {
  /** Indica se o usuário está com algum modal ou formulário aberto (evita auto-reload) */
  isBusy?: boolean;
}

const JUST_UPDATED_STORAGE_KEY = 'nosso_dia_just_updated_version';
const LAST_RELOADED_SIGNATURE_KEY = 'nosso_dia_last_reloaded_sig';

export function consumeJustUpdatedVersion(): string | null {
  try {
    const val = sessionStorage.getItem(JUST_UPDATED_STORAGE_KEY);
    if (val) {
      sessionStorage.removeItem(JUST_UPDATED_STORAGE_KEY);
      return val;
    }
  } catch {
    // Ignora erros de storage restrito
  }
  return null;
}

export function usePwaUpdate(options?: UsePwaUpdateOptions) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>(APP_VERSION);
  const latestSignatureRef = useRef<string>('');
  const isBusyRef = useRef<boolean>(Boolean(options?.isBusy));

  useEffect(() => {
    isBusyRef.current = Boolean(options?.isBusy);
  }, [options?.isBusy]);

  const performReload = useCallback(async (targetVersion: string, signature?: string) => {
    try {
      setIsAutoUpdating(true);
      try {
        sessionStorage.setItem(JUST_UPDATED_STORAGE_KEY, targetVersion || APP_VERSION);
        if (signature) {
          sessionStorage.setItem(LAST_RELOADED_SIGNATURE_KEY, signature);
        }
      } catch {
        // Ignora erro de sessionStorage
      }

      // Limpa caches do Service Worker e navegador se disponíveis
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.update().catch(() => {})));
      }
    } catch {
      // Prossegue para reload mesmo se houver falha de cache
    }
    window.location.reload();
  }, []);

  const reloadApp = useCallback(() => {
    performReload(latestVersion, latestSignatureRef.current);
  }, [latestVersion, performReload]);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  useEffect(() => {
    const currentBuildTime =
      typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;

    const checkForUpdate = async (trigger: 'mount' | 'resume' | 'interval') => {
      // Em ambiente local de desenvolvimento (Vite HMR), não força auto-reload por buildTime
      if (import.meta.env.DEV) return;

      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          }
        });
        if (!res.ok) return;

        const data = await res.json();
        const remoteVersion = String(data?.version || APP_VERSION);
        const remoteBuildTime = Number(data?.buildTime || 0);

        const isDifferentVersion = Boolean(remoteVersion && remoteVersion !== APP_VERSION);
        const isNewerBuild =
          currentBuildTime > 0 &&
          remoteBuildTime > 0 &&
          remoteBuildTime > currentBuildTime + 5000;

        if (isDifferentVersion || isNewerBuild) {
          const signature = `${remoteVersion}_${remoteBuildTime}`;
          latestSignatureRef.current = signature;
          setLatestVersion(remoteVersion);
          setHasUpdate(true);

          let alreadyReloadedThisSig = false;
          try {
            alreadyReloadedThisSig =
              sessionStorage.getItem(LAST_RELOADED_SIGNATURE_KEY) === signature;
          } catch {
            alreadyReloadedThisSig = false;
          }

          // Estratégia Híbrida Inteligente:
          // Se o usuário acabou de abrir ou retomar o app (mount/resume), não está com modal aberto
          // e ainda não recarregou para esta assinatura -> atualiza automaticamente de forma suave!
          if ((trigger === 'mount' || trigger === 'resume') && !isBusyRef.current && !alreadyReloadedThisSig) {
            setIsAutoUpdating(true);
            setTimeout(() => {
              performReload(remoteVersion, signature);
            }, 900);
          } else {
            // Se está usando o app ativamente ou com modal aberto -> exibe o banner pedindo confirmação
            setIsDismissed(false);
          }
        }
      } catch {
        // Silencioso se estiver offline
      }
    };

    checkForUpdate('mount');

    // Checa imediatamente quando o usuário desbloqueia o celular ou retorna ao app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate('resume');
      }
    };

    const onOnline = () => {
      checkForUpdate('resume');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    // Verificação periódica de fundo a cada 15 minutos
    const interval = setInterval(() => checkForUpdate('interval'), 15 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, [performReload]);

  return {
    hasUpdate,
    isDismissed,
    isAutoUpdating,
    currentVersion: APP_VERSION,
    latestVersion,
    reloadApp,
    dismissUpdate
  };
}
