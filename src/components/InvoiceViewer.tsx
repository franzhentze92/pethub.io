import React, { useState, useEffect } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, FileText, MapPin, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { landingBadge, landingBtnSolid } from '@/lib/landingTheme';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_city: string | null;
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  status: string;
  issued_at: string;
  paid_at: string | null;
  notes: string | null;
}

interface OrderItem {
  id: string;
  item_name: string;
  item_description?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency: string;
  provider_name: string;
}

interface InvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const dialogShellClass =
  'w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border-landing-aqua/20 shadow-xl';
const dialogHeaderClass =
  'shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-landing-aqua/10 bg-landing-aqua/10';
const outlineBtnClass = 'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10';

const getPaymentMethodName = (method: string) => {
  const methods: Record<string, string> = {
    card: 'Tarjeta de Crédito/Débito',
    cash: 'Efectivo',
    transfer: 'Transferencia Bancaria',
  };
  return methods[method] || method;
};

const getPaymentStatusName = (status: string) => {
  const statuses: Record<string, string> = {
    completed: 'Completado',
    pending: 'Pendiente',
    failed: 'Fallido',
  };
  return statuses[status] || status;
};

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ isOpen, onClose, orderId }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchInvoice();
    }
  }, [isOpen, orderId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        setInvoice(null);
      } else {
        setInvoice(invoiceData ?? null);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        setOrderItems([]);
      } else {
        setOrderItems(itemsData || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching invoice:', error);
      setInvoice(null);
      setOrderItems([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return `${currency === 'GTQ' ? 'Q.' : '$'}${amount.toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={dialogShellClass}>
          <DialogHeader className={dialogHeaderClass}>
            <DialogTitle>Cargando factura</DialogTitle>
            <DialogDescription>Obteniendo información de la factura…</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <LandingSpinner size="md" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={dialogShellClass}>
          <DialogHeader className={dialogHeaderClass}>
            <DialogTitle>Factura no encontrada</DialogTitle>
            <DialogDescription>No se encontró una factura para esta orden.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-landing-aqua/10 text-landing-aqua-dark">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-gray-600">Esta orden no tiene factura asociada todavía.</p>
            <Button onClick={onClose} variant="outline" className={outlineBtnClass}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(dialogShellClass, 'no-print')}>
        <DialogHeader className={dialogHeaderClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-base sm:text-lg leading-snug break-words">
                Factura {invoice.invoice_number}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Orden #{orderId.substring(0, 8)}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button onClick={handleDownload} variant="outline" size="sm" className={outlineBtnClass}>
                <Download className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Descargar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className={outlineBtnClass}>
                <Printer className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5" id="invoice-content">
          {/* Brand header */}
          <div className="rounded-2xl bg-landing-aqua p-4 sm:p-5 text-white mb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">PetHub</p>
                <p className="text-sm text-white/90 mt-1">Plataforma integral para el cuidado de mascotas</p>
                <p className="text-xs text-white/80 mt-2">Latinoamérica · info@pethub.gt</p>
              </div>
              <div className="sm:text-right shrink-0">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20 mb-2">
                  FACTURA
                </Badge>
                <p className="text-xs sm:text-sm text-white/95 break-all">{invoice.invoice_number}</p>
                <p className="text-xs text-white/85 mt-1">
                  {format(new Date(invoice.issued_at), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Client + meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-landing-aqua/15 bg-landing-aqua/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-landing-aqua-dark mb-2">
                Facturar a
              </p>
              <p className="font-semibold text-gray-900">{invoice.client_name}</p>
              {invoice.client_email && (
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-landing-aqua-dark" />
                  {invoice.client_email}
                </p>
              )}
              {invoice.client_phone && (
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-landing-aqua-dark" />
                  {invoice.client_phone}
                </p>
              )}
              {(invoice.client_address || invoice.client_city) && (
                <p className="text-sm text-gray-600 mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-landing-aqua-dark mt-0.5" />
                  <span>
                    {invoice.client_address}
                    {invoice.client_city ? `, ${invoice.client_city}` : ''}
                  </span>
                </p>
              )}
            </div>
            <div className="rounded-xl border border-landing-aqua/15 bg-white p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Número</span>
                <span className="font-medium text-gray-900 text-right break-all">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-900 text-right">
                  {format(new Date(invoice.issued_at), "dd/MM/yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Orden</span>
                <span className="font-medium text-gray-900 text-right">#{orderId.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between gap-2 items-center">
                <span className="text-gray-500">Estado</span>
                <Badge className={cn(landingBadge, 'text-[10px]')}>
                  {getPaymentStatusName(invoice.payment_status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Items — cards on mobile */}
          <div className="space-y-2 md:hidden mb-4">
            {orderItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-landing-aqua/15 bg-white p-3 shadow-sm"
              >
                <p className="font-medium text-gray-900 text-sm leading-snug">{item.item_name}</p>
                {item.item_description && (
                  <p className="text-xs text-gray-500 mt-1">{item.item_description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Proveedor: {item.provider_name}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">
                    {item.quantity} × {formatPrice(item.unit_price, item.currency)}
                  </span>
                  <span className="font-semibold text-landing-aqua-dark">
                    {formatPrice(item.total_price, item.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Items — table on desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-landing-aqua/15 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-landing-aqua/10">
                <tr>
                  <th className="text-left p-3 font-semibold text-landing-aqua-dark">Producto / Servicio</th>
                  <th className="text-right p-3 font-semibold text-landing-aqua-dark w-20">Cant.</th>
                  <th className="text-right p-3 font-semibold text-landing-aqua-dark w-28">P. unit.</th>
                  <th className="text-right p-3 font-semibold text-landing-aqua-dark w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id} className="border-t border-landing-aqua/10">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      {item.item_description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.item_description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Proveedor: {item.provider_name}</p>
                    </td>
                    <td className="p-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="p-3 text-right text-gray-700">
                      {formatPrice(item.unit_price, item.currency)}
                    </td>
                    <td className="p-3 text-right font-semibold text-landing-aqua-dark">
                      {formatPrice(item.total_price, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-landing-aqua/15 bg-landing-aqua/5 p-4 ml-auto max-w-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>{formatPrice(invoice.delivery_fee, invoice.currency)}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos</span>
                  <span>{formatPrice(invoice.tax_amount, invoice.currency)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Descuento</span>
                  <span>-{formatPrice(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-landing-aqua/20 text-base font-bold text-landing-aqua-dark">
                <span>Total</span>
                <span>{formatPrice(invoice.total_amount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="mt-4 rounded-xl border border-landing-aqua/15 bg-white p-4 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-800">Método de pago:</span>{' '}
              {getPaymentMethodName(invoice.payment_method)}
            </p>
            <p>
              <span className="font-medium text-gray-800">Estado de pago:</span>{' '}
              {getPaymentStatusName(invoice.payment_status)}
            </p>
            {invoice.paid_at && (
              <p>
                <span className="font-medium text-gray-800">Fecha de pago:</span>{' '}
                {format(new Date(invoice.paid_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </p>
            )}
            {invoice.notes && (
              <p className="pt-2 border-t border-gray-100 mt-2">
                <span className="font-medium text-gray-800">Notas:</span> {invoice.notes}
              </p>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 pb-2">
            Gracias por tu compra · info@pethub.gt
          </p>
        </div>

        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-landing-aqua/10 bg-gray-50/80 no-print">
          <Button onClick={onClose} className={cn(landingBtnSolid, 'w-full sm:w-auto border-0')}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewer;
