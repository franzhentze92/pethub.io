export interface RatingSummary {
  average: number;
  count: number;
}

type CatalogReviewRow = {
  product_id?: string | null;
  service_id?: string | null;
  rating: number;
};

export function buildCatalogRatingMap(
  reviews: CatalogReviewRow[],
  kind: 'product' | 'service',
): Map<string, RatingSummary> {
  const idKey = kind === 'product' ? 'product_id' : 'service_id';
  const buckets = new Map<string, number[]>();

  for (const review of reviews) {
    const id = review[idKey];
    if (!id) continue;
    const list = buckets.get(id) ?? [];
    list.push(review.rating);
    buckets.set(id, list);
  }

  const result = new Map<string, RatingSummary>();
  buckets.forEach((ratings, id) => {
    const count = ratings.length;
    const average = ratings.reduce((sum, r) => sum + r, 0) / count;
    result.set(id, { average, count });
  });

  return result;
}

export function emptyRatingSummary(): RatingSummary {
  return { average: 0, count: 0 };
}
