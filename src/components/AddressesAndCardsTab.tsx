import React, { useState, useEffect } from 'react';
import { MapPin, CreditCard, Plus, Edit, Trash2, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import LocationPicker from './LocationPicker';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { MobileSectionCard } from './mobile/MobileUi';
import { MobileFormDialog, MobileFormActions } from './mobile/MobileFormDialog';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';

interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  delivery_instructions: string | null;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

interface PaymentCard {
  id: string;
  user_id: string;
  label: string;
  card_holder_name: string;
  card_number_last_four: string;
  card_type: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressesAndCardsTabProps {
  userId: string;
  section?: 'addresses' | 'cards';
}

const AddressesAndCardsTab: React.FC<AddressesAndCardsTabProps> = ({ userId, section = 'addresses' }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [editingCard, setEditingCard] = useState<PaymentCard | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  const addressFormId = 'address-form';
  const cardFormId = 'card-form';
  const guidedTour = useBlueprintGuidedTourOptional();

  const [addressForm, setAddressForm] = useState({
    label: '',
    full_name: '',
    phone: '',
    address: '',
    city: '',
    delivery_instructions: '',
    is_default: false,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  });

  const [cardForm, setCardForm] = useState({
    label: '',
    card_holder_name: '',
    card_number: '',
    card_type: '',
    expiry_month: '',
    expiry_year: '',
    is_default: false
  });

  useEffect(() => {
    if (userId) {
      fetchAddresses();
      fetchCards();
    }
  }, [userId]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('client_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast.error('Error al cargar direcciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      toast.error('Error al cargar tarjetas');
    }
  };

  const handleOpenAddressModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        label: address.label,
        full_name: address.full_name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        delivery_instructions: address.delivery_instructions || '',
        is_default: address.is_default,
        latitude: address.latitude ?? undefined,
        longitude: address.longitude ?? undefined
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        label: '',
        full_name: '',
        phone: '',
        address: '',
        city: '',
        delivery_instructions: '',
        is_default: false,
        latitude: undefined,
        longitude: undefined
      });
    }
    setAddressModalOpen(true);
  };

  const handleOpenCardModal = (card?: PaymentCard) => {
    if (card) {
      setEditingCard(card);
      setCardForm({
        label: card.label,
        card_holder_name: card.card_holder_name,
        card_number: '',
        card_type: card.card_type,
        expiry_month: card.expiry_month.toString().padStart(2, '0'),
        expiry_year: card.expiry_year.toString(),
        is_default: card.is_default
      });
    } else {
      setEditingCard(null);
      setCardForm({
        label: '',
        card_holder_name: '',
        card_number: '',
        card_type: '',
        expiry_month: '',
        expiry_year: '',
        is_default: false
      });
    }
    setCardModalOpen(true);
  };

  const handleSaveAddress = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!addressForm.label || !addressForm.full_name || !addressForm.phone || !addressForm.address || !addressForm.city) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setSavingAddress(true);
    try {
      // If setting as default, unset other defaults first
      if (addressForm.is_default) {
        await supabase
          .from('client_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      if (editingAddress) {
        const { error } = await supabase
          .from('client_addresses')
          .update({
            label: addressForm.label,
            full_name: addressForm.full_name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            delivery_instructions: addressForm.delivery_instructions || null,
            is_default: addressForm.is_default,
            latitude: addressForm.latitude !== undefined ? addressForm.latitude : null,
            longitude: addressForm.longitude !== undefined ? addressForm.longitude : null
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
        toast.success('Dirección actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('client_addresses')
          .insert({
            user_id: userId,
            label: addressForm.label,
            full_name: addressForm.full_name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            delivery_instructions: addressForm.delivery_instructions || null,
            is_default: addressForm.is_default,
            latitude: addressForm.latitude !== undefined ? addressForm.latitude : null,
            longitude: addressForm.longitude !== undefined ? addressForm.longitude : null
          });

        if (error) throw error;
        toast.success('Dirección agregada exitosamente');
      }

      setAddressModalOpen(false);
      fetchAddresses();
      guidedTour?.notifySectionSaved('addresses');
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error('Error al guardar dirección');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveCard = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cardForm.label || !cardForm.card_holder_name || !cardForm.card_type || !cardForm.expiry_month || !cardForm.expiry_year) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const cardNumberDigits = cardForm.card_number.replace(/\D/g, '');
    const isUpdatingExistingCard = Boolean(editingCard);
    const hasNewCardNumber = cardNumberDigits.length > 0;

    if (!isUpdatingExistingCard && cardNumberDigits.length !== 16) {
      toast.error('El número de tarjeta debe tener 16 dígitos');
      return;
    }

    if (isUpdatingExistingCard && hasNewCardNumber && cardNumberDigits.length !== 16) {
      toast.error('El número de tarjeta debe tener 16 dígitos');
      return;
    }

    const expiryMonth = parseInt(cardForm.expiry_month);
    const expiryYear = parseInt(cardForm.expiry_year);

    if (expiryMonth < 1 || expiryMonth > 12) {
      toast.error('Mes de expiración inválido');
      return;
    }

    if (expiryYear < new Date().getFullYear()) {
      toast.error('Año de expiración inválido');
      return;
    }

    setSavingCard(true);
    try {
      // If setting as default, unset other defaults first
      if (cardForm.is_default) {
        await supabase
          .from('payment_cards')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      const lastFour = hasNewCardNumber
        ? cardNumberDigits.slice(-4)
        : editingCard!.card_number_last_four;

      if (editingCard) {
        const updatePayload: Record<string, unknown> = {
          label: cardForm.label,
          card_holder_name: cardForm.card_holder_name,
          card_type: cardForm.card_type,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          is_default: cardForm.is_default,
        };

        if (hasNewCardNumber) {
          updatePayload.card_number_last_four = lastFour;
        }

        const { error } = await supabase
          .from('payment_cards')
          .update(updatePayload)
          .eq('id', editingCard.id);

        if (error) throw error;
        toast.success('Tarjeta actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('payment_cards')
          .insert({
            user_id: userId,
            label: cardForm.label,
            card_holder_name: cardForm.card_holder_name,
            card_number_last_four: lastFour,
            card_type: cardForm.card_type,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            is_default: cardForm.is_default
          });

        if (error) throw error;
        toast.success('Tarjeta agregada exitosamente');
      }

      setCardModalOpen(false);
      fetchCards();
      guidedTour?.notifySectionSaved('payment-cards');
    } catch (error: any) {
      console.error('Error saving card:', error);
      toast.error('Error al guardar tarjeta');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) return;

    try {
      const { error } = await supabase
        .from('client_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Dirección eliminada exitosamente');
      fetchAddresses();
    } catch (error: any) {
      console.error('Error deleting address:', error);
      toast.error('Error al eliminar dirección');
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) return;

    try {
      const { error } = await supabase
        .from('payment_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tarjeta eliminada exitosamente');
      fetchCards();
    } catch (error: any) {
      console.error('Error deleting card:', error);
      toast.error('Error al eliminar tarjeta');
    }
  };

  const formatCardNumber = (cardNumber: string) => {
    // Remove all spaces
    const digits = cardNumber.replace(/\s/g, '');
    // Add space every 4 digits
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').slice(0, 16);
    setCardForm(prev => ({ ...prev, card_number: formatCardNumber(value) }));
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Addresses */}
      {section === 'addresses' && (
      <MobileSectionCard>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-landing-mango to-landing-tropical flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Direcciones</h3>
              <p className="text-xs text-gray-500">{addresses.length} guardada{addresses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            data-blueprint-guided="add-address"
            onClick={() => handleOpenAddressModal()}
            className={`w-full sm:w-auto min-h-[44px] shrink-0 ${landingBtnPrimary}`}
          >
            <Plus size={18} className="mr-2" />
            Agregar
          </Button>
        </div>

        <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto text-landing-mango/40 mb-3" />
            <p className="text-sm text-gray-600 mb-4">No tienes direcciones guardadas</p>
            <Button data-blueprint-guided="add-address" onClick={() => handleOpenAddressModal()} variant="outline" className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark">
              Agregar primera dirección
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`rounded-xl border p-4 ${
                  address.is_default ? 'border-landing-mango/50 bg-landing-mango/5' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h4 className="font-semibold text-gray-900">{address.label}</h4>
                    {address.is_default && (
                      <Badge className="bg-landing-mango/20 text-landing-mango-dark border-landing-mango/30 text-xs">
                        <Star size={10} className="mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-landing-aqua-dark" onClick={() => handleOpenAddressModal(address)}>
                      <Edit size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => handleDeleteAddress(address.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">{address.full_name}</p>
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-landing-aqua-dark" />
                    {address.phone}
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-landing-mango-dark" />
                    <span>{address.address}, {address.city}</span>
                  </p>
                  {address.delivery_instructions && (
                    <p className="text-xs text-gray-500 italic pt-1 border-t border-gray-100 mt-2">
                      {address.delivery_instructions}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </MobileSectionCard>
      )}

      {/* Payment cards */}
      {section === 'cards' && (
      <MobileSectionCard>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Tarjetas</h3>
              <p className="text-xs text-gray-500">{cards.length} guardada{cards.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            data-blueprint-guided="add-card"
            onClick={() => handleOpenCardModal()}
            className={`w-full sm:w-auto min-h-[44px] shrink-0 bg-gradient-to-r from-landing-aqua to-landing-mint hover:from-landing-aqua-dark hover:to-landing-mint-dark text-white`}
          >
            <Plus size={18} className="mr-2" />
            Agregar
          </Button>
        </div>

        <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto text-landing-aqua/40 mb-3" />
            <p className="text-sm text-gray-600 mb-4">No tienes tarjetas guardadas</p>
            <Button data-blueprint-guided="add-card" onClick={() => handleOpenCardModal()} variant="outline" className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark">
              Agregar primera tarjeta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl border p-4 ${
                  card.is_default ? 'border-landing-aqua/50 bg-landing-aqua/5' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{card.label}</h4>
                    {card.is_default && (
                      <Badge className="bg-landing-aqua/20 text-landing-aqua-dark border-landing-aqua/30 text-xs">
                        <Star size={10} className="mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-landing-aqua-dark" onClick={() => handleOpenCardModal(card)}>
                      <Edit size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => handleDeleteCard(card.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                <p className="font-mono text-lg font-semibold text-gray-800 tracking-wider">
                  •••• •••• •••• {card.card_number_last_four}
                </p>
                <p className="text-sm text-gray-600 mt-1">{card.card_holder_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    Exp. {card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year}
                  </span>
                  <Badge variant="outline" className="text-xs border-landing-aqua/20">
                    {card.card_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </MobileSectionCard>
      )}

      {/* Address Modal */}
      <MobileFormDialog
        open={addressModalOpen}
        onOpenChange={setAddressModalOpen}
        title={editingAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}
        description="Datos de entrega para tus pedidos"
        footer={
          <MobileFormActions
            formId={addressFormId}
            onCancel={() => setAddressModalOpen(false)}
            submitLabel={editingAddress ? 'Actualizar' : 'Guardar'}
            loading={savingAddress}
            submitDisabled={savingAddress}
          />
        }
      >
        <form id={addressFormId} onSubmit={handleSaveAddress} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address-label">Etiqueta *</Label>
            <Input
              id="address-label"
              value={addressForm.label}
              onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Ej: Casa, Trabajo, Oficina"
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-full-name">Nombre Completo *</Label>
            <Input
              id="address-full-name"
              value={addressForm.full_name}
              onChange={(e) => setAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Nombre completo"
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-phone">Teléfono *</Label>
            <Input
              id="address-phone"
              type="tel"
              inputMode="tel"
              value={addressForm.phone}
              onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+502 1234-5678"
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-street">Dirección *</Label>
            <Textarea
              id="address-street"
              value={addressForm.address}
              onChange={(e) => setAddressForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección completa"
              rows={3}
              className="min-h-[88px] resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-city">Ciudad *</Label>
            <Input
              id="address-city"
              value={addressForm.city}
              onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Ciudad"
              className="min-h-[44px]"
              required
            />
          </div>

          <LocationPicker
            mode="delivery"
            latitude={addressForm.latitude}
            longitude={addressForm.longitude}
            onLocationSelect={(lat, lng) => {
              setAddressForm(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng
              }));
            }}
            address={addressForm.address}
            city={addressForm.city}
          />

          <div className="space-y-2">
            <Label htmlFor="address-instructions">Instrucciones de Entrega</Label>
            <Textarea
              id="address-instructions"
              value={addressForm.delivery_instructions}
              onChange={(e) => setAddressForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
              placeholder="Instrucciones especiales para la entrega..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-3 min-h-[44px] p-3 rounded-xl bg-landing-mint/5 border border-landing-mint/20">
            <Checkbox
              id="address-default"
              checked={addressForm.is_default}
              onCheckedChange={(checked) => setAddressForm(prev => ({ ...prev, is_default: checked as boolean }))}
            />
            <Label htmlFor="address-default" className="cursor-pointer text-sm leading-snug">
              Establecer como dirección predeterminada
            </Label>
          </div>
        </form>
      </MobileFormDialog>

      {/* Card Modal */}
      <MobileFormDialog
        open={cardModalOpen}
        onOpenChange={setCardModalOpen}
        title={editingCard ? 'Editar Tarjeta' : 'Agregar Nueva Tarjeta'}
        description="Método de pago para tus compras"
        footer={
          <MobileFormActions
            formId={cardFormId}
            onCancel={() => setCardModalOpen(false)}
            submitLabel={editingCard ? 'Actualizar' : 'Guardar'}
            loading={savingCard}
            submitDisabled={savingCard}
          />
        }
      >
        <form id={cardFormId} onSubmit={handleSaveCard} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-label">Etiqueta *</Label>
            <Input
              id="card-label"
              value={cardForm.label}
              onChange={(e) => setCardForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Ej: Tarjeta Principal, Tarjeta de Trabajo"
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-holder-name">Nombre del Titular *</Label>
            <Input
              id="card-holder-name"
              value={cardForm.card_holder_name}
              onChange={(e) => setCardForm(prev => ({ ...prev, card_holder_name: e.target.value }))}
              placeholder="Nombre como aparece en la tarjeta"
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-number">
              Número de Tarjeta{editingCard ? '' : ' *'}
            </Label>
            {editingCard && (
              <p className="text-xs text-gray-500">
                Tarjeta actual: •••• •••• •••• {editingCard.card_number_last_four}. Deja vacío si no la cambias.
              </p>
            )}
            <Input
              id="card-number"
              value={cardForm.card_number}
              onChange={handleCardNumberChange}
              placeholder={editingCard ? 'Nuevo número (opcional)' : '1234 5678 9012 3456'}
              inputMode="numeric"
              maxLength={19}
              className="min-h-[44px]"
              required={!editingCard}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label htmlFor="card-type">Tipo *</Label>
              <Select value={cardForm.card_type} onValueChange={(value) => setCardForm(prev => ({ ...prev, card_type: value }))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Mastercard">Mastercard</SelectItem>
                  <SelectItem value="Amex">American Express</SelectItem>
                  <SelectItem value="Other">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-expiry-month">Mes *</Label>
              <Select value={cardForm.expiry_month} onValueChange={(value) => setCardForm(prev => ({ ...prev, expiry_month: value }))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                      {month.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-expiry-year">Año *</Label>
              <Select value={cardForm.expiry_year} onValueChange={(value) => setCardForm(prev => ({ ...prev, expiry_year: value }))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="YYYY" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 min-h-[44px] p-3 rounded-xl bg-landing-mint/5 border border-landing-mint/20">
            <Checkbox
              id="card-default"
              checked={cardForm.is_default}
              onCheckedChange={(checked) => setCardForm(prev => ({ ...prev, is_default: checked as boolean }))}
            />
            <Label htmlFor="card-default" className="cursor-pointer text-sm leading-snug">
              Establecer como tarjeta predeterminada
            </Label>
          </div>

          <div className="bg-landing-aqua/10 border border-landing-aqua/20 p-3 rounded-xl">
            <p className="text-sm text-landing-aqua-dark">
              Tu información de pago está protegida. Solo almacenamos los últimos 4 dígitos de tu tarjeta.
            </p>
          </div>
        </form>
      </MobileFormDialog>
    </div>
  );
};

export default AddressesAndCardsTab;

