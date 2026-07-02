import type { LucideIcon } from 'lucide-react';
import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';

/** Vista unificada de sección para mapa, wizard y lista del Blueprint */
export interface BlueprintSectionView {
  id: string;
  title: string;
  mapLabel: string;
  description: string;
  category: string;
  icon: LucideIcon;
  path: string;
  gradientIndex: number;
  priority: number;
  status: BlueprintConnectionStatus;
  completionPercent: number;
  missingFields: string[];
  statLabel?: string;
  statValue?: string | number;
  ajustesTab?: 'perfil' | 'perros' | 'direcciones' | 'tarjetas';
  dashboardTab?: string;
  dashboardSubTab?: string;
}

export interface BlueprintDashboardData {
  sections: BlueprintSectionView[];
  overallPercent: number;
  connectedCount: number;
  totalCount: number;
  nextSection: BlueprintSectionView | null;
}
