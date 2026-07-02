import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  profitThisMonth: number;
}

const AdminFinancialAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    revenueThisMonth: 0,
    expensesThisMonth: 0,
    profitThisMonth: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Load orders for revenue calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('grand_total, created_at, status')
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        toast.error('Error al cargar órdenes');
        return;
      }

      // Load delivery expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('delivery_expenses')
        .select('amount, expense_date')
        .order('expense_date', { ascending: false });

      if (expensesError) {
        console.error('Error loading expenses:', expensesError);
        toast.error('Error al cargar gastos');
        return;
      }

      // Calculate total revenue
      const totalRevenue = (ordersData || []).reduce((sum, order) => sum + (order.grand_total || 0), 0);

      // Calculate total expenses
      const totalExpenses = (expensesData || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Calculate net profit
      const netProfit = totalRevenue - totalExpenses;

      // Calculate this month's data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const ordersThisMonth = (ordersData || []).filter(order => 
        new Date(order.created_at) >= startOfMonth
      );
      const revenueThisMonth = ordersThisMonth.reduce((sum, order) => sum + (order.grand_total || 0), 0);

      const expensesThisMonth = (expensesData || []).filter(expense =>
        new Date(expense.expense_date) >= startOfMonth
      ).reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const profitThisMonth = revenueThisMonth - expensesThisMonth;

      // Calculate average order value
      const avgOrderValue = ordersData && ordersData.length > 0
        ? totalRevenue / ordersData.length
        : 0;

      setStats({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders: ordersData?.length || 0,
        avgOrderValue,
        revenueThisMonth,
        expensesThisMonth,
        profitThisMonth
      });

      // Prepare chart data (last 6 months)
      const chartData: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthOrders = (ordersData || []).filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.grand_total || 0), 0);

        const monthExpenses = (expensesData || []).filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        }).reduce((sum, expense) => sum + (expense.amount || 0), 0);

        chartData.push({
          month: date.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses
        });
      }

      setRevenueData(chartData);
      setExpensesData(chartData);

    } catch (error: any) {
      console.error('Error loading financial data:', error);
      toast.error('Error al cargar datos financieros', {
        description: error.message || 'No se pudieron cargar los datos'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-16">
        <PageHeader 
          title="Análisis Financiero" 
          description="Análisis completo de ingresos, gastos y ganancias"
        />
        
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Q{stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">De {stats.totalOrders} órdenes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">Q{stats.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Gastos de delivery</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  stats.netProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  Q{stats.netProfit.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Ingresos - Gastos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">Q{stats.avgOrderValue.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Por orden</p>
              </CardContent>
            </Card>
          </div>

          {/* This Month Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Este Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ingresos:</span>
                  <span className="font-semibold text-green-600">Q{stats.revenueThisMonth.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gastos:</span>
                  <span className="font-semibold text-red-600">Q{stats.expensesThisMonth.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Ganancia:</span>
                  <span className={cn(
                    "font-bold text-lg",
                    stats.profitThisMonth >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    Q{stats.profitThisMonth.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tendencias (Últimos 6 Meses)</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFinancialData}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SectionLoader />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Ingresos" />
                      <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Gastos" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profit Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Ganancia Neta por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SectionLoader />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit" fill="#3b82f6" name="Ganancia Neta" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminFinancialAnalysisPage;

