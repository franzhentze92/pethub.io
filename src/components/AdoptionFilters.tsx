import React, { useState } from 'react';
import { Filter, MapPin, Heart, PawPrint, Shield } from 'lucide-react';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingFeatureGradients } from '@/lib/landingTheme';

interface AdoptionFiltersProps {
  onFiltersChange: (filters: Record<string, unknown>) => void;
}

const emptyFilters = {
  species: '',
  size: '',
  age: '',
  breed: '',
  personality: '',
  gender: '',
  color: '',
  house_trained: '',
  spayed_neutered: '',
  special_needs: '',
  adoption_fee_max: '',
  distance: 10,
  shelter: '',
  location: '',
};

const inputClass =
  'w-full min-h-[44px] px-3 py-2 text-sm border border-landing-aqua/20 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-landing-aqua/30 focus:border-landing-aqua/40';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

const SectionHeader = ({
  icon: Icon,
  title,
  gradientIndex,
}: {
  icon: React.ElementType;
  title: string;
  gradientIndex: number;
}) => {
  const gradient = landingFeatureGradients[gradientIndex % landingFeatureGradients.length];
  return (
    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
      <span className={`w-7 h-7 rounded-lg bg-gradient-to-r ${gradient} flex items-center justify-center shrink-0`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </span>
      {title}
    </h4>
  );
};

const AdoptionFilters: React.FC<AdoptionFiltersProps> = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState(emptyFilters);

  const updateFilter = (key: string, value: unknown) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <MobileSectionCard className="overflow-hidden">
      <div className="p-4 border-b border-landing-aqua/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-r from-landing-aqua to-landing-mint flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4 text-white" />
          </span>
          <h3 className="text-base font-bold text-gray-900 truncate">Filtros de búsqueda</h3>
        </div>
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-sm text-landing-aqua-dark hover:text-landing-aqua font-medium shrink-0"
        >
          Limpiar
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <SectionHeader icon={PawPrint} title="Información básica" gradientIndex={0} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Especie</label>
              <select
                value={filters.species}
                onChange={(e) => updateFilter('species', e.target.value)}
                className={inputClass}
              >
                <option value="">Todas las especies</option>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="conejo">Conejo</option>
                <option value="ave">Ave</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Tamaño</label>
              <select
                value={filters.size}
                onChange={(e) => updateFilter('size', e.target.value)}
                className={inputClass}
              >
                <option value="">Todos los tamaños</option>
                <option value="pequeño">Pequeño</option>
                <option value="mediano">Mediano</option>
                <option value="grande">Grande</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Edad</label>
              <select
                value={filters.age}
                onChange={(e) => updateFilter('age', e.target.value)}
                className={inputClass}
              >
                <option value="">Todas las edades</option>
                <option value="cachorro">Cachorro (0-1 año)</option>
                <option value="joven">Joven (1-3 años)</option>
                <option value="adulto">Adulto (3-7 años)</option>
                <option value="senior">Senior (7+ años)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Género</label>
              <select
                value={filters.gender}
                onChange={(e) => updateFilter('gender', e.target.value)}
                className={inputClass}
              >
                <option value="">Cualquier género</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader icon={Heart} title="Apariencia y raza" gradientIndex={1} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Raza</label>
              <input
                type="text"
                value={filters.breed}
                onChange={(e) => updateFilter('breed', e.target.value)}
                placeholder="Ej: Labrador, Persa..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Color</label>
              <select
                value={filters.color}
                onChange={(e) => updateFilter('color', e.target.value)}
                className={inputClass}
              >
                <option value="">Todos los colores</option>
                <option value="negro">Negro</option>
                <option value="blanco">Blanco</option>
                <option value="marrón">Marrón</option>
                <option value="gris">Gris</option>
                <option value="dorado">Dorado</option>
                <option value="atigrado">Atigrado</option>
                <option value="multicolor">Multicolor</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Personalidad</label>
              <select
                value={filters.personality}
                onChange={(e) => updateFilter('personality', e.target.value)}
                className={inputClass}
              >
                <option value="">Todas las personalidades</option>
                <option value="jugueton">Juguetón</option>
                <option value="tranquilo">Tranquilo</option>
                <option value="protector">Protector</option>
                <option value="carinhoso">Cariñoso</option>
                <option value="energico">Energético</option>
                <option value="independiente">Independiente</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader icon={Shield} title="Salud y cuidados" gradientIndex={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Entrenado en casa</label>
              <select
                value={filters.house_trained}
                onChange={(e) => updateFilter('house_trained', e.target.value)}
                className={inputClass}
              >
                <option value="">Cualquier estado</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Esterilizado/Castrado</label>
              <select
                value={filters.spayed_neutered}
                onChange={(e) => updateFilter('spayed_neutered', e.target.value)}
                className={inputClass}
              >
                <option value="">Cualquier estado</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Necesidades especiales</label>
              <select
                value={filters.special_needs}
                onChange={(e) => updateFilter('special_needs', e.target.value)}
                className={inputClass}
              >
                <option value="">Cualquier estado</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader icon={MapPin} title="Ubicación y costo" gradientIndex={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ubicación</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="Ej: Ciudad, Estado..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Costo máximo de adopción</label>
              <select
                value={filters.adoption_fee_max}
                onChange={(e) => updateFilter('adoption_fee_max', e.target.value)}
                className={inputClass}
              >
                <option value="">Sin límite</option>
                <option value="0">Gratis</option>
                <option value="50">Hasta $50</option>
                <option value="100">Hasta $100</option>
                <option value="200">Hasta $200</option>
                <option value="500">Hasta $500</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Distancia máxima: <span className="text-landing-aqua-dark font-semibold">{filters.distance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={filters.distance}
                onChange={(e) => updateFilter('distance', parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-landing-aqua bg-landing-aqua/15"
              />
            </div>
          </div>
        </div>
      </div>
    </MobileSectionCard>
  );
};

export default AdoptionFilters;
