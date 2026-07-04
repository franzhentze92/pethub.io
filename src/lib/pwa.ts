export const PWA_DISMISS_KEY = 'pethub-pwa-install-dismissed';
const PWA_DISMISS_DAYS = 14;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Detecta móvil por viewport, touch y user-agent (más fiable que solo ancho). */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  return narrow || (coarsePointer && mobileUa) || mobileUa;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
}

export function wasPwaPromptDismissed(): boolean {
  const raw = localStorage.getItem(PWA_DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return true;
  const msSinceDismiss = Date.now() - dismissedAt;
  return msSinceDismiss < PWA_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function dismissPwaPrompt(): void {
  localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
}

/** Rutas de marketing/legal donde no mostramos el aviso PWA. */
const MARKETING_PATHS = new Set([
  '/',
  '/about',
  '/features',
  '/faqs',
  '/pricing',
  '/contact',
  '/pitch',
  '/privacy',
  '/terms',
]);

export function isAppRoute(pathname: string): boolean {
  return !MARKETING_PATHS.has(pathname);
}

export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  if (!isSecureContext()) {
    console.info('[PWA] Service worker omitido: se requiere HTTPS o localhost (no funciona en http://192.x.x.x).');
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export type PwaInstallGuide = 'native' | 'ios' | 'android' | 'generic';

export function getInstallGuide(hasNativePrompt: boolean): PwaInstallGuide {
  if (hasNativePrompt) return 'native';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'generic';
}
