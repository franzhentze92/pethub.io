import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getRoleBenefitProfile, roleLabels, type PublicFeatureRole } from '@/data/featuresPageData';
import { publicPlatformRoles } from '@/data/landingPlatformData';
import { landingBadge } from '@/lib/landingTheme';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { RoleScreenPreviewFrame } from '@/components/landing/RoleDashboardPreview';

interface RoleBenefitsExplorerProps {
  activeRoleId: PublicFeatureRole;
  onRoleChange: (id: PublicFeatureRole) => void;
}

export const RoleBenefitsExplorer: React.FC<RoleBenefitsExplorerProps> = ({
  activeRoleId,
  onRoleChange,
}) => {
  const profile = getRoleBenefitProfile(activeRoleId);
  const roleData = publicPlatformRoles.find((r) => r.id === activeRoleId) ?? publicPlatformRoles[0];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-landing-aqua/5 via-transparent to-landing-mint/5 pointer-events-none" />
      <LandingPetDecorations preset="section" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-12">
          <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Según tu perfil
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {profile.sectionTitle}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">{profile.sectionSubtitle}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10">
          {publicPlatformRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleChange(role.id as PublicFeatureRole)}
              className={`px-4 md:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeRoleId === role.id
                  ? `bg-gradient-to-r ${role.gradient} text-white shadow-lg scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {roleLabels[role.id as PublicFeatureRole]}
            </button>
          ))}
        </div>

        <div
          key={activeRoleId}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.outcomes.map((outcome) => (
                <div
                  key={outcome.title}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-landing-aqua/20 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleData.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                    <outcome.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug">{outcome.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{outcome.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 md:p-6">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-landing-aqua-dark" />
                En la práctica, como {roleLabels[activeRoleId].toLowerCase()}…
              </h4>
              <ul className="space-y-3">
                {profile.scenarios.map((scenario) => (
                  <li key={scenario} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 bg-gradient-to-r ${roleData.gradient}`} />
                    {scenario}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <RoleScreenPreviewFrame roleId={activeRoleId} maxHeight="420px" />
            <p className="text-[11px] text-gray-400 text-center">
              Interfaz real de PetHub — pantalla de {roleLabels[activeRoleId].toLowerCase()}
            </p>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Herramientas incluidas
              </p>
              <div className="flex flex-wrap gap-2">
                {roleData.modules.map((mod) => (
                  <span
                    key={mod.title}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5"
                  >
                    <mod.icon className="w-3.5 h-3.5 text-landing-aqua-dark shrink-0" />
                    {mod.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
