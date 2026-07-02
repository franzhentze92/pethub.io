import React, { useState } from 'react';
import { Filter, Search, PawPrint } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSectionCard } from './mobile/MobileUi';

interface BreedingFiltersProps {
  onFiltersChange: (filters: Record<string, string>) => void;
  availableBreeds?: string[];
}

const emptyFilters = {
  search: '',
  species: 'all',
  breed: 'all',
  gender: 'all',
  age: 'all',
};

const inputClass = 'min-h-[44px] border-landing-aqua/20';
const labelClass = 'text-sm font-medium text-gray-700 mb-1.5';

const BreedingFilters: React.FC<BreedingFiltersProps> = ({ onFiltersChange, availableBreeds = [] }) => {
  const [filters, setFilters] = useState(emptyFilters);

  const updateFilter = (key: string, value: string) => {
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

      <div className="p-4 space-y-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <PawPrint className="w-4 h-4 text-landing-aqua-dark" />
          Información básica
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label htmlFor="breeding-search" className={labelClass}>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="breeding-search"
                placeholder="Nombre o raza..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className={`pl-10 ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="breeding-species" className={labelClass}>Especie</Label>
            <Select value={filters.species} onValueChange={(value) => updateFilter('species', value)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Perro">Perro</SelectItem>
                <SelectItem value="Gato">Gato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="breeding-breed" className={labelClass}>Raza</Label>
            <Select value={filters.breed} onValueChange={(value) => updateFilter('breed', value)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {availableBreeds.map((breed) => (
                  <SelectItem key={breed} value={breed}>{breed}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="breeding-gender" className={labelClass}>Género</Label>
            <Select value={filters.gender} onValueChange={(value) => updateFilter('gender', value)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="macho">Macho</SelectItem>
                <SelectItem value="hembra">Hembra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="breeding-age" className={labelClass}>Edad</Label>
            <Select value={filters.age} onValueChange={(value) => updateFilter('age', value)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="young">Joven (≤2 años)</SelectItem>
                <SelectItem value="adult">Adulto (3-6 años)</SelectItem>
                <SelectItem value="senior">Senior (&gt;6 años)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </MobileSectionCard>
  );
};

export default BreedingFilters;
