import React from 'react';
import { Download, MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { isSecureContext } from '@/lib/pwa';
import { cn } from '@/lib/utils';

export const PwaInstallPrompt: React.FC = () => {
  const { showPrompt, canNativeInstall, installGuide, install, dismiss } = usePwaInstall();
  const needsHttps = !isSecureContext();

  if (!showPrompt) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-[200] px-4',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6',
      )}
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-landing-aqua/25 bg-white shadow-2xl">
        <div className="bg-landing-aqua px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm">
                <Smartphone className="h-5 w-5 text-landing-aqua-dark" />
              </div>
              <div className="min-w-0">
                <h2 id="pwa-install-title" className="text-sm font-bold text-white">
                  Instala PetHub en tu teléfono
                </h2>
                <p id="pwa-install-description" className="text-xs text-white/90 mt-0.5">
                  Acceso rápido desde tu pantalla de inicio, sin barra del navegador.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-lg p-1.5 text-white/80 hover:bg-white/20"
              aria-label="Cerrar aviso de instalación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {needsHttps && (
            <p className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">
              Para abrir <strong>sin barra del navegador</strong>, usa{' '}
              <strong>https://</strong> (no http). Reinicia el servidor y entra por{' '}
              <strong>https://192.x.x.x:8080</strong>, luego vuelve a instalar desde el ícono del home.
            </p>
          )}

          {installGuide === 'ios' && (
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 shrink-0 mt-0.5 text-landing-aqua-dark" />
                <span>
                  Abre PetHub en <strong>Safari</strong>, toca <strong>Compartir</strong> (cuadrado con flecha).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 shrink-0 mt-0.5 text-landing-aqua-dark" />
                <span>
                  Elige <strong>Agregar a pantalla de inicio</strong> y confirma.
                </span>
              </li>
            </ol>
          )}

          {installGuide === 'android' && (
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <MoreVertical className="h-4 w-4 shrink-0 mt-0.5 text-landing-aqua-dark" />
                <span>
                  En Chrome, toca el menú <strong>⋮</strong> y elige{' '}
                  <strong>Instalar aplicación</strong> (no solo «Agregar acceso directo»).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 shrink-0 mt-0.5 text-landing-aqua-dark" />
                <span>
                  Si ya la agregaste con <strong>http://</strong>, bórrala del home e instala de nuevo con{' '}
                  <strong>https://</strong>.
                </span>
              </li>
            </ol>
          )}

          {installGuide === 'generic' && (
            <p className="text-sm text-gray-600">
              Usa el menú de tu navegador y busca <strong>Agregar a pantalla de inicio</strong> o{' '}
              <strong>Instalar aplicación</strong>.
            </p>
          )}

          {installGuide === 'native' && (
            <p className="text-sm text-gray-600">
              Instala la app para abrirla a pantalla completa, como una app nativa.
            </p>
          )}

          <div className="flex gap-2">
            {canNativeInstall && (
              <Button
                type="button"
                onClick={() => void install()}
                className="flex-1 min-h-[44px] rounded-xl bg-landing-aqua hover:bg-landing-aqua-dark text-white border-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Instalar app
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={dismiss}
              className={cn(
                'min-h-[44px] rounded-xl border-gray-200',
                canNativeInstall ? 'px-4' : 'flex-1',
              )}
            >
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
