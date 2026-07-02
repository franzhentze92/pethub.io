import React, { useEffect, useMemo, useState } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatPetOptionLabel } from '@/utils/petLabels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingCardThemes } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Scale,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PawPrint,
  Info,
  Database,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  assessFoodProfileCoverage,
  buildPetMonthlyComparison,
  comparisonLooksSuspiciouslyPerfect,
  compliancePercent,
  complianceStatus,
  formatNutrientValue,
  formatNutritionMonthLabel,
  getMonthInterval,
  NUTRIENT_DEFINITIONS,
  type FeedingScheduleConfig,
  type FoodProfileCoverage,
  type MonthlyNutritionComparison,
  type NutrientDefinition,
  type NutrientKey,
  type NutritionSessionRow,
  type PetProfile,
} from '@/utils/nutritionComparison';
import { foodDisplayLabel } from '@/utils/nutritionSession';
import {
  fetchMergedNutritionFoodCatalog,
  type CatalogSyncStatus,
  type NutritionFoodRow,
} from '@/utils/nutritionFoodCatalog';
import { getGuatemalaMarketInventoryStats, type GtMarketInventoryStats } from '@/data/guatemalaPetFoodMarketInventory';
import { GuatemalaFoodCatalogPanel } from '@/components/nutrition/GuatemalaFoodCatalogPanel';

const OBJECTIVE_COLORS = ['#FFB703', '#FDE74C', '#fb923c', '#f472b6', '#a78bfa', '#facc15'];
const REAL_COLORS = ['#00F0C8', '#38F9A0', '#38bdf8', '#4ade80', '#818cf8', '#2dd4bf'];

function petObjectiveColor(index: number): string {
  return OBJECTIVE_COLORS[index % OBJECTIVE_COLORS.length];
}

function petRealColor(index: number): string {
  return REAL_COLORS[index % REAL_COLORS.length];
}

function MonthlyNutrientTooltip({
  active,
  payload,
  label,
  decimals,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; payload?: { objetivo: number; real: number } }>;
  label?: string;
  decimals: number;
  unit: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const objetivo = row?.objetivo ?? 0;
  const real = row?.real ?? 0;
  const delta = real - objetivo;
  const pct = compliancePercent(objetivo, real);

  const deltaColor =
    delta > 0 ? 'text-sky-700' : delta < 0 ? 'text-amber-700' : 'text-gray-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1 text-gray-700">
        <p>
          <span className="text-gray-500">Objetivo mensual:</span>{' '}
          <span className="font-medium tabular-nums">
            {formatNutrientValue(objetivo, decimals)} {unit}
          </span>
        </p>
        <p>
          <span className="text-gray-500">Real mensual:</span>{' '}
          <span className="font-medium tabular-nums">
            {formatNutrientValue(real, decimals)} {unit}
          </span>
        </p>
        <p className={cn('pt-1 border-t border-gray-100 font-semibold tabular-nums', deltaColor)}>
          Delta: {delta > 0 ? '+' : ''}
          {formatNutrientValue(delta, decimals)} {unit}
          {pct != null && (
            <span className="font-normal text-gray-500"> · {pct}% del objetivo</span>
          )}
        </p>
      </div>
    </div>
  );
}

function NutrientMonthlyPetChart({
  def,
  comparisons,
  monthLabel,
}: {
  def: NutrientDefinition;
  comparisons: MonthlyNutritionComparison[];
  monthLabel: string;
}) {
  const decimals = def.decimals ?? 1;
  const round = (v: number) => Math.round(v * 10 ** decimals) / 10 ** decimals;

  const data = comparisons.map((c) => ({
    pet: c.petName,
    objetivo: round(c.expected[def.key]),
    real: round(c.actual[def.key]),
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 p-3 sm:p-4">
      <div className="mb-2">
        <p className="text-sm font-semibold text-gray-900">{def.label}</p>
        <p className="text-xs text-gray-500">
          {def.unit} · total {monthLabel}
        </p>
      </div>
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="pet" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} width={44} />
            <Tooltip
              content={(props) => (
                <MonthlyNutrientTooltip {...props} decimals={decimals} unit={def.unit} />
              )}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="objetivo" name="objetivo" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`obj-${index}`} fill={petObjectiveColor(index)} />
              ))}
            </Bar>
            <Bar dataKey="real" name="real" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`real-${index}`} fill={petRealColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {comparisons.map((c, index) => (
          <div key={c.petId} className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="font-medium text-gray-800">{c.petName}</span>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: petObjectiveColor(index) }}
              title="Objetivo"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: petRealColor(index) }}
              title="Real"
            />
          </div>
        ))}
        <span className="text-[10px] text-gray-400 w-full">
          Color izquierdo = objetivo · derecho = real
        </span>
      </div>
    </div>
  );
}

