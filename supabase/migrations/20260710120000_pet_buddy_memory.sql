-- PetBuddy long-term memory: facts and conversation summaries

CREATE TABLE IF NOT EXISTS public.pet_buddy_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  fact_text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_buddy_facts_category_check
    CHECK (category IN ('general', 'allergy', 'preference', 'medical', 'behavior', 'note'))
);

CREATE INDEX IF NOT EXISTS idx_pet_buddy_facts_user
  ON public.pet_buddy_facts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_buddy_facts_pet
  ON public.pet_buddy_facts (pet_id)
  WHERE pet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pet_buddy_summaries (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_text text NOT NULL DEFAULT '',
  message_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_buddy_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_buddy_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pet buddy facts" ON public.pet_buddy_facts;
CREATE POLICY "Users manage own pet buddy facts"
  ON public.pet_buddy_facts
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Users manage own pet buddy summaries" ON public.pet_buddy_summaries;
CREATE POLICY "Users manage own pet buddy summaries"
  ON public.pet_buddy_summaries
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());
