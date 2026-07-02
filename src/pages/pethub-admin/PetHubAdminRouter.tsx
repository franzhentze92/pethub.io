import React from 'react';
import { useLocation } from 'react-router-dom';
import PetHubAdminHomePage from './PetHubAdminHomePage';
import PetHubAdminSectionPage from './PetHubAdminSectionPage';
import { getPetHubAdminSectionByPath } from '@/config/pethubAdminSections';

const PetHubAdminRouter: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/pethub-admin') {
    return <PetHubAdminHomePage />;
  }

  const section = getPetHubAdminSectionByPath(location.pathname);
  if (section) {
    return <PetHubAdminSectionPage section={section} />;
  }

  return <PetHubAdminHomePage />;
};

export default PetHubAdminRouter;
