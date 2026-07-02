import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { cn } from '@/lib/utils';
import {
  GUATEMALA_PET_FOOD_BRANDS,
  GUATEMALA_PET_FOOD_PRODUCT_LINES,
  getGuatemalaMarketInventoryStats,
  type GtFoodCategory,
  type GtProfileStatus,
} from '@/data/guatemalaPetFoodMarketInventory';
import { foodDisplayLabel } from '@/utils/nutritionSession';
import type { NutritionFoodRow } from '@/utils/nutritionFoodCatalog';
import { Search, Store, Package, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_LABELS: Record<GtFoodCategory, string> = {
  dry_food: 'Seco',
  wet_food: 'Húmedo',
  treat: 'Galletas/snacks',
  dental_chew: 'Dental',
  rawhide: 'Carnazas',
  topper: 'Toppers',
  supplement: 'Suplemento',
  other_pet: 'Otros',
};

const STATUS_LABELS: Record<GtProfileStatus, string> = {
  profiled: 'Perfilado',
  queued: 'En cola',
  needs_research: 'Investigar',
};

const STATUS_STYLES: Record<GtProfileStatus, string> = {
  profiled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  queued: 'border-amber-200 bg-amber-50 text-amber-700',
  needs_research: 'border-gray-200 bg-gray-50 text-gray-600',
};

interface GuatemalaFoodCatalogPanelProps {
  foods?: NutritionFoodRow[];
  defaultExpanded?: boolean;
}

export function GuatemalaFoodCatalogPanel({
  foods = [],
  defaultExpanded = false,
}: GuatemalaFoodCatalogPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<GtFoodCategory | 'all'>('all');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'Dog' | 'Cat'>('all');

  const marketStats = useMemo(() => getGuatemalaMarketInventoryStats(), []);
  const brandById = useMemo(
    () => new Map(GUATEMALA_PET_FOOD_BRANDS.map((brand) => [brand.id, brand])),
    [],
  );
  const foodById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);

  const filteredLines = useMemo(() => {
    const needle = search
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((line) => {
      if (categoryFilter !== 'all' && line.category !== categoryFilter) return false;
      if (speciesFilter !== 'all' && line.species !== speciesFilter && line.species !== 'Both') {
        return false;
      }

      if (!needle) return true;

      const brand = brandById.get(line.brandId)?.name ?? line.brandId;
      const haystack = `${brand} ${line.name} ${line.variants?.join(' ') ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, categoryFilter, speciesFilter, brandById]);

  const topCategories = useMemo(() => {
    return Object.entries(marketStats.byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [marketStats.byCategory]);

  return (
    <MobileSectionCard>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-landing-aqua/10 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-landing-aqua" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900">Mercado regional</h4>
            <p className="text-sm text-gray-600 truncate">
              {marketStats.brands} marcas · {marketStats.productLines} líneas ·{' '}
              {marketStats.profiled} perfiladas
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Marcas', value: marketStats.brands },
            { label: 'Líneas', value: marketStats.productLines },
            { label: 'Perfiladas', value: marketStats.profiled },
            { label: 'Referencias', value: foods.length },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 text-center">
              <p className="text-[10px] text-gray-500">{item.label}</p>
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {topCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topCategories.map(([category, count]) => (
              <Badge key={category} variant="secondary" className="text-[10px]">
                {CATEGORY_LABELS[category as GtFoodCategory] ?? category}: {count}
              </Badge>
            ))}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar marca o producto…"
                className="pl-9 min-h-[44px]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as GtFoodCategory | 'all')}
                className="min-h-[40px] rounded-lg border border-gray-200 bg-white px-2 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value as 'all' | 'Dog' | 'Cat')}
                className="min-h-[40px] rounded-lg border border-gray-200 bg-white px-2 text-sm"
              >
                <option value="all">Perro y gato</option>
                <option value="Dog">Perro</option>
                <option value="Cat">Gato</option>
              </select>
            </div>

            <p className="text-xs text-gray-500">
              Mostrando {filteredLines.length} de {GUATEMALA_PET_FOOD_PRODUCT_LINES.length} líneas
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filteredLines.map((line) => {
                const brand = brandById.get(line.brandId);
                const refFood = line.referenceFoodId ? foodById.get(line.referenceFoodId) : undefined;

                return (
                  <div
                    key={line.id}
                    className="rounded-xl border border-gray-100 bg-white/80 p-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {brand?.name ?? line.brandId} — {line.name}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[line.category]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', STATUS_STYLES[line.profileStatus])}
                        >
                          {STATUS_LABELS[line.profileStatus]}
                        </Badge>
                      </div>
                      {refFood && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          Perfil: {foodDisplayLabel(refFood)}
                          {refFood.calories_per_100g != null
                            ? ` · ${Math.round(refFood.calories_per_100g)} kcal/100g`
                            : ''}
                        </p>
                      )}
                      {line.notes && (
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{line.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MobileSectionCard>
  );
}
