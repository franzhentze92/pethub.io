import React, { createContext, useContext, type ReactNode } from 'react';

interface PetAvatarVisibilityContextValue {
  showPetAvatars: boolean;
  setShowPetAvatars: (value: boolean) => void;
  togglePetAvatars: () => void;
}

const PetAvatarVisibilityContext = createContext<PetAvatarVisibilityContextValue | null>(null);

const alwaysVisible: PetAvatarVisibilityContextValue = {
  showPetAvatars: true,
  setShowPetAvatars: () => {},
  togglePetAvatars: () => {},
};

export function PetAvatarVisibilityProvider({ children }: { children: ReactNode }) {
  return (
    <PetAvatarVisibilityContext.Provider value={alwaysVisible}>
      {children}
    </PetAvatarVisibilityContext.Provider>
  );
}

export function usePetAvatarVisibility() {
  const context = useContext(PetAvatarVisibilityContext);
  return context ?? alwaysVisible;
}
