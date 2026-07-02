import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Info, Image as ImageIcon, Tag, Scale, Ruler, Loader2, Sparkles, Apple } from 'lucide-react';
import { ProviderProduct } from '@/hooks/useProvider';
import { ProductMultipleImagesUpload } from './ProductMultipleImagesUpload';
import { generateCatalogImage } from '@/lib/generateCatalogImage';
import { useToast } from '@/hooks/use-toast';
import { getPricingConfig, hasSizePricing, type PricingSystem } from '@/config/productPricing';
import {
  categorySupportsLifeStage,
  getSubtypeFieldLabel,
  getSubtypeOptionsForCategory,
  LIFE_STAGE_OPTIONS,
  PET_SPECIES_OPTIONS,
} from '@/config/productFilters';
import {
  categoryRequiresNutritionProfile,
  categoryRequiresIngredients,
  parseOptionalCalories,
  parseOptionalNutritionPct,
} from '@/config/productNutrition';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { ActionConfirmDialog } from '@/components/ui/ActionConfirmDialog';

const modalTabListClass =
  'grid w-full bg-landing-aqua/10 p-1 rounded-xl border border-landing-aqua/15 h-auto gap-1';
const modalTabTriggerClass =
  'rounded-lg text-gray-600 data-[state=active]:bg-white data-[state=active]:text-landing-aqua-dark data-[state=active]:shadow-sm py-2.5';
const modalInfoBannerClass =
  'rounded-xl border border-landing-aqua/20 bg-gradient-to-br from-landing-aqua/10 to-landing-mint/10 p-4';
const modalSectionCardClass =
  'rounded-xl border border-landing-aqua/15 bg-white/80 shadow-sm';
const modalOutlineBtnClass =
  'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10';

interface ProviderProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  product?: ProviderProduct | null;
  isEditing?: boolean;
  initialDraft?: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'> | null;
}

const PRODUCT_CATEGORIES = [
  { value: 'alimentos', label: 'Alimentos', icon: '🍖' },
  { value: 'juguetes', label: 'Juguetes', icon: '🎾' },
  { value: 'accesorios', label: 'Accesorios', icon: '🦮' },
  { value: 'higiene', label: 'Higiene', icon: '🧴' },
  { value: 'medicamentos', label: 'Medicamentos', icon: '💊' },
  { value: 'ropa', label: 'Ropa', icon: '👕' },
  { value: 'camas', label: 'Camas y Descanso', icon: '🛏️' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'otro', label: 'Otro', icon: '🔧' }
];

