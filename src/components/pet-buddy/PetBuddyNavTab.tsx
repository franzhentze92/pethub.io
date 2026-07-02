import React from 'react';
import { BlueprintMascotNavTab } from '@/components/blueprint/BlueprintMascotNavTab';

interface PetBuddyNavTabProps {
  onToggle: () => void;
  menuOpen?: boolean;
}

const PetBuddyNavTab: React.FC<PetBuddyNavTabProps> = ({ onToggle, menuOpen = false }) => (
  <BlueprintMascotNavTab dashboard="client" onToggle={onToggle} menuOpen={menuOpen} />
);

export default PetBuddyNavTab;
