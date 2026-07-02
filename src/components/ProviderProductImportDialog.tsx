import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Link2, Loader2, Package, ExternalLink, Pencil } from 'lucide-react';
import { importProductFromUrl, type ImportedProductData } from '@/ai/llm/importProductUrl';
import { mapImportedToProductDraft } from '@/utils/productImport';
import type { ProviderProduct } from '@/hooks/useProvider';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';

const CATEGORY_LABELS: Record<string, string> = {
  alimentos: 'Alimentos',
  juguetes: 'Juguetes',
  accesorios: 'Accesorios',
  higiene: 'Higiene',
  medicamentos: 'Medicamentos',
  ropa: 'Ropa',
  camas: 'Camas',
  transporte: 'Transporte',
  otro: 'Otro',
};

interface ProviderProductImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (product: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onEditDraft?: (product: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => void;
}

const ProviderProductImportDialog: React.FC<ProviderProductImportDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  onEditDraft,
}) => {
  const [url, setUrl] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ImportedProductData | null>(null);

  const reset = () => {
    setUrl('');
    setStockQuantity('0');
    setImporting(false);
    setCreating(false);
    setError(null);
    setSourceUrl(null);
    setExtracted(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleExtract = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Pega la URL del producto');
      return;
    }

    setImporting(true);
    setError(null);
    setExtracted(null);

    try {
      const result = await importProductFromUrl(trimmed);
      if (!result.product) {
        throw new Error('No se pudo extraer información del producto');
      }
      setExtracted(result.product);
      setSourceUrl(result.source_url ?? trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el producto');
    } finally {
      setImporting(false);
    }
  };

  const buildDraft = () => {
    if (!extracted) return null;
    const stock = Math.max(0, parseInt(stockQuantity, 10) || 0);
    return mapImportedToProductDraft(extracted, stock);
  };

  const handleCreate = async () => {
    const draft = buildDraft();
    if (!draft) return;

    setCreating(true);
    setError(null);
    try {
      await onCreate(draft);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el producto');
    } finally {
      setCreating(false);
    }
  };

  const handleEditDraft = () => {
    const draft = buildDraft();
    if (!draft || !onEditDraft) return;
    onEditDraft(draft);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-landing-aqua-dark" />
            Importar producto con IA
          </DialogTitle>
          <DialogDescription>
            Pega el link de un producto de otra tienda online y la IA extraerá nombre,
            precio, descripción, marca e imagen para crearlo en tu catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="import-url">URL del producto</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="import-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://tu-tienda.com/producto/ejemplo"
                  className="pl-9"
                  disabled={importing || creating}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                />
              </div>
              <Button
                type="button"
                onClick={handleExtract}
                disabled={importing || creating || !url.trim()}
                className={cn(landingBtnPrimary, 'shrink-0 border-0')}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extraer
                  </>
                )}
              </Button>
            </div>
          </div>

          {extracted && (
            <div className="rounded-xl border border-landing-aqua/20 bg-gradient-to-br from-landing-aqua/5 to-landing-mint/5 p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white shrink-0 ring-1 ring-gray-100">
                  {extracted.product_image_url ? (
                    <img
                      src={extracted.product_image_url}
                      alt={extracted.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-snug">{extracted.product_name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline">
                      {CATEGORY_LABELS[extracted.product_category] ?? extracted.product_category}
                    </Badge>
                    {extracted.brand && <Badge variant="secondary">{extracted.brand}</Badge>}
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-2">
                    Q.{Number(extracted.price).toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3">{extracted.description}</p>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-landing-aqua-dark hover:underline"
                >
                  Ver página original
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <div className="space-y-2 pt-1">
                <Label htmlFor="import-stock">Stock inicial</Label>
                <Input
                  id="import-stock"
                  type="number"
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  disabled={creating}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={importing || creating}>
            Cancelar
          </Button>
          {extracted && onEditDraft && (
            <Button type="button" variant="outline" onClick={handleEditDraft} disabled={creating}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar antes de crear
            </Button>
          )}
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!extracted || creating || importing}
            className={cn(landingBtnPrimary, 'border-0')}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear producto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderProductImportDialog;
