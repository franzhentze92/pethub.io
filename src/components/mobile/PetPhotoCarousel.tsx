import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { getPetImageUrls, type PetWithImages } from '@/utils/petImages';

type PetPhotoFit = 'cover' | 'contain' | 'blur-fill';

interface PetPhotoCarouselProps {
  pet?: PetWithImages | null;
  images?: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  imageFit?: PetPhotoFit;
  fallback?: React.ReactNode;
  showDots?: boolean;
  showCounter?: boolean;
  showArrows?: boolean;
  setApi?: (api: CarouselApi) => void;
}

const PetCarouselSlide = ({
  src,
  alt,
  imageFit,
  imageClassName,
  loading,
}: {
  src: string;
  alt: string;
  imageFit: PetPhotoFit;
  imageClassName?: string;
  loading?: 'lazy' | 'eager';
}) => {
  if (imageFit === 'blur-fill') {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-100">
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-[0.85] saturate-125"
          loading={loading}
        />
        <img
          src={src}
          alt={alt}
          className={cn('relative z-10 w-full h-full object-contain', imageClassName)}
          loading={loading}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'w-full h-full select-none',
        imageClassName || (imageFit === 'contain' ? 'object-contain' : 'object-cover')
      )}
      loading={loading}
      draggable={false}
    />
  );
};

export const PetPhotoCarousel: React.FC<PetPhotoCarouselProps> = ({
  pet,
  images: imagesProp,
  alt,
  className,
  imageClassName,
  aspectClassName = 'aspect-[4/3]',
  imageFit = 'cover',
  fallback,
  showDots = true,
  showCounter = true,
  showArrows = false,
  setApi: setApiProp,
}) => {
  const images = imagesProp ?? getPetImageUrls(pet);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    setCurrent(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('select', onSelect);
    setApiProp?.(api);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect, setApiProp]);

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  if (images.length === 0) {
    return (
      <div className={cn('relative overflow-hidden bg-gray-100', aspectClassName, className)}>
        {fallback ?? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Sin foto
          </div>
        )}
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={cn('relative overflow-hidden', aspectClassName, className)}>
        <PetCarouselSlide
          src={images[0]}
          alt={alt}
          imageFit={imageFit}
          imageClassName={imageClassName}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClassName, className)}>
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: 'start' }}
        className="w-full h-full"
      >
        <div className="h-full overflow-hidden">
          <CarouselContent className="ml-0 h-full">
            {images.map((src, index) => (
              <CarouselItem key={`${src}-${index}`} className="pl-0 basis-full">
                <div className={cn('w-full h-full', aspectClassName, 'max-h-[inherit]')}>
                  <PetCarouselSlide
                    src={src}
                    alt={`${alt} ${index + 1}`}
                    imageFit={imageFit}
                    imageClassName={imageClassName}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center active:bg-black/60"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center active:bg-black/60"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {showCounter && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 pointer-events-none">
          {current + 1}/{images.length}
        </div>
      )}

      {showDots && (
        <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5 pointer-events-auto">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Foto ${index + 1}`}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                current === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PetPhotoThumbnailsProps {
  images: string[];
  current: number;
  onSelect: (index: number) => void;
  alt: string;
}

export const PetPhotoThumbnails: React.FC<PetPhotoThumbnailsProps> = ({
  images,
  current,
  onSelect,
  alt,
}) => {
  if (images.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {images.map((src, index) => (
        <button
          key={`${src}-${index}`}
          type="button"
          aria-label={`Ver foto ${index + 1}`}
          onClick={() => onSelect(index)}
          className={cn(
            'shrink-0 w-14 h-14 rounded-xl overflow-hidden ring-2 transition-all',
            current === index ? 'ring-landing-aqua scale-105' : 'ring-transparent opacity-70'
          )}
        >
          <img src={src} alt={`${alt} ${index + 1}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
};