CREATE OR REPLACE FUNCTION public.sync_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.provider_id, OLD.provider_id);

  UPDATE public.providers
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.provider_reviews
      WHERE provider_id = pid
    ), 0),
    total_reviews = (
      SELECT COUNT(*)::int
      FROM public.provider_reviews
      WHERE provider_id = pid
    ),
    updated_at = NOW()
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS provider_reviews_sync_rating ON public.provider_reviews;

CREATE TRIGGER provider_reviews_sync_rating
AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_rating();
