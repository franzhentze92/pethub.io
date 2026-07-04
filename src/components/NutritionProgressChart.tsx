import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingChartColors } from '@/lib/landingTheme';

interface NutritionSession {
  id: string;
  pet_id: string;
  pet_name: string;
  date: string;
  meal_type: string;
  food_name: string;
  food_category: string;
  quantity_grams: number;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  total_ash?: number;
  total_moisture?: number;
  notes?: string;
  feeding_time?: string;
  created_at: string;
}

interface NutritionProgressChartProps {
  sessions: NutritionSession[];
}

function ChartShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <MobileSectionCard>
      <div className="p-4 sm:p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 sm:h-80 w-full min-w-0">{children}</div>
        {footer}
      </div>
    </MobileSectionCard>
  );
}

const NutritionProgressChart: React.FC<NutritionProgressChartProps> = ({ sessions }) => {
  const monthlyChartData = useMemo(() => {
    const monthly = sessions.reduce(
      (acc, session) => {
        const date = new Date(`${session.date}T12:00:00`);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' });

        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthLabel,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
            meals: 0,
          };
        }
        acc[monthKey].calories += session.total_calories || 0;
        acc[monthKey].protein += session.total_protein || 0;
        acc[monthKey].fat += session.total_fat || 0;
        acc[monthKey].carbs += session.total_carbs || 0;
        acc[monthKey].fiber += session.total_fiber || 0;
        acc[monthKey].meals += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          monthLabel: string;
          calories: number;
          protein: number;
          fat: number;
          carbs: number;
          fiber: number;
          meals: number;
        }
      >,
    );

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        calories: Math.round(value.calories),
        protein: Math.round(value.protein),
        fat: Math.round(value.fat),
        carbs: Math.round(value.carbs),
        fiber: Math.round(value.fiber),
      }));
  }, [sessions]);

  const weeklyChartData = useMemo(() => {
    const weekly = sessions.reduce(
      (acc, session) => {
        const date = new Date(`${session.date}T12:00:00`);
        const day = date.getDay();
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - day);
        const weekKey = weekStart.toISOString().split('T')[0];
        const weekLabel = weekStart.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });

        if (!acc[weekKey]) {
          acc[weekKey] = {
            weekLabel,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            meals: 0,
          };
        }
        acc[weekKey].calories += session.total_calories || 0;
        acc[weekKey].protein += session.total_protein || 0;
        acc[weekKey].fat += session.total_fat || 0;
        acc[weekKey].carbs += session.total_carbs || 0;
        acc[weekKey].meals += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          weekLabel: string;
          calories: number;
          protein: number;
          fat: number;
          carbs: number;
          meals: number;
        }
      >,
    );

    return Object.entries(weekly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, value]) => ({
        ...value,
        protein: Math.round(value.protein),
        fat: Math.round(value.fat),
        carbs: Math.round(value.carbs),
      }));
  }, [sessions]);

  const mealTypeStats = useMemo(() => {
    const total = sessions.length;
    return (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
      const count = sessions.filter((s) => s.meal_type === mealType).length;
      const label =
        mealType === 'breakfast'
          ? 'Desayuno'
          : mealType === 'lunch'
            ? 'Almuerzo'
            : mealType === 'dinner'
              ? 'Cena'
              : 'Merienda';
      return {
        mealType,
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }, [sessions]);

  const categoryStats = useMemo(() => {
    const counts = sessions.reduce(
      (acc, session) => {
        const category = session.food_category || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const total = sessions.length;
    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <MobileSectionCard>
        <div className="p-6 text-center text-gray-500">
          <p>No hay datos de nutrición para mostrar</p>
        </div>
      </MobileSectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <ChartShell
        title="Tendencia de calorías mensuales"
        footer={
          <p className="mt-3 text-center text-xs text-gray-500">
            {monthlyChartData.length}{' '}
            {monthlyChartData.length === 1 ? 'mes con registros' : 'meses con registros'}
          </p>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              formatter={(value) => [`${value} cal`, 'Calorías']}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="calories"
              stroke={landingChartColors.mint}
              strokeWidth={2.5}
              dot={{ fill: landingChartColors.mint, strokeWidth: 2, r: 4 }}
              name="Calorías"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Tendencias semanales (macronutrientes)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={36} unit="g" />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  protein: 'Proteína',
                  fat: 'Grasa',
                  carbs: 'Carbohidratos',
                };
                return [`${value} g`, labels[String(name)] ?? String(name)];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="protein"
              stroke={landingChartColors.mango}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Proteína"
            />
            <Line
              type="monotone"
              dataKey="fat"
              stroke={landingChartColors.tropical}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Grasa"
            />
            <Line
              type="monotone"
              dataKey="carbs"
              stroke={landingChartColors.aqua}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Carbohidratos"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Tendencia de fibra mensual">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={40} unit="g" />
            <Tooltip formatter={(value) => [`${value} g`, 'Fibra']} />
            <Line
              type="monotone"
              dataKey="fiber"
              stroke={landingChartColors.aqua}
              strokeWidth={2.5}
              dot={{ fill: landingChartColors.aqua, r: 4 }}
              name="Fibra"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Distribución por tipo de comida</h3>
          <div className="grid grid-cols-2 gap-3">
            {mealTypeStats.map((item) => (
              <div key={item.mealType} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                <div className="text-2xl mb-1">
                  {item.mealType === 'breakfast'
                    ? '🌅'
                    : item.mealType === 'lunch'
                      ? '🌞'
                      : item.mealType === 'dinner'
                        ? '🌙'
                        : '🍪'}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                <p className="text-xs text-gray-600">{item.count} comidas</p>
                <p className="text-xs text-gray-500">{item.percentage.toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      </MobileSectionCard>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Distribución por categoría</h3>
          <div className="space-y-3">
            {categoryStats.map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-600 capitalize truncate">{item.category.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-landing-aqua"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-14 text-xs text-gray-600 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </MobileSectionCard>
    </div>
  );
};

export default NutritionProgressChart;
