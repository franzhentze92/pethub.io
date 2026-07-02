import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePetBuddy } from '@/contexts/PetBuddyContext';
import { BLUEPRINT_MASCOTS, type BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';

interface BlueprintMascotNavTabProps {
  dashboard: BlueprintDashboard;
  onToggle?: () => void;
  menuOpen?: boolean;
}

export const BlueprintMascotNavTab: React.FC<BlueprintMascotNavTabProps> = ({
  dashboard,
  onToggle,
  menuOpen = false,
}) => {
  const { isOpen, toggle } = usePetBuddy();
  const mascot = BLUEPRINT_MASCOTS[dashboard];

  const handleClick = () => {
    onToggle?.();
    toggle();
  };

  return (
    <div
      className={cn(
        'relative flex min-w-[4rem] flex-col items-center justify-end px-0.5',
        menuOpen ? 'z-[1]' : 'z-[105]',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={isOpen ? `Cerrar ${mascot.name}` : `Abrir ${mascot.name}`}
        aria-pressed={isOpen}
        className="group flex flex-col items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-aqua/50 rounded-2xl"
      >
        <span
          className={cn(
            'relative flex items-center justify-center rounded-full transition-all duration-300',
            '-mt-5 h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14',
            isOpen
              ? 'scale-105 bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango p-[2.5px] shadow-[0_8px_28px_rgba(0,240,200,0.45)] ring-4 ring-landing-aqua/25'
              : 'bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango p-[2px] shadow-[0_4px_16px_rgba(0,240,200,0.3)] group-active:scale-95',
          )}
        >
          <span className="flex h-full w-full overflow-hidden rounded-full bg-white">
            <img
              src={mascot.image}
              alt={mascot.name}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300',
                isOpen ? 'scale-95' : 'group-hover:scale-105',
              )}
            />
          </span>
          {!isOpen && (
            <Sparkles className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-landing-mango drop-shadow-sm" />
          )}
          {isOpen && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
          )}
        </span>
        <span
          className={cn(
            'text-[9px] font-bold leading-none tracking-wide',
            isOpen ? 'text-landing-aqua-dark' : 'text-gray-600',
          )}
        >
          {mascot.name}
        </span>
      </button>
    </div>
  );
};
