import { supabase } from '@/lib/supabase';

export const MAX_PET_IMAGES = 10;

export interface PetImageRow {
  image_url: string;
  display_order?: number | null;
}

export interface PetWithImages {
  image_url?: string | null;
  pet_images?: PetImageRow[] | null;
}

export interface LostPetWithImages extends PetWithImages {
  pet_id?: string | null;
  source_pet?: PetWithImages | null;
}

export function getPetImageUrls(pet: PetWithImages | null | undefined): string[] {
  if (!pet) return [];

  const fromRelation = (pet.pet_images ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((img) => img.image_url)
    .filter(Boolean);

  const unique = [...new Set(fromRelation)];
  if (unique.length > 0) return unique.slice(0, MAX_PET_IMAGES);
  if (pet.image_url) return [pet.image_url];
  return [];
}

export function getPrimaryPetImageUrl(pet: PetWithImages | null | undefined): string | null {
  return getPetImageUrls(pet)[0] ?? null;
}

export function buildPetGalleryUrls(imageUrls: string[], primaryUrl?: string | null): string[] {
  const unique = [...new Set(imageUrls.filter(Boolean))];
  const primary = primaryUrl ?? unique[0] ?? null;
  if (!primary) return [];
  return [primary, ...unique.filter((url) => url !== primary)].slice(0, MAX_PET_IMAGES);
}

export function getStylizeSourceUrl(imageUrls: string[]): string | null {
  return imageUrls.find((url) => !/\/stylized-/i.test(url)) ?? imageUrls[0] ?? null;
}

/** Prefer live images from the linked pet profile when available. */
export function getLostPetImageUrls(lostPet: LostPetWithImages | null | undefined): string[] {
  if (!lostPet) return [];

  const sourceUrls = lostPet.source_pet ? getPetImageUrls(lostPet.source_pet) : [];
  if (sourceUrls.length > 0) return sourceUrls;

  return getPetImageUrls(lostPet);
}

export function getPrimaryLostPetImageUrl(lostPet: LostPetWithImages | null | undefined): string | null {
  return getLostPetImageUrls(lostPet)[0] ?? null;
}

export async function fetchPetImageUrls(petId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('pet_images')
    .select('image_url, display_order')
    .eq('pet_id', petId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.image_url).slice(0, MAX_PET_IMAGES);
}

export async function syncPetImages(petId: string, imageUrls: string[]): Promise<void> {
  const urls = imageUrls.filter(Boolean).slice(0, MAX_PET_IMAGES);

  const { error: deleteError } = await supabase.from('pet_images').delete().eq('pet_id', petId);
  if (deleteError) throw deleteError;

  if (urls.length > 0) {
    const { error: insertError } = await supabase.from('pet_images').insert(
      urls.map((url, index) => ({
        pet_id: petId,
        image_url: url,
        display_order: index,
      }))
    );
    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from('pets')
    .update({ image_url: urls[0] ?? null })
    .eq('id', petId);

  if (updateError) throw updateError;

  await syncActiveLostPetImages(petId, urls);
}

export async function syncLostPetImagesFromPet(petId: string, lostPetId: string): Promise<void> {
  const urls = await fetchPetImageUrls(petId);

  const { error: deleteError } = await supabase.from('pet_images').delete().eq('lost_pet_id', lostPetId);
  if (deleteError) throw deleteError;

  if (urls.length > 0) {
    const { error: insertError } = await supabase.from('pet_images').insert(
      urls.map((url, index) => ({
        lost_pet_id: lostPetId,
        image_url: url,
        display_order: index,
      }))
    );
    if (insertError) throw insertError;

    await supabase.from('lost_pets').update({ image_url: urls[0] }).eq('id', lostPetId);
  } else {
    await supabase.from('lost_pets').update({ image_url: null }).eq('id', lostPetId);
  }
}

async function syncActiveLostPetImages(petId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const { data: activeReports, error } = await supabase
    .from('lost_pets')
    .select('id')
    .eq('pet_id', petId)
    .eq('status', 'lost');

  if (error) {
    console.error('Error fetching active lost pet reports:', error);
    return;
  }

  await Promise.all(
    (activeReports ?? []).map((report) => syncLostPetImagesFromPet(petId, report.id))
  );
}

export async function copyPetImagesToLostPet(petId: string, lostPetId: string): Promise<void> {
  await syncLostPetImagesFromPet(petId, lostPetId);
}

export async function syncAdoptionPetImagesFromPet(petId: string, adoptionPetId: string): Promise<void> {
  const urls = await fetchPetImageUrls(petId);

  const { error: deleteError } = await supabase.from('pet_images').delete().eq('adoption_pet_id', adoptionPetId);
  if (deleteError) throw deleteError;

  if (urls.length > 0) {
    const { error: insertError } = await supabase.from('pet_images').insert(
      urls.map((url, index) => ({
        adoption_pet_id: adoptionPetId,
        image_url: url,
        display_order: index,
      }))
    );
    if (insertError) throw insertError;

    await supabase.from('adoption_pets').update({ image_url: urls[0] }).eq('id', adoptionPetId);
  } else {
    await supabase.from('adoption_pets').update({ image_url: null }).eq('id', adoptionPetId);
  }
}

export async function copyPetImagesToAdoptionPet(petId: string, adoptionPetId: string): Promise<void> {
  await syncAdoptionPetImagesFromPet(petId, adoptionPetId);
}
