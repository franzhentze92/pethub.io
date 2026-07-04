import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BeforeInstallPromptEvent,
  dismissPwaPrompt,
  getInstallGuide,
  isAppRoute,
  isMobileDevice,
  isStandaloneMode,
  type PwaInstallGuide,
  wasPwaPromptDismissed,
} from '@/lib/pwa';

const PROMPT_DELAY_MS = 2000;

export function usePwaInstall() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const canShowBase =
    isMobileDevice() &&
    !isStandaloneMode() &&
    !wasPwaPromptDismissed() &&
    isAppRoute(location.pathname);

  useEffect(() => {
    if (!canShowBase) {
      setShowPrompt(false);
      return;
    }

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // Fallback: mostrar guía manual en iOS, Chrome móvil, o desarrollo local (http://192.x.x.x)
    // donde beforeinstallprompt no se dispara sin HTTPS.
    const timer = window.setTimeout(() => {
      setShowPrompt(true);
    }, PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, [canShowBase, location.pathname]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    dismissPwaPrompt();
    setShowPrompt(false);
  }, []);

  const installGuide: PwaInstallGuide = getInstallGuide(!!deferredPrompt);

  return {
    showPrompt: canShowBase && showPrompt,
    canNativeInstall: !!deferredPrompt,
    installGuide,
    install,
    dismiss,
  };
}
