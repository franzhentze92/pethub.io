export interface DogWalkPetRef {
  id: string;
  name: string;
  breed?: string | null;
  image_url?: string | null;
  pet_images?: unknown;
}

export interface DogWalkRequestPetRow {
  pet?: DogWalkPetRef | null;
}

export interface DogWalkRequestWithPets {
  pet?: DogWalkPetRef | null;
  request_pets?: DogWalkRequestPetRow[] | null;
}

export function getDogWalkRequestPets(request: DogWalkRequestWithPets): DogWalkPetRef[] {
  const fromJunction = (request.request_pets ?? [])
    .map((row) => row.pet)
    .filter((pet): pet is DogWalkPetRef => Boolean(pet?.id));

  if (fromJunction.length > 0) return fromJunction;
  if (request.pet?.id) return [request.pet];
  return [];
}

export function formatDogWalkPetNames(pets: DogWalkPetRef[]): string {
  if (pets.length === 0) return 'tu mascota';
  if (pets.length === 1) return pets[0].name;
  if (pets.length === 2) return `${pets[0].name} y ${pets[1].name}`;
  return `${pets.slice(0, -1).map((p) => p.name).join(', ')} y ${pets[pets.length - 1].name}`;
}