function NutrientChartsGrid({
  defs,
  comparisons,
  monthLabel,
}: {
  defs: NutrientDefinition[];
  comparisons: MonthlyNutritionComparison[];
  monthLabel: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((def) => (
        <NutrientMonthlyPetChart
          key={def.key}
          def={def}
          comparisons={comparisons}
          monthLabel={monthLabel}
        />
      ))}
    </div>
  );
}

function CrossPetChartsSection({
  comparisons,
  monthLabel,
}: {
  comparisons: MonthlyNutritionComparison[];
  monthLabel: string;
}) {
  const [showMicros, setShowMicros] = useState(false);

  if (comparisons.length === 0) return null;

  const partialMonth = comparisons.some(
    (c) => c.hasActiveSchedules && c.scheduleDays > 0 && c.scheduleDays < c.daysInMonth,
  );
  const suspiciousMicros = comparisons.some(comparisonLooksSuspiciouslyPerfect);
  const totalSessions = comparisons.reduce((n, c) => n + c.sessionCount, 0);
  const totalAuto = comparisons.reduce((n, c) => n + c.autoSessionCount, 0);

  const macroDefs = NUTRIENT_DEFINITIONS.filter((d) => d.group === 'macro');
  const vitaminDefs = NUTRIENT_DEFINITIONS.filter((d) => d.group === 'vitamin');
  const mineralDefs = NUTRIENT_DEFINITIONS.filter((d) => d.group === 'mineral');

  return (
    <MobileSectionCard>
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <h4 className="font-semibold text-gray-900">Comparación mensual entre mascotas</h4>
        <p className="text-sm text-gray-600 mt-1">
          Una gráfica por nutriente · barras de objetivo y real por mascota
        </p>
        {(partialMonth || suspiciousMicros || totalAuto > 0) && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 space-y-1">
            {partialMonth && (
              <p>
                <strong>Objetivo parcial del mes:</strong> el horario empezó a mitad de mes, así que
                el objetivo solo suma los días con horario activo (no todo junio).
              </p>
            )}
            {totalSessions > 0 && (
              <p>
                <strong>Consumo real:</strong> {totalSessions} comidas registradas
                {totalAuto > 0 ? ` (${totalAuto} auto-completadas por horario)` : ''}.
                Las vitaminas/minerales se calculan del perfil del alimento × gramos; las calorías
                usan lo que quedó guardado en cada registro.
              </p>
            )}
            {suspiciousMicros && (
              <p>
                Si minerales coinciden al 100% pero calorías no, revisa snacks extra o registros
                duplicados — no significa que la mascota comió &quot;perfecto&quot;.
              </p>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {comparisons.map((c, index) => (
            <div
              key={c.petId}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1"
            >
              <span className="text-[10px] font-medium text-gray-800">{c.petName}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: petObjectiveColor(index) }}
              />
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: petRealColor(index) }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Macronutrientes
          </p>
          <NutrientChartsGrid defs={macroDefs} comparisons={comparisons} monthLabel={monthLabel} />
        </div>

        <button
          type="button"
          onClick={() => setShowMicros((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700"
        >
          Vitaminas y minerales
          {showMicros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMicros && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Vitaminas
              </p>
              <NutrientChartsGrid defs={vitaminDefs} comparisons={comparisons} monthLabel={monthLabel} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Minerales
              </p>
              <NutrientChartsGrid defs={mineralDefs} comparisons={comparisons} monthLabel={monthLabel} />
            </div>
          </div>
        )}
      </div>
    </MobileSectionCard>
  );
}

function NutrientCompareRow({
  def,
  expected,
  actual,
}: {
  def: NutrientDefinition;
  expected: number;
  actual: number;
}) {
  const pct = compliancePercent(expected, actual);
  const status = complianceStatus(pct);
  const maxVal = Math.max(expected, actual, 1);
  const expectedWidth = (expected / maxVal) * 100;
  const actualWidth = (actual / maxVal) * 100;
  const decimals = def.decimals ?? 1;

  const statusColor =
    status === 'ok'
      ? 'text-emerald-600'
      : status === 'low'
        ? 'text-amber-600'
        : status === 'high'
          ? 'text-sky-600'
          : 'text-gray-500';

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{def.label}</p>
          <p className="text-xs text-gray-500">{def.unit}</p>
        </div>
        {pct != null && (
          <span className={cn('text-xs font-bold tabular-nums', statusColor)}>{pct}%</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-gray-500 shrink-0">Objetivo</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-landing-mango to-landing-tropical"
              style={{ width: `${expectedWidth}%` }}
            />
          </div>
          <span className="w-20 text-right tabular-nums text-gray-700 shrink-0">
            {formatNutrientValue(expected, decimals)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-gray-500 shrink-0">Real</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint"
              style={{ width: `${actualWidth}%` }}
            />
          </div>
          <span className="w-20 text-right tabular-nums text-gray-700 shrink-0">
            {formatNutrientValue(actual, decimals)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PetComparisonCard({ comparison }: { comparison: MonthlyNutritionComparison }) {
  const [expanded, setExpanded] = useState(false);
  const caloriePct = compliancePercent(comparison.expected.calories, comparison.actual.calories);
  const status = complianceStatus(caloriePct);
  const theme = landingCardThemes[0];

  const sourceLabel =
    comparison.expectedSource === 'schedule'
      ? 'Según horarios activos'
      : comparison.expectedSource === 'energy_reference'
        ? 'Estimación por peso (MER)'
        : 'Sin objetivo definido';

  return (
    <MobileSectionCard>
      <div className={cn('p-4 sm:p-5 border-b border-gray-100', theme.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <PawPrint className="w-5 h-5 text-landing-aqua shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-gray-900 truncate">{comparison.petName}</h4>
              <p className="text-xs text-gray-500 capitalize">{comparison.monthLabel}</p>
            </div>
          </div>
          {caloriePct != null && (
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                status === 'ok' && 'border-emerald-300 text-emerald-700 bg-emerald-50',
                status === 'low' && 'border-amber-300 text-amber-700 bg-amber-50',
                status === 'high' && 'border-sky-300 text-sky-700 bg-sky-50',
              )}
            >
              {caloriePct}% calorías
            </Badge>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {sourceLabel}
          </Badge>
          {comparison.hasActiveSchedules && (
            <Badge variant="outline" className="text-[10px]">
              {comparison.scheduleDays} días con horario
            </Badge>
          )}
          {comparison.sessionCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {comparison.sessionCount} comidas registradas
              {comparison.autoSessionCount > 0 ? ` · ${comparison.autoSessionCount} auto` : ''}
            </Badge>
          )}
          {comparisonLooksSuspiciouslyPerfect(comparison) && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
              Revisar registros
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-xs text-amber-700 font-medium">Objetivo mensual</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatNutrientValue(comparison.expected.calories, 0)}
            </p>
            <p className="text-[10px] text-gray-500">kcal</p>
          </div>
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-center">
            <p className="text-xs text-teal-700 font-medium">Consumido real</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatNutrientValue(comparison.actual.calories, 0)}
            </p>
            <p className="text-[10px] text-gray-500">kcal</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700"
        >
          Detalle de nutrientes
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Macronutrientes</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NUTRIENT_DEFINITIONS.filter((d) => d.group === 'macro').map((def) => (
                  <NutrientCompareRow
                    key={def.key}
                    def={def}
                    expected={comparison.expected[def.key]}
                    actual={comparison.actual[def.key]}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vitaminas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NUTRIENT_DEFINITIONS.filter((d) => d.group === 'vitamin').map((def) => (
                  <NutrientCompareRow
                    key={def.key}
                    def={def}
                    expected={comparison.expected[def.key]}
                    actual={comparison.actual[def.key]}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Minerales</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NUTRIENT_DEFINITIONS.filter((d) => d.group === 'mineral').map((def) => (
                  <NutrientCompareRow
                    key={def.key}
                    def={def}
                    expected={comparison.expected[def.key]}
                    actual={comparison.actual[def.key]}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileSectionCard>
  );
}

function FoodProfileBanner({
  coverage,
  marketStats,
  syncStatus,
  dbCount,
  catalogCount,
}: {
  coverage: FoodProfileCoverage;
  marketStats: GtMarketInventoryStats;
  syncStatus: CatalogSyncStatus;
  dbCount: number;
  catalogCount: number;
}) {
  const completeEnough = coverage.macroPct >= 80;
  const marketComplete = marketStats.queued === 0 && marketStats.needsResearch === 0;

  const syncLabel =
    syncStatus === 'synced'
      ? `${dbCount} en base de datos`
      : syncStatus === 'partial'
        ? `${dbCount}/${catalogCount} en BD · usando catálogo local`
        : 'Catálogo local GT (BD vacía)';

  return (
    <MobileSectionCard>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              completeEnough && marketComplete ? 'bg-emerald-100' : 'bg-amber-100',
            )}
          >
            {completeEnough && marketComplete ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Database className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-gray-900">Catálogo nutricional regional</h4>
            <p className="text-sm text-gray-600 mt-1">
              {coverage.totalFoods} referencias · {marketStats.productLines} líneas de mercado ·{' '}
              {marketStats.profiled} perfiladas
            </p>
            <p className="text-xs text-gray-500 mt-1">{syncLabel}</p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Macros', pct: coverage.macroPct, count: coverage.withMacros },
                { label: 'Vitaminas', pct: coverage.vitaminPct, count: coverage.withVitamins },
                { label: 'Minerales', pct: coverage.mineralPct, count: coverage.withMinerals },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-gray-50 border border-gray-100 p-2 text-center">
                  <p className="text-[10px] text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900">{item.pct}%</p>
                  <p className="text-[10px] text-gray-400">{item.count} completos</p>
                </div>
              ))}
            </div>

            {!completeEnough && coverage.foodsMissingMacros.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Referencias sin perfil macro completo
                </p>
                <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                  {coverage.foodsMissingMacros.slice(0, 5).map((name) => (
                    <li key={name} className="truncate">· {name}</li>
                  ))}
                </ul>
              </div>
            )}

            {syncStatus !== 'synced' && (
              <p className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                La comparación usa el catálogo local de {catalogCount} alimentos. Ejecuta{' '}
                <code className="text-[10px] bg-gray-100 px-1 rounded">npx tsx scripts/seed-reference-foods.ts</code>{' '}
                para sincronizar Supabase.
              </p>
            )}

            {marketComplete && completeEnough && (
              <p className="mt-3 text-xs text-emerald-700 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Inventario de mercado GT al 100% vinculado a perfiles nutricionales de referencia.
              </p>
            )}
          </div>
        </div>
      </div>
    </MobileSectionCard>
  );
}

const NutritionComparison: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [schedules, setSchedules] = useState<FeedingScheduleConfig[]>([]);
  const [sessions, setSessions] = useState<NutritionSessionRow[]>([]);
  const [foods, setFoods] = useState<NutritionFoodRow[]>([]);
  const [dbCount, setDbCount] = useState(0);
  const [catalogCount, setCatalogCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<CatalogSyncStatus>('local_only');
  const [selectedPet, setSelectedPet] = useState<string>('all');
  const [monthValue, setMonthValue] = useState(format(new Date(), 'yyyy-MM'));

  const marketStats = useMemo(() => getGuatemalaMarketInventoryStats(), []);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { start: monthStart, end: monthEnd } = getMonthInterval(monthValue);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      const [petsRes, schedulesRes, sessionsRes, catalogRes] = await Promise.all([
        supabase
          .from('pets')
          .select('id, name, species, weight, age')
          .eq('owner_id', user.id)
          .order('name'),
        supabase
          .from('pet_feeding_schedules')
          .select('id, pet_id, is_active, feeding_times, days_of_week, start_date, end_date')
          .eq('owner_id', user.id),
        supabase
          .from('nutrition_sessions')
          .select(
            'pet_id, date, food_name, quantity_grams, notes, total_calories, total_protein, total_fat, total_carbs, total_fiber, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g',
          )
          .eq('owner_id', user.id)
          .gte('date', monthStartStr)
          .lte('date', monthEndStr),
        fetchMergedNutritionFoodCatalog(),
      ]);

      if (petsRes.error) throw petsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      setPets(petsRes.data || []);
      setSchedules((schedulesRes.data || []) as FeedingScheduleConfig[]);
      setSessions((sessionsRes.data || []) as NutritionSessionRow[]);
      setFoods(catalogRes.foods);
      setDbCount(catalogRes.dbCount);
      setCatalogCount(catalogRes.catalogCount);
      setSyncStatus(catalogRes.syncStatus);
    } catch (error) {
      console.error('Error loading nutrition comparison:', error);
      toast.error('No se pudo cargar la comparación nutricional');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id, monthValue]);

  const coverage = useMemo(() => assessFoodProfileCoverage(foods), [foods]);

  const comparisons = useMemo(() => {
    return pets.map((pet) =>
      buildPetMonthlyComparison({
        pet,
        monthValue,
        schedules,
        sessions,
        foods,
      }),
    );
  }, [pets, monthValue, schedules, sessions, foods]);

  const visibleComparisons =
    selectedPet === 'all' ? comparisons : comparisons.filter((c) => c.petId === selectedPet);

  const aggregate = useMemo(() => {
    if (selectedPet !== 'all' || comparisons.length === 0) return null;

    const sumKeys = (picker: (c: MonthlyNutritionComparison) => Record<NutrientKey, number>) => {
      const totals = {} as Record<NutrientKey, number>;
      for (const def of NUTRIENT_DEFINITIONS) totals[def.key] = 0;
      for (const c of comparisons) {
        const src = picker(c);
        for (const def of NUTRIENT_DEFINITIONS) totals[def.key] += src[def.key];
      }
      return totals;
    };

    return {
      expected: sumKeys((c) => c.expected),
      actual: sumKeys((c) => c.actual),
    };
  }, [comparisons, selectedPet]);

  const monthLabel = formatNutritionMonthLabel(monthValue);

  if (loading) {
    return (
      <MobileSectionCard>
        <div className="p-6">
          <SectionLoader message="Cargando comparación mensual…" />
        </div>
      </MobileSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <MobileSectionCard>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Scale className="w-5 h-5 text-landing-aqua" />
            Objetivo vs consumo real
          </h3>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Mes</label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1 capitalize">{monthLabel}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Mascota</label>
            <Select value={selectedPet} onValueChange={setSelectedPet}>
              <SelectTrigger className="w-full min-h-[44px]">
                <SelectValue placeholder="Seleccionar mascota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las mascotas</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {formatPetOptionLabel(pet)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </MobileSectionCard>

      {aggregate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: Target,
              label: 'Objetivo total',
              value: formatNutrientValue(aggregate.expected.calories, 0),
              sub: 'kcal del mes',
              theme: landingCardThemes[1],
            },
            {
              icon: TrendingUp,
              label: 'Consumido total',
              value: formatNutrientValue(aggregate.actual.calories, 0),
              sub: 'kcal del mes',
              theme: landingCardThemes[2],
            },
            {
              icon: Scale,
              label: 'Cumplimiento',
              value:
                compliancePercent(aggregate.expected.calories, aggregate.actual.calories) != null
                  ? `${compliancePercent(aggregate.expected.calories, aggregate.actual.calories)}%`
                  : '—',
              sub: 'vs objetivo calórico',
              theme: landingCardThemes[3],
            },
            {
              icon: PawPrint,
              label: 'Mascotas',
              value: String(pets.length),
              sub: 'en comparación',
              theme: landingCardThemes[0],
            },
          ].map((card) => (
            <MobileSectionCard key={card.label}>
              <div className={cn('p-4', card.theme.bg)}>
                <card.icon className="w-5 h-5 text-landing-aqua mb-2" />
                <p className="text-xs text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-[10px] text-gray-500">{card.sub}</p>
              </div>
            </MobileSectionCard>
          ))}
        </div>
      )}

      {pets.length === 0 ? (
        <MobileSectionCard>
          <div className="p-8 text-center text-gray-500">
            <PawPrint className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <p>No tienes mascotas registradas</p>
            <p className="text-sm mt-1">Agrega una mascota para ver su comparación nutricional.</p>
          </div>
        </MobileSectionCard>
      ) : visibleComparisons.length === 0 ? (
        <MobileSectionCard>
          <div className="p-8 text-center text-gray-500">
            <Scale className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <p>No hay datos para esta selección</p>
          </div>
        </MobileSectionCard>
      ) : (
        <div className="space-y-4">
          <CrossPetChartsSection comparisons={visibleComparisons} monthLabel={monthLabel} />

          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700 px-1">Resumen por mascota</p>
            {visibleComparisons.map((comparison) => (
              <PetComparisonCard key={comparison.petId} comparison={comparison} />
            ))}
          </div>
        </div>
      )}

      <FoodProfileBanner
        coverage={coverage}
        marketStats={marketStats}
        syncStatus={syncStatus}
        dbCount={dbCount}
        catalogCount={catalogCount}
      />

      <GuatemalaFoodCatalogPanel foods={foods} />

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-gray-500 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-landing-aqua" />
            El <strong className="font-medium text-gray-700">objetivo mensual</strong> se calcula desde tus
            horarios de alimentación activos. Si no hay horarios, usamos una estimación MER según el peso de la
            mascota. El <strong className="font-medium text-gray-700">consumo real</strong> proviene de los
            registros en el diario de nutrición.
          </p>
        </div>
      </MobileSectionCard>
    </div>
  );
};

export default NutritionComparison;
