/** Combina imagen principal + secundarias para galerías del marketplace */
export function getCatalogImageUrls(
  mainImage?: string | null,
  secondaryImages?: string[] | null,
): string[] {
  const urls = [mainImage, ...(secondaryImages || [])].filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );
  return [...new Set(urls)];
}
