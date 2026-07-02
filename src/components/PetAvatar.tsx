import { cn } from '@/lib/utils';
import { getPrimaryPetImageUrl, type PetWithImages } from '@/utils/petImages';
import { usePetAvatarVisibility } from '@/contexts/PetAvatarVisibilityContext';
import petBuddyMascot from '@/assets/pet-buddy-mascot.png';

export const DEFAULT_PET_AVATAR_SRC = petBuddyMascot;

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
  hero: 'w-32 h-32',
  room: 'w-40 h-40',
} as const;

export type PetAvatarSize = keyof typeof sizeMap;

interface PetAvatarProps {
  pet?: PetWithImages | null;
  src?: string | null;
  alt?: string;
  size?: PetAvatarSize;
  className?: string;
  rounded?: 'full' | '2xl' | 'xl' | 'lg';
  ring?: boolean;
}

export function PetAvatar({
  pet,
  src,
  alt,
  size = 'lg',
  className,
  rounded = 'full',
  ring = false,
}: PetAvatarProps) {
  const { showPetAvatars } = usePetAvatarVisibility();
  if (!showPetAvatars) return null;

  const imageUrl = src ?? (pet ? getPrimaryPetImageUrl(pet) : null) ?? DEFAULT_PET_AVATAR_SRC;
  const label =
    alt ??
    (pet && typeof (pet as { name?: string }).name === 'string'
      ? (pet as { name: string }).name
      : 'Mascota');

  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === '2xl'
        ? 'rounded-2xl'
        : rounded === 'xl'
          ? 'rounded-xl'
          : 'rounded-lg';

  return (
    <img
      src={imageUrl}
      alt={label}
      className={cn(
        sizeMap[size],
        roundedClass,
        'object-cover bg-white shrink-0',
        ring && 'ring-2 ring-white shadow-md',
        className,
      )}
    />
  );
}

export function PetBuddyAvatar({
  size = 'md',
  className,
  bare = false,
}: {
  size?: PetAvatarSize;
  className?: string;
  /** Sin recorte circular ni fondo — solo la mascota */
  bare?: boolean;
}) {
  const { showPetAvatars } = usePetAvatarVisibility();
  if (!showPetAvatars) return null;

  return (
    <img
      src={petBuddyMascot}
      alt="Pet Buddy"
      style={bare ? { background: 'transparent' } : undefined}
      className={cn(
        sizeMap[size],
        'shrink-0',
        bare
          ? 'object-contain !bg-transparent [background:none]'
          : 'rounded-full object-cover bg-white',
        className,
      )}
    />
  );
}
