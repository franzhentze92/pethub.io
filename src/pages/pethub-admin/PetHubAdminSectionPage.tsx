import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';
import PageLoader from '@/components/PageLoader';
import PetHubAdminLayout from '@/components/pethub-admin/PetHubAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type PetHubAdminSectionConfig,
  filterPetHubAdminRows,
  getNestedValue,
} from '@/config/pethubAdminSections';
import { cn } from '@/lib/utils';

function formatCellValue(value: unknown, formatType?: 'date' | 'money' | 'badge'): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';

  if (formatType === 'date') {
    try {
      return format(new Date(String(value)), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return String(value);
    }
  }

  if (formatType === 'money') {
    const num = Number(value);
    return Number.isFinite(num) ? `Q.${num.toFixed(2)}` : String(value);
  }

  if (formatType === 'badge') {
    return (
      <Badge variant="outline" className="bg-landing-aqua/10 text-landing-aqua-dark border-landing-aqua/25">
        {String(value)}
      </Badge>
    );
  }

  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return '[objeto]';
  return String(value);
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;

  const renderValue = () => {
    if (typeof value === 'object') {
      return (
        <pre className="max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return <p className="text-sm text-gray-800 break-words">{String(value)}</p>;
  };

  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1">{renderValue()}</div>
    </div>
  );
}

function flattenRecord(row: Record<string, unknown>, prefix = ''): { label: string; value: unknown }[] {
  const entries: { label: string; value: unknown }[] = [];

  Object.entries(row).forEach(([key, value]) => {
    const label = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flattenRecord(value as Record<string, unknown>, label));
    } else {
      entries.push({ label, value });
    }
  });

  return entries;
}

interface PetHubAdminSectionPageProps {
  section: PetHubAdminSectionConfig;
}

const PetHubAdminSectionPage: React.FC<PetHubAdminSectionPageProps> = ({ section }) => {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await section.load();
      setRows(data);
    } catch (err) {
      console.error(`PetHub Admin load error (${section.id}):`, err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(
    () => filterPetHubAdminRows(rows, searchTerm, section),
    [rows, searchTerm, section],
  );

  return (
    <PetHubAdminLayout>
      <PageHeader title={section.title} description={section.description} />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total registros</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Mostrando</p>
              <p className="text-2xl font-bold text-landing-aqua-dark">{filteredRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex h-full items-center justify-end p-4">
              <Button variant="outline" onClick={() => void loadRows()} disabled={loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Actualizar
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en esta sección..."
                className="pl-10"
              />
            </div>

            {loading ? (
              <PageLoader message={`Cargando ${section.title.toLowerCase()}...`} />
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No hay registros para mostrar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      {section.columns.map((column) => (
                        <th key={column.key} className="px-3 py-3 font-semibold">
                          {column.label}
                        </th>
                      ))}
                      <th className="px-3 py-3 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr key={(row.id as string) ?? index} className="border-b border-gray-100 hover:bg-gray-50/80">
                        {section.columns.map((column) => (
                          <td key={column.key} className="max-w-[220px] truncate px-3 py-3 text-gray-700">
                            {formatCellValue(getNestedValue(row, column.key), column.format)}
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRow(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle completo</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="mt-2">
              {flattenRecord(selectedRow).map(({ label, value }) => (
                <DetailField key={label} label={label} value={value} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PetHubAdminLayout>
  );
};

export default PetHubAdminSectionPage;
