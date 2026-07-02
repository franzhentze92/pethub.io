import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { stylizePetImage, getStylizedStyleFromUrl, type PetAvatarStyle } from '@/lib/stylizePet';

interface PetAvatarStylizerProps {
  sourceImageUrl: string | null;
  onPrimarySelect: (url: string) => void;
  onStylizedImageCreated?: (url: string) => void;
  existingStylizedUrls?: Partial<Record<Exclude<PetAvatarStyle, 'original'>, string>>;
  species?: string;
  breed?: string;
  name?: string;
  disabled?: boolean;
}

const avatarOptions: {
  id: PetAvatarStyle;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { id: 'original', label: 'Original', emoji: '📷', description: 'Tu foto tal cual' },
  { id: 'monster90s', label: 'Monstruo 90s', emoji: '⚡', description: 'Estilo criatura coleccionable' },
  { id: 'digital', label: 'Monstruo Digital', emoji: '💾', description: 'Estilo monstruo anime' },
];

const PetAvatarStylizer: React.FC<PetAvatarStylizerProps> = ({
  sourceImageUrl,
  onPrimarySelect,
  onStylizedImageCreated,
  existingStylizedUrls,
  species,
  breed,
  name,
  disabled = false,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<PetAvatarStyle>('original');
  const [stylizedUrls, setStylizedUrls] = useState<
    Partial<Record<Exclude<PetAvatarStyle, 'original'>, string>>
  >(existingStylizedUrls ?? {});
  const [stylizing, setStylizing] = useState<Exclude<PetAvatarStyle, 'original'> | null>(null);

  useEffect(() => {
    setSelectedAvatar('original');
    setStylizedUrls(existingStylizedUrls ?? {});
    setStylizing(null);
  }, [sourceImageUrl, existingStylizedUrls]);

  const applySelection = (style: PetAvatarStyle) => {
    if (!sourceImageUrl) return;
    const url =
      style === 'original' ? sourceImageUrl : stylizedUrls[style] ?? sourceImageUrl;
    onPrimarySelect(url);
  };

  const handleStylize = async (style: Exclude<PetAvatarStyle, 'original'>) => {
    if (!sourceImageUrl || stylizing || disabled) return;

    if (stylizedUrls[style]) {
      setSelectedAvatar(style);
      applySelection(style);
      return;
    }

    setStylizing(style);
    try {
      const result = await stylizePetImage({
        imageUrl: sourceImageUrl,
        style,
        species,
        breed: breed || undefined,
        name: name || undefined,
      });

      if (!result.stylizedUrl) {
        throw new Error('No se recibió la imagen estilizada');
      }

      setStylizedUrls((prev) => ({ ...prev, [style]: result.stylizedUrl }));
      onStylizedImageCreated?.(result.stylizedUrl);
      setSelectedAvatar(style);
      onPrimarySelect(result.stylizedUrl);
    } catch (error) {
      console.error('Error stylizing image:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el avatar estilizado. Inténtalo de nuevo.',
      );
    } finally {
      setStylizing(null);
    }
  };

  if (!sourceImageUrl) return null;

  const previews = [
    { id: 'original' as const, label: 'Original', url: sourceImageUrl },
    { id: 'monster90s' as const, label: 'Monstruo 90s', url: stylizedUrls.monster90s },
    { id: 'digital' as const, label: 'Monstruo Digital', url: stylizedUrls.digital },
  ].filter((p) => p.url);

  return (
    <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <Wand2 className="w-4 h-4 text-purple-600" />
        Avatar nostálgico
      </div>
      <p className="text-xs text-gray-500">
        Transforma la foto principal en un estilo retro de los 90s o 2000s.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {avatarOptions.map((option) => {
          const isSelected = selectedAvatar === option.id;
          const isLoading = stylizing === option.id;
          const isStylizedOption = option.id !== 'original';
          const hasStylized = isStylizedOption && !!stylizedUrls[option.id];

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (option.id === 'original') {
                  setSelectedAvatar('original');
                  applySelection('original');
                  return;
                }
                void handleStylize(option.id);
              }}
              disabled={disabled || (!!stylizing && stylizing !== option.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-purple-500 bg-white shadow-sm'
                  : 'border-gray-200 bg-white/80 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{option.emoji}</span>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                {hasStylized && !isLoading && (
                  <span className="text-[10px] uppercase tracking-wide text-green-600 font-semibold">
                    Listo
                  </span>
                )}
              </div>
              <div className="font-medium text-sm text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
            </button>
          );
        })}
      </div>

      {stylizing && (
        <p className="text-sm text-purple-700 bg-white rounded-lg p-2.5 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Creando avatar nostálgico... puede tardar 10–30 segundos.
        </p>
      )}

      {previews.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview) => (
            <button
              key={preview.id}
              type="button"
              onClick={() => {
                setSelectedAvatar(preview.id);
                applySelection(preview.id);
              }}
              disabled={disabled}
              className={`rounded-lg overflow-hidden border-2 transition-all ${
                selectedAvatar === preview.id ? 'border-purple-500' : 'border-transparent'
              }`}
            >
              <img
                src={preview.url}
                alt={preview.label}
                className="w-full aspect-square object-cover"
              />
              <div className="text-[10px] font-medium text-center py-1.5 bg-white">{preview.label}</div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-purple-700 flex items-start gap-1.5">
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        La versión seleccionada será la foto principal. Todas las fotos (originales y estilizadas) se guardan en la galería.
      </p>
    </div>
  );
};

export default PetAvatarStylizer;
