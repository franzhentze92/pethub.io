import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import PetHubAdminLayout from '@/components/pethub-admin/PetHubAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { PETHUB_ADMIN_SECTIONS } from '@/config/pethubAdminSections';
import { cn } from '@/lib/utils';

const PetHubAdminHomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PetHubAdminLayout>
      <PageHeader
        title="PetHub Admin"
        description="Panel exclusivo de consulta de datos de la plataforma."
      />

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {PETHUB_ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => navigate(section.path)}
              className="text-left"
            >
              <Card className={cn(
                'h-full transition-all hover:border-landing-aqua/40 hover:shadow-md',
              )}>
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </PetHubAdminLayout>
  );
};

export default PetHubAdminHomePage;
