import React, { useMemo } from 'react';
import {
  Package,
  ShoppingBag,
  Stethoscope,
  CreditCard,
  Activity,
  Utensils,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  Heart,
  AlertCircle,
  Star,
  Zap,
  Calendar,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { landingCardThemes, landingChartColors, landingFeatureGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  type JourneyEvent,
  type JourneyStats,
  computeExpenseBreakdown,
  computeMonthlySpending,
  computeActivityByType,
  computeActivityPulse,
  computeJourneyScore,
  computeCarePillars,
  computeInsights,
  getScoreLabel,
  type JourneyInsight,
} from './petJourneyAnalytics';

interface PetJourneyOverviewProps {
  pet: {
    id: string;
    name: string;
    created_at: string;
    image_url?: string | null;
  };
  stats: JourneyStats;
  events: JourneyEvent[];
  formatPrice: (amount: number, currency?: string) => string;
  onViewTimeline?: () => void;
  onEventSelect?: (event: JourneyEvent) => void;
}

const insightIcons: Record<JourneyInsight['icon'], React.ElementType> = {
  trend: TrendingUp,
  heart: Heart,
  spark: Sparkles,
  alert: AlertCircle,
  star: Star,
};

const insightAccent: Record<JourneyInsight['accent'], string> = {
  aqua: 'from-landing-aqua/15 to-landing-mint/10 border-landing-aqua/25',
  mint: 'from-landing-mint/15 to-landing-aqua/10 border-landing-mint/25',
  mango: 'from-landing-mango/15 to-landing-tropical/10 border-landing-mango/25',
  tropical: 'from-landing-tropical/20 to-landing-mango/10 border-landing-tropical/30',
};

const eventTypeLabels: Record<JourneyEvent['type'], string> = {
  product: 'Producto',
  service: 'Servicio',
  veterinary: 'Veterinaria',
  exercise: 'Ejercicio',
  nutrition: 'Nutrición',
};

const PetJourneyOverview: React.FC<PetJourneyOverviewProps> = ({
  pet,
  stats,
  events,
  formatPrice,
  onViewTimeline,
  onEventSelect,
}) => {
  const analytics = useMemo(() => {
    const expenseBreakdown = computeExpenseBreakdown(stats);
    const monthlySpending = computeMonthlySpending(events);
    const activityByType = computeActivityByType(events);
    const activityPulse = computeActivityPulse(events);
    const journeyScore = computeJourneyScore(stats, events);
    const carePillars = computeCarePillars(stats);
    const insights = computeInsights(stats, events, pet.name);
    const scoreMeta = getScoreLabel(journeyScore);
    const memberDays = differenceInDays(new Date(), parseISO(pet.created_at));
    const activeDays = activityPulse.filter((d) => d.count > 0).length;
    const recentHighlights = events.slice(0, 3);
    const hasSpending = expenseBreakdown.length > 0;
    const hasActivity = activityByType.length > 0;
    const totalMonthlyEvents = monthlySpending.reduce((s, m) => s + m.total, 0);

    return {
      expenseBreakdown,
      monthlySpending,
      activityByType,
      activityPulse,
      journeyScore,
      carePillars,
      insights,
      scoreMeta,
      memberDays,
      activeDays,
      recentHighlights,
      hasSpending,
      hasActivity,
      totalMonthlyEvents,
    };
  }, [stats, events, pet.name, pet.created_at]);

  const primaryStatCards = [
    { label: 'Productos', value: String(stats.totalProducts), sub: formatPrice(stats.productsCost), icon: Package },
    { label: 'Servicios', value: String(stats.totalServices), sub: formatPrice(stats.servicesCost), icon: ShoppingBag },
    { label: 'Visitas vet.', value: String(stats.totalVeterinaryVisits), sub: formatPrice(stats.veterinaryCost), icon: Stethoscope },
    { label: 'Costo total', value: formatPrice(stats.totalCost), sub: 'Inversión acumulada', icon: CreditCard },
  ];

  const secondaryStatCards = [
    { label: 'Ejercicio', value: String(stats.totalExerciseSessions), sub: 'Sesiones', icon: Activity },
    { label: 'Nutrición', value: String(stats.totalNutritionSessions), sub: 'Registros', icon: Utensils },
    { label: 'Eventos', value: String(events.length), sub: 'En timeline', icon: Calendar },
  ];

  return (
    <div className="space-y-4">
      {/* Journey Score Hero */}
      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#journeyGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${analytics.journeyScore * 2.64} 264`}
                />
                <defs>
                  <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={landingChartColors.aqua} />
                    <stop offset="100%" stopColor={landingChartColors.mango} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{analytics.journeyScore}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Score</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{analytics.scoreMeta.emoji}</span>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">Journey {analytics.scoreMeta.label}</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {pet.name} lleva {analytics.memberDays} días en PetHub con actividad en{' '}
                {analytics.carePillars.filter((p) => p.active).length} de 5 áreas de cuidado.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {analytics.carePillars.map((pillar) => (
                  <span
                    key={pillar.id}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                      pillar.active
                        ? 'bg-white/80 border-landing-aqua/30 text-landing-aqua-dark'
                        : 'bg-gray-50 border-gray-200 text-gray-400',
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: pillar.active ? pillar.color : '#cbd5e1' }}
                    />
                    {pillar.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {primaryStatCards.map((stat, index) => {
          const theme = landingCardThemes[index % landingCardThemes.length];
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-4 backdrop-blur-sm', theme.bg, theme.border)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{stat.label}</p>
                <Icon className="w-4 h-4 text-landing-aqua-dark shrink-0 opacity-80" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analytics.insights.map((insight) => {
            const Icon = insightIcons[insight.icon];
            return (
              <div
                key={insight.id}
                className={cn(
                  'rounded-2xl border p-4 bg-gradient-to-br backdrop-blur-sm',
                  insightAccent[insight.accent],
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="w-4 h-4 text-landing-aqua-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Distribution */}
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
              <PieChartIcon className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Distribución de gastos
            </h3>
            <p className="text-xs text-gray-500 mb-4">Cómo se reparte tu inversión en {pet.name}</p>

            {analytics.hasSpending ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`Q${value.toFixed(2)}`, '']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2">
                  {analytics.expenseBreakdown.map((slice) => (
                    <div key={slice.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="text-sm text-gray-700 truncate">{slice.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-gray-900">{slice.pct}%</span>
                        <span className="text-xs text-gray-500 ml-1.5">{formatPrice(slice.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sin gastos registrados aún</p>
              </div>
            )}
          </div>
        </MobileSectionCard>

        {/* Monthly Spending Trend */}
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
              <TrendingUp className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Inversión mensual
            </h3>
            <p className="text-xs text-gray-500 mb-4">Tendencia de los últimos 6 meses</p>

            {analytics.totalMonthlyEvents > 0 || analytics.hasSpending ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlySpending} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={landingChartColors.aqua} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={landingChartColors.aqua} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => `Q${v}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          productos: 'Productos',
                          servicios: 'Servicios',
                          veterinaria: 'Veterinaria',
                          total: 'Total',
                        };
                        return [`Q${Number(value).toFixed(2)}`, labels[name] ?? name];
                      }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={landingChartColors.aqua}
                      strokeWidth={2}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sin inversión mensual registrada</p>
              </div>
            )}
          </div>
        </MobileSectionCard>
      </div>

      {/* Activity Pulse + Activity Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 30-day Activity Pulse */}
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Flame className="w-5 h-5 text-landing-mango shrink-0" />
                Pulso de actividad
              </h3>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {analytics.activeDays} días activos
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-4">Últimos 30 días de cuidado</p>

            {events.length > 0 ? (
              <>
                <div className="flex items-end gap-[3px] h-16 px-1">
                  {analytics.activityPulse.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 min-w-0 rounded-sm transition-all"
                      style={{
                        height: `${Math.max(day.intensity * 100, day.count > 0 ? 12 : 4)}%`,
                        backgroundColor:
                          day.count === 0
                            ? '#e2e8f0'
                            : day.intensity > 0.66
                              ? landingChartColors.aqua
                              : day.intensity > 0.33
                                ? landingChartColors.mint
                                : landingChartColors.tropical,
                        opacity: day.count === 0 ? 0.5 : 0.85 + day.intensity * 0.15,
                      }}
                      title={`${day.date}: ${day.count} evento(s)`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-400 px-1">
                  <span>Hace 30 días</span>
                  <span>Hoy</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Registra actividades para ver el pulso</p>
              </div>
            )}
          </div>
        </MobileSectionCard>

        {/* Activity by Type */}
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
              <BarChart3 className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Mix de actividades
            </h3>
            <p className="text-xs text-gray-500 mb-4">Eventos por categoría</p>

            {analytics.hasActivity ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.activityByType} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                    <Tooltip
                      formatter={(value: number) => [`${value} eventos`, '']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {analytics.activityByType.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sin actividades categorizadas</p>
              </div>
            )}
          </div>
        </MobileSectionCard>
      </div>

      {/* Care Progress Bars */}
      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
            <Zap className="w-5 h-5 text-landing-aqua-dark shrink-0" />
            Progreso de cuidado
          </h3>
          <p className="text-xs text-gray-500 mb-4">Qué tan completo está el perfil de {pet.name}</p>
          <div className="space-y-3">
            {analytics.carePillars.map((pillar) => {
              const max = Math.max(pillar.count, 5);
              const pct = pillar.active ? Math.min((pillar.count / max) * 100, 100) : 0;
              return (
                <div key={pillar.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{pillar.label}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {pillar.active ? `${pillar.count} registro${pillar.count !== 1 ? 's' : ''}` : 'Sin datos'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: pillar.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </MobileSectionCard>

      {/* Secondary stats + Recent highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {secondaryStatCards.map((stat, index) => {
          const theme = landingCardThemes[(index + 4) % landingCardThemes.length];
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-4 backdrop-blur-sm', theme.bg, theme.border)}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <Icon className="w-4 h-4 text-landing-aqua-dark opacity-70" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Highlights */}
      {analytics.recentHighlights.length > 0 && (
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Sparkles className="w-5 h-5 text-landing-mango shrink-0" />
                Momentos recientes
              </h3>
              {onViewTimeline && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onViewTimeline}>
                  Ver timeline
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {analytics.recentHighlights.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventSelect?.(event)}
                  className="w-full text-left rounded-xl border border-white/60 bg-white/70 p-3 hover:shadow-md transition-shadow flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 bg-gradient-to-r',
                      landingFeatureGradients[index % landingFeatureGradients.length],
                    )}
                  >
                    {event.type === 'product' && <Package className="w-4 h-4" />}
                    {event.type === 'service' && <ShoppingBag className="w-4 h-4" />}
                    {event.type === 'veterinary' && <Stethoscope className="w-4 h-4" />}
                    {event.type === 'exercise' && <Activity className="w-4 h-4" />}
                    {event.type === 'nutrition' && <Utensils className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {format(parseISO(event.date), "d MMM yyyy", { locale: es })}
                      {event.cost > 0 && ` · ${formatPrice(event.cost, event.currency)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {eventTypeLabels[event.type]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </MobileSectionCard>
      )}
    </div>
  );
};

export default PetJourneyOverview;
