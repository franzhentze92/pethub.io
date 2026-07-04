import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PageLoaderVariant = 'full' | 'inline' | 'skeleton';
export type SpinnerSize = 'sm' | 'md' | 'lg';

interface LandingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const spinnerSizes = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
  md: { box: 'w-14 h-14 rounded-xl', icon: 'w-7 h-7' },
  lg: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
} as const;

export const LandingSpinner: React.FC<LandingSpinnerProps> = ({ size = 'md', className }) => {
  const s = spinnerSizes[size];
  return (
    <div
      className={cn(
        'flex items-center justify-center shadow-lg ring-2 ring-white/60 bg-landing-aqua',
        s.box,
        className
      )}
    >
      <Loader2 className={cn('text-white animate-spin', s.icon)} />
    </div>
  );
};

interface SectionLoaderProps {
  message?: string;
  className?: string;
  size?: SpinnerSize;
}

/** Spinner + mensaje para tarjetas, modales y secciones internas */
export const SectionLoader: React.FC<SectionLoaderProps> = ({
  message,
  className,
  size = 'md',
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    <LandingSpinner size={size} className="mb-3" />
    {message && <p className="text-sm text-gray-600">{message}</p>}
  </div>
);

interface PageLoaderProps {
  message?: string;
  submessage?: string;
  variant?: PageLoaderVariant;
  className?: string;
}

export const getRoleLoaderMessage = (): string => {
  const role = localStorage.getItem('user_role');
  switch (role) {
    case 'provider':
      return 'Cargando dashboard de proveedor…';
    case 'shelter':
      return 'Cargando dashboard de albergue…';
    case 'admin':
      return 'Cargando panel de administración…';
    case 'delivery':
      return 'Cargando panel de reparto…';
    case 'client':
      return 'Cargando tu dashboard…';
    default:
      return 'Cargando PetHub…';
  }
};

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Cargando PetHub…',
  submessage,
  variant = 'full',
  className,
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4 animate-pulse', className)}>
        <div className="h-28 rounded-2xl bg-white/60" />
        <div className="h-12 rounded-full bg-white/60" />
        <div className="h-40 rounded-2xl bg-white/60" />
        <div className="h-32 rounded-2xl bg-white/60" />
        <div className="h-32 rounded-2xl bg-white/60" />
      </div>
    );
  }

  const spinner = (
    <LandingSpinner
      size={variant === 'full' ? 'lg' : 'md'}
      className="mx-auto mb-4 shadow-xl ring-4 ring-white/60"
    />
  );

  const content = (
    <div className="text-center px-6">
      {spinner}
      <h2 className={cn('font-semibold text-gray-800', variant === 'full' ? 'text-lg' : 'text-base')}>
        {message}
      </h2>
      {(submessage || variant === 'full') && (
        <p className="text-sm text-gray-500 mt-1">{submessage ?? 'Un momento…'}</p>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center justify-center py-16 min-h-[16rem]', className)}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center bg-white',
        className
      )}
    >
      <div className="relative z-10">{content}</div>
    </div>
  );
};

export default PageLoader;
