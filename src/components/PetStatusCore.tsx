import React from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { Heart, Utensils, Zap, Droplets, Smile, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PetStatus, StatusBar, StatusRecommendation } from '@/services/petStatusService';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { useNavigate } from 'react-router-dom';

interface PetStatusCoreProps {
  pet: {
    id: string;
    name: string;
    image_url?: string | null;
    species?: string;
  };
  status: PetStatus;
  recommendations: StatusRecommendation[];
  loading?: boolean;
}

const PetStatusCore: React.FC<PetStatusCoreProps> = ({ 
  pet, 
  status, 
  recommendations,
  loading = false 
}) => {
  const navigate = useNavigate();

  const getStatusColor = (statusValue: StatusBar['status']) => {
    switch (statusValue) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (statusValue: StatusBar['status']) => {
    switch (statusValue) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getPetMood = () => {
    const avgStatus = (
      status.health.value + 
      status.nutrition.value + 
      status.energy.value + 
      status.hygiene.value + 
      status.wellbeing.value
    ) / 5;

    if (avgStatus >= 80) return { emoji: '😊', text: 'Feliz y saludable', color: 'text-green-600' };
    if (avgStatus >= 60) return { emoji: '😐', text: 'Neutral', color: 'text-yellow-600' };
    if (avgStatus >= 40) return { emoji: '😔', text: 'Necesita atención', color: 'text-orange-600' };
    return { emoji: '😢', text: 'Descuidado', color: 'text-red-600' };
  };

  const mood = getPetMood();

  const statusBars = [
    {
      key: 'health' as const,
      icon: <Heart className="w-5 h-5" />,
      label: 'Salud',
      status: status.health,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      progressColor: getStatusColor(status.health.status)
    },
    {
      key: 'nutrition' as const,
      icon: <Utensils className="w-5 h-5" />,
      label: 'Nutrición',
      status: status.nutrition,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      progressColor: getStatusColor(status.nutrition.status)
    },
    {
      key: 'energy' as const,
      icon: <Zap className="w-5 h-5" />,
      label: 'Energía',
      status: status.energy,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      progressColor: getStatusColor(status.energy.status)
    },
    {
      key: 'hygiene' as const,
      icon: <Droplets className="w-5 h-5" />,
      label: 'Higiene',
      status: status.hygiene,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      progressColor: getStatusColor(status.hygiene.status)
    },
    {
      key: 'wellbeing' as const,
      icon: <Smile className="w-5 h-5" />,
      label: 'Bienestar',
      status: status.wellbeing,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      progressColor: getStatusColor(status.wellbeing.status)
    }
  ];

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <SectionLoader message="Cargando estado de mascota…" className="py-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pet Avatar & Mood Section */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Pet Avatar */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-1 shadow-lg">
                <PetAvatar
                  pet={pet}
                  size="hero"
                  className="w-full h-full md:w-40 md:h-40"
                />
              </div>
              {/* Mood Indicator */}
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border-4 border-purple-100">
                <span className="text-3xl">{mood.emoji}</span>
              </div>
            </div>

            {/* Pet Info & Status */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {pet.name}
              </h2>
              {pet.species && (
                <p className="text-gray-600 mb-4">{formatSpeciesLabel(pet.species)}</p>
              )}
              
              {/* Overall Mood */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span className={`text-lg font-semibold ${mood.color}`}>
                  {mood.text}
                </span>
                <Badge 
                  variant="outline" 
                  className={`${mood.color} border-current`}
                >
                  {mood.emoji}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {statusBars.slice(0, 4).map((bar) => (
                  <div 
                    key={bar.key}
                    className={`${bar.bgColor} rounded-lg p-3 text-center`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className={bar.color}>{bar.icon}</div>
                      <span className="text-xs font-medium text-gray-700">
                        {bar.status.value}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${bar.progressColor} transition-all duration-500`}
                        style={{ width: `${bar.status.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bars Detail */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Estado Detallado
          </h3>
          <div className="space-y-4">
            {statusBars.map((bar) => (
              <div key={bar.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={bar.color}>{bar.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {bar.label}
                        </span>
                        {getStatusIcon(bar.status.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {bar.status.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {bar.status.value}%
                    </div>
                    <Badge 
                      variant="outline"
                      className={
                        bar.status.status === 'excellent' ? 'border-green-500 text-green-700' :
                        bar.status.status === 'good' ? 'border-blue-500 text-blue-700' :
                        bar.status.status === 'warning' ? 'border-yellow-500 text-yellow-700' :
                        'border-red-500 text-red-700'
                      }
                    >
                      {bar.status.label}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={bar.status.value} 
                  className="h-3"
                />
                {bar.status.daysSinceLastUpdate !== undefined && (
                  <p className="text-xs text-gray-500 ml-11">
                    {bar.status.daysSinceLastUpdate === 0 
                      ? 'Actualizado hoy' 
                      : bar.status.daysSinceLastUpdate === 1
                      ? 'Actualizado ayer'
                      : `Actualizado hace ${bar.status.daysSinceLastUpdate} días`
                    }
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Recomendaciones
              </h3>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline"
                          className={
                            rec.priority === 'high' 
                              ? 'border-red-500 text-red-700 bg-red-50' 
                              : 'border-yellow-500 text-yellow-700 bg-yellow-50'
                          }
                        >
                          {rec.priority === 'high' ? 'Alta prioridad' : 'Media prioridad'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {rec.message}
                      </p>
                      <p className="text-xs text-gray-600">
                        {rec.action}
                      </p>
                    </div>
                    {rec.marketplaceLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(rec.marketplaceLink!)}
                        className="flex-shrink-0"
                      >
                        Ver opciones
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => navigate('/veterinaria')}
            >
              <Heart className="w-5 h-5 text-red-600" />
              <span className="text-xs">Salud</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => navigate('/meal-journal')}
            >
              <Utensils className="w-5 h-5 text-orange-600" />
              <span className="text-xs">Alimentar</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => navigate('/adventure-log')}
            >
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-xs">Ejercicio</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => navigate('/marketplace?category=grooming')}
            >
              <Droplets className="w-5 h-5 text-cyan-600" />
              <span className="text-xs">Grooming</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PetStatusCore;