const ProviderProductModal: React.FC<ProviderProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  isEditing = false,
  initialDraft = null,
}) => {
  
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    product_name: '',
    product_category: '',
    description: '',
    detailed_description: '',
    price: '', // Precio general (para retrocompatibilidad)
    price_small: '', // Precio para perros pequeños
    price_medium: '', // Precio para perros medianos
    price_large: '', // Precio para perros grandes
    price_extra_large: '', // Precio para perros extra grandes
    price_xs: '', // Precio talla XS (ropa)
    price_s: '', // Precio talla S (ropa)
    price_m: '', // Precio talla M (ropa)
    price_l: '', // Precio talla L (ropa)
    price_xl: '', // Precio talla XL (ropa)
    price_xxl: '', // Precio talla XXL (ropa)
    currency: 'GTQ',
    stock_quantity: '',
    min_stock_alert: '5',
    is_active: true,
    product_image_url: '',
    secondary_images: [] as string[],
    brand: '',
    weight_kg: '',
    dimensions_cm: '',
    tags: [] as string[],
    target_species: ['todos'] as string[],
    product_subtype: '',
    life_stage: '',
    subscription_enabled: false,
    ingredients: '',
    nutrition_protein_pct: '',
    nutrition_fat_pct: '',
    nutrition_fiber_pct: '',
    nutrition_moisture_pct: '',
    nutrition_ash_pct: '',
    nutrition_calories_per_100g: '',
  });

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingProductData, setPendingProductData] = useState<Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'> | null>(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (product && isEditing) {
      setFormData({
        product_name: product.product_name,
        product_category: product.product_category,
        description: product.description || '',
        detailed_description: product.detailed_description || '',
        price: product.price?.toString() || '',
        price_small: (product as any).price_small?.toString() || '',
        price_medium: (product as any).price_medium?.toString() || '',
        price_large: (product as any).price_large?.toString() || '',
        price_extra_large: (product as any).price_extra_large?.toString() || '',
        price_xs: (product as any).price_xs?.toString() || '',
        price_s: (product as any).price_s?.toString() || '',
        price_m: (product as any).price_m?.toString() || '',
        price_l: (product as any).price_l?.toString() || '',
        price_xl: (product as any).price_xl?.toString() || '',
        price_xxl: (product as any).price_xxl?.toString() || '',
        currency: product.currency || 'GTQ',
        stock_quantity: product.stock_quantity.toString(),
        min_stock_alert: product.min_stock_alert?.toString() || '5',
        is_active: product.is_active,
        product_image_url: product.product_image_url || '',
        secondary_images: (product as any).secondary_images || [],
        brand: product.brand || '',
        weight_kg: product.weight_kg?.toString() || '',
        dimensions_cm: product.dimensions_cm || '',
        tags: product.tags || [],
        target_species: product.target_species?.length ? product.target_species : ['todos'],
        product_subtype: product.product_subtype || '',
        life_stage: product.life_stage || '',
        subscription_enabled: product.subscription_enabled ?? false,
        ingredients: product.ingredients || '',
        nutrition_protein_pct: product.nutrition_protein_pct?.toString() || '',
        nutrition_fat_pct: product.nutrition_fat_pct?.toString() || '',
        nutrition_fiber_pct: product.nutrition_fiber_pct?.toString() || '',
        nutrition_moisture_pct: product.nutrition_moisture_pct?.toString() || '',
        nutrition_ash_pct: product.nutrition_ash_pct?.toString() || '',
        nutrition_calories_per_100g: product.nutrition_calories_per_100g?.toString() || '',
      });
    } else if (initialDraft && isOpen) {
      setFormData({
        product_name: initialDraft.product_name,
        product_category: initialDraft.product_category,
        description: initialDraft.description || '',
        detailed_description: initialDraft.detailed_description || '',
        price: initialDraft.price?.toString() || '',
        price_small: '',
        price_medium: '',
        price_large: '',
        price_extra_large: '',
        price_xs: '',
        price_s: '',
        price_m: '',
        price_l: '',
        price_xl: '',
        price_xxl: '',
        currency: initialDraft.currency || 'GTQ',
        stock_quantity: initialDraft.stock_quantity?.toString() || '0',
        min_stock_alert: initialDraft.min_stock_alert?.toString() || '5',
        is_active: initialDraft.is_active ?? true,
        product_image_url: initialDraft.product_image_url || '',
        secondary_images: initialDraft.secondary_images || [],
        brand: initialDraft.brand || '',
        weight_kg: initialDraft.weight_kg?.toString() || '',
        dimensions_cm: initialDraft.dimensions_cm || '',
        tags: initialDraft.tags || [],
        target_species: initialDraft.target_species?.length ? initialDraft.target_species : ['todos'],
        product_subtype: initialDraft.product_subtype || '',
        life_stage: initialDraft.life_stage || '',
        subscription_enabled: initialDraft.subscription_enabled ?? false,
        ingredients: initialDraft.ingredients || '',
        nutrition_protein_pct: initialDraft.nutrition_protein_pct?.toString() || '',
        nutrition_fat_pct: initialDraft.nutrition_fat_pct?.toString() || '',
        nutrition_fiber_pct: initialDraft.nutrition_fiber_pct?.toString() || '',
        nutrition_moisture_pct: initialDraft.nutrition_moisture_pct?.toString() || '',
        nutrition_ash_pct: initialDraft.nutrition_ash_pct?.toString() || '',
        nutrition_calories_per_100g: initialDraft.nutrition_calories_per_100g?.toString() || '',
      });
    } else {
      setFormData({
        product_name: '',
        product_category: '',
        description: '',
        detailed_description: '',
        price: '',
        price_small: '',
        price_medium: '',
        price_large: '',
        price_extra_large: '',
        price_xs: '',
        price_s: '',
        price_m: '',
        price_l: '',
        price_xl: '',
        price_xxl: '',
        currency: 'GTQ',
        stock_quantity: '',
        min_stock_alert: '5',
        is_active: true,
        product_image_url: '',
        secondary_images: [],
        brand: '',
        weight_kg: '',
        dimensions_cm: '',
        tags: [],
        target_species: ['todos'],
        product_subtype: '',
        life_stage: '',
        subscription_enabled: false,
        ingredients: '',
        nutrition_protein_pct: '',
        nutrition_fat_pct: '',
        nutrition_fiber_pct: '',
        nutrition_moisture_pct: '',
        nutrition_ash_pct: '',
        nutrition_calories_per_100g: '',
      });
    }
  }, [product, isEditing, initialDraft, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Form submission started');
    setLoading(true);

    try {
      // Validate required fields
      console.log('🔍 Validating form data:', formData);
      if (!formData.product_name.trim()) {
        throw new Error('El nombre del producto es obligatorio');
      }
      if (!formData.product_category) {
        throw new Error('La categoría del producto es obligatoria');
      }
      if (!formData.target_species.length) {
        throw new Error('Selecciona al menos una mascota para este producto');
      }
      // Validar que al menos un precio esté definido
      // Verificar precios por tamaño independientemente de la configuración de categoría
      // Esto permite flexibilidad para productos que tienen precios por tamaño aunque su categoría esté configurada como "single"
      const hasGeneralPrice = formData.price && parseFloat(formData.price) > 0;
      
      // Verificar precios por tamaño de perro
      const hasDogSizePrices = !!(
        (formData.price_small && parseFloat(formData.price_small) > 0) ||
        (formData.price_medium && parseFloat(formData.price_medium) > 0) ||
        (formData.price_large && parseFloat(formData.price_large) > 0) ||
        (formData.price_extra_large && parseFloat(formData.price_extra_large) > 0)
      );
      
      // Verificar precios por talla de ropa
      const hasClothingSizePrices = !!(
        (formData.price_xs && parseFloat(formData.price_xs) > 0) ||
        (formData.price_s && parseFloat(formData.price_s) > 0) ||
        (formData.price_m && parseFloat(formData.price_m) > 0) ||
        (formData.price_l && parseFloat(formData.price_l) > 0) ||
        (formData.price_xl && parseFloat(formData.price_xl) > 0) ||
        (formData.price_xxl && parseFloat(formData.price_xxl) > 0)
      );
      
      const hasAnyPrice = hasGeneralPrice || hasDogSizePrices || hasClothingSizePrices;
      
      if (!hasAnyPrice) {
        throw new Error('Debes definir al menos un precio para el producto (precio general o precio por tamaño/talla)');
      }
      if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
        throw new Error('La cantidad en stock debe ser 0 o mayor');
      }
      if (
        categoryRequiresIngredients(formData.product_category) &&
        !formData.ingredients.trim()
      ) {
        throw new Error('Los alimentos deben incluir la lista de ingredientes (pestaña Nutrición)');
      }

      // Save the product
      const productData = {
        product_name: formData.product_name,
        product_category: formData.product_category,
        description: formData.description,
        detailed_description: formData.detailed_description,
        price: parseFloat(formData.price) || 0, // Precio general (para retrocompatibilidad)
        price_small: formData.price_small ? parseFloat(formData.price_small) : null,
        price_medium: formData.price_medium ? parseFloat(formData.price_medium) : null,
        price_large: formData.price_large ? parseFloat(formData.price_large) : null,
        price_extra_large: formData.price_extra_large ? parseFloat(formData.price_extra_large) : null,
        price_xs: formData.price_xs ? parseFloat(formData.price_xs) : null,
        price_s: formData.price_s ? parseFloat(formData.price_s) : null,
        price_m: formData.price_m ? parseFloat(formData.price_m) : null,
        price_l: formData.price_l ? parseFloat(formData.price_l) : null,
        price_xl: formData.price_xl ? parseFloat(formData.price_xl) : null,
        price_xxl: formData.price_xxl ? parseFloat(formData.price_xxl) : null,
        currency: formData.currency,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_alert: parseInt(formData.min_stock_alert) || 5,
        is_active: formData.is_active,
        product_image_url: formData.product_image_url,
        secondary_images: formData.secondary_images,
        brand: formData.brand,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        dimensions_cm: formData.dimensions_cm,
        tags: formData.tags,
        target_species: formData.target_species,
        product_subtype: formData.product_subtype || null,
        life_stage: formData.life_stage || null,
        subscription_enabled: formData.subscription_enabled,
        ingredients: formData.ingredients.trim() || null,
        nutrition_protein_pct: parseOptionalNutritionPct(formData.nutrition_protein_pct),
        nutrition_fat_pct: parseOptionalNutritionPct(formData.nutrition_fat_pct),
        nutrition_fiber_pct: parseOptionalNutritionPct(formData.nutrition_fiber_pct),
        nutrition_moisture_pct: parseOptionalNutritionPct(formData.nutrition_moisture_pct),
        nutrition_ash_pct: parseOptionalNutritionPct(formData.nutrition_ash_pct),
        nutrition_calories_per_100g: parseOptionalCalories(formData.nutrition_calories_per_100g),
      };
      
      setPendingProductData(productData);
      setShowSaveConfirm(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmSave = async () => {
    if (!pendingProductData) return;
    setShowSaveConfirm(false);
    setLoading(true);
    try {
      await onSave(pendingProductData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
      setPendingProductData(null);
    }
  };

  const handleGenerateProductImage = async () => {
    if (!product?.id) {
      toast({
        title: 'Guarda el producto primero',
        description: 'La imagen con IA se puede generar después de crear el producto.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const result = await generateCatalogImage({
        type: 'product',
        id: product.id,
        force: Boolean(formData.product_image_url),
      });

      if (result.imageUrl) {
        handleInputChange('product_image_url', result.imageUrl);
        toast({
          title: result.skipped ? 'Ya tenía imagen' : 'Imagen generada',
          description: result.skipped
            ? 'Este producto ya tenía una imagen principal.'
            : `Se creó una imagen para "${result.name ?? formData.product_name}".`,
        });
      }
    } catch (error) {
      toast({
        title: 'No se pudo generar la imagen',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleTargetSpecies = (species: string) => {
    setFormData((prev) => {
      if (species === 'todos') {
        return { ...prev, target_species: ['todos'] };
      }

      const withoutTodos = prev.target_species.filter((item) => item !== 'todos');
      const next = withoutTodos.includes(species)
        ? withoutTodos.filter((item) => item !== species)
        : [...withoutTodos, species];

      return { ...prev, target_species: next.length > 0 ? next : ['todos'] };
    });
  };

  const subtypeOptions = getSubtypeOptionsForCategory(formData.product_category);
  const subtypeLabel = getSubtypeFieldLabel(formData.product_category);
  const showLifeStage = categorySupportsLifeStage(formData.product_category);
  const showNutritionTab = categoryRequiresNutritionProfile(formData.product_category);

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0"
        aria-describedby="product-modal-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-landing-aqua/10 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
          <DialogTitle className="text-xl flex items-center gap-2 text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-md">
              <Package className="w-5 h-5" />
            </span>
            {isEditing ? 'Editar Producto' : 'Agregar Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5" id="product-modal-description">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(modalTabListClass, showNutritionTab ? 'grid-cols-4' : 'grid-cols-3')}>
              <TabsTrigger value="basic" className={modalTabTriggerClass}>
                Información Básica
              </TabsTrigger>
              <TabsTrigger value="details" className={modalTabTriggerClass}>
                Detalles
              </TabsTrigger>
              {showNutritionTab && (
                <TabsTrigger value="nutrition" className={modalTabTriggerClass}>
                  Nutrición
                </TabsTrigger>
              )}
              <TabsTrigger value="inventory" className={modalTabTriggerClass}>
                Inventario
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-name">Nombre del Producto *</Label>
                  <Input
                    id="product-name"
                    value={formData.product_name}
                    onChange={(e) => handleInputChange('product_name', e.target.value)}
                    placeholder="Ej: Collar Antipulgas Premium"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="product-category">Categoría *</Label>
                  <Select
                    value={formData.product_category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        product_category: value,
                        product_subtype: '',
                        life_stage: '',
                        subscription_enabled: value === 'alimentos' ? true : prev.subscription_enabled,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {PRODUCT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={cn(modalSectionCardClass, 'p-4 space-y-3')}>
                <Label className="text-base font-semibold text-gray-900">¿Para qué mascota es? *</Label>
                <p className="text-sm text-gray-600">
                  Esto alimenta el filtro de marketplace. Si aplica a todas, elige &quot;Todas las mascotas&quot;.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PET_SPECIES_OPTIONS.map((species) => {
                    const selected = formData.target_species.includes(species.value);
                    return (
                      <button
                        key={species.value}
                        type="button"
                        onClick={() => toggleTargetSpecies(species.value)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                          selected
                            ? 'bg-landing-aqua/15 border-landing-aqua/40 text-landing-aqua-dark'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-landing-aqua/30',
                        )}
                      >
                        {species.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(subtypeOptions.length > 0 || showLifeStage) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subtypeOptions.length > 0 && subtypeLabel && (
                    <div>
                      <Label>{subtypeLabel}</Label>
                      <Select
                        value={formData.product_subtype || 'none'}
                        onValueChange={(value) =>
                          handleInputChange('product_subtype', value === 'none' ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar subtipo" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="none">Sin especificar</SelectItem>
                          {subtypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {showLifeStage && (
                    <div>
                      <Label>Etapa de vida</Label>
                      <Select
                        value={formData.life_stage || 'none'}
                        onValueChange={(value) =>
                          handleInputChange('life_stage', value === 'none' ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar etapa" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="none">Sin especificar</SelectItem>
                          {LIFE_STAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="product-description">Descripción Corta *</Label>
                <Textarea
                  id="product-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción breve del producto..."
                  rows={2}
                  required
                />
              </div>

              {/* Precio General */}
              <div className={cn(modalSectionCardClass, 'p-4 space-y-3')}>
                <Label className="text-base font-semibold flex items-center gap-2 text-gray-900">
                  <DollarSign className="w-4 h-4 text-landing-aqua-dark" />
                  Precio General (Opcional)
                </Label>
                <p className="text-sm text-gray-600">Usa este campo si el producto no requiere diferenciación por tamaño de perro.</p>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {formData.currency === 'GTQ' ? 'Q.' : '$'}
                  </span>
                  <Input
                    id="price-general"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Precios por tamaño de perro */}
              <div className={cn(modalSectionCardClass, 'p-4 space-y-3')}>
                <Label className="text-base font-semibold flex items-center gap-2 text-gray-900">
                  <Scale className="w-4 h-4 text-landing-aqua-dark" />
                  Precios por Tamaño de Perro (Opcional)
                </Label>
                <p className="text-sm text-gray-600">O establece el precio para cada tamaño según el peso del perro. Si no aplica, déjalo vacío.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="price-small">
                      Pequeño (Q.)
                      <span className="block text-xs font-normal text-gray-500 mt-1">Hasta 10 kg</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Q.</span>
                      <Input
                        id="price-small"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_small}
                        onChange={(e) => handleInputChange('price_small', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price-medium">
                      Mediano (Q.)
                      <span className="block text-xs font-normal text-gray-500 mt-1">11 - 25 kg</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Q.</span>
                      <Input
                        id="price-medium"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_medium}
                        onChange={(e) => handleInputChange('price_medium', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price-large">
                      Grande (Q.)
                      <span className="block text-xs font-normal text-gray-500 mt-1">26 - 45 kg</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Q.</span>
                      <Input
                        id="price-large"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_large}
                        onChange={(e) => handleInputChange('price_large', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price-extra-large">
                      Extra Grande (Q.)
                      <span className="block text-xs font-normal text-gray-500 mt-1">Más de 45 kg</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Q.</span>
                      <Input
                        id="price-extra-large"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_extra_large}
                        onChange={(e) => handleInputChange('price_extra_large', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-brand">Marca</Label>
                  <Input
                    id="product-brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Ej: Royal Canin"
                  />
                </div>

                <div>
                  <Label htmlFor="product-currency">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="GTQ">GTQ - Quetzales</SelectItem>
                      <SelectItem value="USD">USD - Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-xl border border-landing-mint/20 bg-landing-mint/5 px-4 py-3">
                <Switch
                  id="product-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="product-active" className="text-landing-mint-dark font-medium">
                  Producto activo en el marketplace
                </Label>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div>
                <Label htmlFor="product-detailed-description">Descripción Detallada</Label>
                <Textarea
                  id="product-detailed-description"
                  value={formData.detailed_description}
                  onChange={(e) => handleInputChange('detailed_description', e.target.value)}
                  placeholder="Describe el producto en detalle, incluyendo características, beneficios, ingredientes, etc..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta información será visible para los clientes al ver el producto
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-weight">Peso (kg)</Label>
                  <div className="relative">
                    <Input
                      id="product-weight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.weight_kg}
                      onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                      placeholder="0.500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">kg</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="product-dimensions">Dimensiones (cm)</Label>
                  <Input
                    id="product-dimensions"
                    value={formData.dimensions_cm}
                    onChange={(e) => handleInputChange('dimensions_cm', e.target.value)}
                    placeholder="Ej: 20x15x10"
                  />
                </div>
              </div>

              <div className={cn(modalSectionCardClass, 'p-4 space-y-4')}>
                <div className="flex items-center justify-between gap-2 text-landing-aqua-dark">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    <Label htmlFor="product-images" className="text-base font-semibold">
                      Imágenes del Producto
                    </Label>
                  </div>
                  {isEditing && product?.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={modalOutlineBtnClass}
                      disabled={loading || generatingImage}
                      onClick={handleGenerateProductImage}
                    >
                      {generatingImage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {formData.product_image_url ? 'Regenerar con IA' : 'Generar con IA'}
                    </Button>
                  )}
                </div>
                <ProductMultipleImagesUpload
                  mainImageUrl={formData.product_image_url}
                  secondaryImages={formData.secondary_images}
                  onMainImageUpload={(url) => handleInputChange('product_image_url', url || '')}
                  onSecondaryImagesChange={(urls) => handleInputChange('secondary_images', urls)}
                  disabled={loading || generatingImage}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sube una imagen principal y hasta 5 imágenes secundarias del producto
                </p>
              </div>

              <div className={cn(modalSectionCardClass, 'p-4 space-y-3')}>
                <Label htmlFor="product-tags" className="flex items-center gap-2 text-base font-semibold">
                  <Tag className="w-4 h-4 text-landing-aqua-dark" />
                  Etiquetas
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="product-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Agregar etiqueta y presionar Enter"
                    />
                    <Button type="button" variant="outline" onClick={addTag} className={modalOutlineBtnClass}>
                      Agregar
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="flex items-center gap-1 border-landing-aqua/25 bg-landing-aqua/5 text-landing-aqua-dark"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-landing-aqua-dark/70 hover:text-landing-aqua-dark"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Etiquetas para ayudar a los clientes a encontrar el producto
                </p>
              </div>
            </TabsContent>

            {showNutritionTab && (
              <TabsContent value="nutrition" className="space-y-4">
                <div className={modalInfoBannerClass}>
                  <div className="flex items-center gap-2 text-landing-aqua-dark">
                    <Apple className="w-5 h-5" />
                    <span className="font-medium">Perfil nutricional para PetBuddy</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    Estos datos permiten que el asistente recomiende tu producto según déficits de grasa,
                    proteína u omega. Copia el análisis garantizado de la etiqueta cuando puedas.
                  </p>
                </div>

                <div>
                  <Label htmlFor="product-ingredients">
                    Ingredientes {categoryRequiresIngredients(formData.product_category) ? '*' : '(recomendado)'}
                  </Label>
                  <Textarea
                    id="product-ingredients"
                    value={formData.ingredients}
                    onChange={(e) => handleInputChange('ingredients', e.target.value)}
                    placeholder="Ej: Pollo deshidratado, arroz, gluten de maíz, grasa de pollo, pulpa de remolacha, aceite de pescado (omega 3)..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separa con comas. Incluye fuentes de grasa/proteína y suplementos (omega 3, zinc, etc.).
                  </p>
                </div>

                <div className={cn(modalSectionCardClass, 'p-4 space-y-3')}>
                  <Label className="text-base font-semibold text-gray-900">
                    Análisis garantizado (% en alimento tal como se vende)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="nutrition-protein">Proteína cruda %</Label>
                      <Input
                        id="nutrition-protein"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.nutrition_protein_pct}
                        onChange={(e) => handleInputChange('nutrition_protein_pct', e.target.value)}
                        placeholder="23"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutrition-fat">Grasa cruda %</Label>
                      <Input
                        id="nutrition-fat"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.nutrition_fat_pct}
                        onChange={(e) => handleInputChange('nutrition_fat_pct', e.target.value)}
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutrition-fiber">Fibra cruda %</Label>
                      <Input
                        id="nutrition-fiber"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.nutrition_fiber_pct}
                        onChange={(e) => handleInputChange('nutrition_fiber_pct', e.target.value)}
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutrition-moisture">Humedad %</Label>
                      <Input
                        id="nutrition-moisture"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.nutrition_moisture_pct}
                        onChange={(e) => handleInputChange('nutrition_moisture_pct', e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutrition-ash">Cenizas %</Label>
                      <Input
                        id="nutrition-ash"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.nutrition_ash_pct}
                        onChange={(e) => handleInputChange('nutrition_ash_pct', e.target.value)}
                        placeholder="7"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutrition-calories">Energía (kcal/100g)</Label>
                      <Input
                        id="nutrition-calories"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.nutrition_calories_per_100g}
                        onChange={(e) => handleInputChange('nutrition_calories_per_100g', e.target.value)}
                        placeholder="380"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              <div className={modalInfoBannerClass}>
                <div className="flex items-center gap-2 text-landing-aqua-dark">
                  <Info className="w-5 h-5" />
                  <span className="font-medium">Gestión de Inventario</span>
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  Controla el stock disponible y configura alertas para mantener un inventario saludable.
                </p>
              </div>

              <Card className={cn(modalSectionCardClass, 'border-0 shadow-none')}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="w-5 h-5 text-landing-aqua-dark" />
                    Control de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product-stock">Cantidad en Stock *</Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                        placeholder="0"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cantidad disponible para la venta
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="product-min-stock">Alerta de Stock Mínimo</Label>
                      <Input
                        id="product-min-stock"
                        type="number"
                        min="0"
                        value={formData.min_stock_alert}
                        onChange={(e) => handleInputChange('min_stock_alert', e.target.value)}
                        placeholder="5"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recibirás alertas cuando el stock baje de este número
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-landing-aqua/20 bg-landing-aqua/5 p-4">
                    <div>
                      <Label htmlFor="subscription-enabled" className="text-sm font-medium text-gray-900">
                        Permitir suscripción
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Los clientes podrán recibir este producto de forma recurrente y pagar en cada entrega.
                      </p>
                    </div>
                    <Switch
                      id="subscription-enabled"
                      checked={formData.subscription_enabled}
                      onCheckedChange={(checked) => handleInputChange('subscription_enabled', checked)}
                    />
                  </div>

                  <div className="rounded-xl border border-landing-mango/25 bg-gradient-to-br from-landing-mango/10 to-landing-tropical/10 p-4">
                    <div className="flex items-center gap-2 text-landing-mango-dark">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">Estado del Inventario</span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {parseInt(formData.stock_quantity) === 0 ? (
                        <p className="text-red-600 font-medium">Sin stock — producto no disponible</p>
                      ) : parseInt(formData.stock_quantity) <= parseInt(formData.min_stock_alert) ? (
                        <p className="text-landing-mango-dark font-medium">Stock bajo — considera reabastecer</p>
                      ) : (
                        <p className="text-landing-mint-dark font-medium">Stock saludable</p>
                      )}
                      <p className="text-gray-600">
                        Stock actual: <span className="font-medium">{formData.stock_quantity || 0}</span> unidades
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="-mx-6 -mb-5 mt-2 px-6 py-4 border-t border-landing-aqua/10 bg-gray-50/80 sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={modalOutlineBtnClass}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} data-blueprint-guided="save-product" className={cn(landingBtnPrimary, 'border-0 min-w-[160px]')}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Actualizar Producto' : 'Crear Producto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ActionConfirmDialog
      open={showSaveConfirm}
      onOpenChange={setShowSaveConfirm}
      title={isEditing ? 'Confirmar actualización de producto' : 'Confirmar creación de producto'}
      description="Revisa los datos del producto antes de guardar."
      confirmLabel={isEditing ? 'Actualizar' : 'Crear producto'}
      fields={
        pendingProductData
          ? [
              { label: 'Nombre', value: pendingProductData.product_name },
              { label: 'Categoría', value: pendingProductData.product_category },
              { label: 'Precio', value: `Q${pendingProductData.price}` },
              { label: 'Stock', value: String(pendingProductData.stock_quantity) },
              ...(pendingProductData.brand ? [{ label: 'Marca', value: pendingProductData.brand }] : []),
              { label: 'Activo', value: pendingProductData.is_active ? 'Sí' : 'No' },
              { label: 'Suscripción', value: pendingProductData.subscription_enabled ? 'Habilitada' : 'No' },
            ]
          : []
      }
      onConfirm={confirmSave}
      loading={loading}
      onEdit={() => setShowSaveConfirm(false)}
    />
    </>
  );
};

export default ProviderProductModal;
