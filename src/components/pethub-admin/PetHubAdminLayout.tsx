import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isPetHubAdminUser } from '@/lib/pethubAdminAccess';
import PetHubAdminSidebar from './PetHubAdminSidebar';
import PageLoader from '@/components/PageLoader';

interface PetHubAdminLayoutProps {
  children: React.ReactNode;
}

const PetHubAdminLayout: React.FC<PetHubAdminLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isPetHubAdminUser(user.email)) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <PageLoader message="Cargando PetHub Admin..." />;
  }

  if (!user || !isPetHubAdminUser(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PetHubAdminSidebar />
      <div className="ml-16 min-h-screen">{children}</div>
    </div>
  );
};

export default PetHubAdminLayout;
