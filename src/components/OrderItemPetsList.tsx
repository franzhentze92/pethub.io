import React from 'react';
import { PawPrint, Scale } from 'lucide-react';
import type { OrderItemPet } from '@/utils/orderItemPets';
import { formatSpeciesLabel } from '@/utils/petLabels';

interface OrderItemPetsListProps {
  pets: OrderItemPet[];
  label?: string;
  className?: string;
  compact?: boolean;
  detailed?: boolean;
}

function formatWeight(weight: OrderItemPet['weight']) {
  if (weight == null || weight === '') return null;
  const n = Number(weight);
  if (Number.isNaN(n)) return String(weight);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kg`;
}

const OrderItemPetsList: React.FC<OrderItemPetsListProps> = ({
  pets,
  label = 'Mascota',
  className,
  compact = false,
  detailed = false,
}) => {
  if (!pets.length) return null;

  if (detailed) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {pets.length === 1 ? label : `${label}s`}
        </p>
        {pets.map((pet) => (
          <div
            key={pet.id}
            className="flex gap-3 p-3 rounded-xl bg-landing-mint/15 border border-landing-mint/30"
          >
            {pet.image_url ? (
              <img
                src={pet.image_url}
                alt={pet.name}
                className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-landing-aqua/15 flex items-center justify-center shrink-0">
                <PawPrint className="w-6 h-6 text-landing-aqua-dark" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{pet.name}</p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                {pet.species && (
                  <p>
                    <span className="text-gray-400">Especie:</span> {formatSpeciesLabel(pet.species)}
                  </p>
                )}
                {pet.breed && (
                  <p>
                    <span className="text-gray-400">Raza:</span> {pet.breed}
                  </p>
                )}
                {formatWeight(pet.weight) && (
                  <p className="flex items-center gap-1">
                    <Scale className="w-3 h-3 text-gray-400" />
                    <span>{formatWeight(pet.weight)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {!compact && (
        <p className="text-xs font-medium text-gray-500">
          {pets.length === 1 ? label : `${label}s`}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {pets.map((pet) => (
          <span
            key={pet.id}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-landing-mint/25 text-landing-aqua-dark text-xs font-medium"
          >
            {pet.image_url ? (
              <img
                src={pet.image_url}
                alt={pet.name}
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <PawPrint className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{pet.name}</span>
            {(pet.species || pet.breed) && (
              <span className="text-gray-500 font-normal">
                ({[formatSpeciesLabel(pet.species), pet.breed].filter(Boolean).join(' · ')})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default OrderItemPetsList;
