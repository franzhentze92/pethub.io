-- PetBuddy chat persistence (cross-device sync)

CREATE TABLE IF NOT EXISTS public.pet_buddy_conversations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_buddy_conversations_updated
  ON public.pet_buddy_conversations (updated_at DESC);

ALTER TABLE public.pet_buddy_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pet buddy conversations" ON public.pet_buddy_conversations;
CREATE POLICY "Users manage own pet buddy conversations"
  ON public.pet_buddy_conversations
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());
