import React from 'react';
import { BrowserFrame } from '@/components/landing/BrowserFrame';
import {
  PetJourneyLandingScreen,
  ProviderLandingScreen,
  ShelterLandingScreen,
} from '@/components/landing/LandingAppScreens';
import { PublicRoleId } from '@/data/landingPlatformData';

interface RoleScreenPreviewProps {
  roleId: PublicRoleId;
}

const rolePreviewUrls: Record<PublicRoleId, string> = {
  client: 'app.pethub.gt/pet-journey',
  provider: 'app.pethub.gt/provider',
  shelter: 'app.pethub.gt/adopcion',
};

const previews: Record<PublicRoleId, React.FC> = {
  client: PetJourneyLandingScreen,
  provider: ProviderLandingScreen,
  shelter: ShelterLandingScreen,
};

export const RoleScreenPreview: React.FC<RoleScreenPreviewProps> = ({ roleId }) => {
  const Preview = previews[roleId];
  return <Preview />;
};

export const RoleScreenPreviewFrame: React.FC<{
  roleId: PublicRoleId;
  className?: string;
  maxHeight?: string;
}> = ({ roleId, className, maxHeight }) => (
  <BrowserFrame url={rolePreviewUrls[roleId]} className={className} maxHeight={maxHeight}>
    <RoleScreenPreview roleId={roleId} />
  </BrowserFrame>
);

export { BrowserFrame };
