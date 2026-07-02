-- Add adoption_application_id column to chat_rooms table for adoption chat functionality
-- This allows chat rooms to be linked to adoption applications

-- First, make breeding_match_id nullable if it's not already
-- This allows chat rooms to exist for adoption applications without requiring breeding_match_id
DO $$ 
BEGIN
    -- Check if breeding_match_id is NOT NULL and make it nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_rooms' 
        AND column_name = 'breeding_match_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.chat_rooms 
        ALTER COLUMN breeding_match_id DROP NOT NULL;
    END IF;
END $$;

-- Add the adoption_application_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_rooms' 
        AND column_name = 'adoption_application_id'
    ) THEN
        ALTER TABLE public.chat_rooms 
        ADD COLUMN adoption_application_id UUID REFERENCES public.adoption_applications(id) ON DELETE CASCADE;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_adoption_application_id 
        ON public.chat_rooms(adoption_application_id);
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN public.chat_rooms.adoption_application_id IS 'Links chat room to an adoption application';

-- Add a check constraint to ensure at least one of breeding_match_id or adoption_application_id is set
-- This ensures data integrity while allowing flexibility
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chat_rooms_match_or_application_check'
    ) THEN
        ALTER TABLE public.chat_rooms 
        DROP CONSTRAINT chat_rooms_match_or_application_check;
    END IF;
    
    -- Add the constraint
    ALTER TABLE public.chat_rooms 
    ADD CONSTRAINT chat_rooms_match_or_application_check 
    CHECK (
        (breeding_match_id IS NOT NULL AND adoption_application_id IS NULL) OR
        (breeding_match_id IS NULL AND adoption_application_id IS NOT NULL)
    );
END $$;

-- RLS Policies for chat_rooms with adoption_application_id
-- Allow users to read chat rooms where they are owner1 or owner2
DROP POLICY IF EXISTS "Users can read adoption chat rooms they are part of" ON public.chat_rooms;
CREATE POLICY "Users can read adoption chat rooms they are part of"
    ON public.chat_rooms
    FOR SELECT
    USING (
        auth.uid() = owner1_id OR 
        auth.uid() = owner2_id OR
        EXISTS (
            SELECT 1 FROM public.adoption_applications aa
            INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
            WHERE aa.id = chat_rooms.adoption_application_id
            AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
        )
    );

-- Allow users to create chat rooms for adoption applications they are part of
DROP POLICY IF EXISTS "Users can create adoption chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can create adoption chat rooms"
    ON public.chat_rooms
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.adoption_applications aa
            WHERE aa.id = adoption_application_id
            AND (
                aa.applicant_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.adoption_pets ap
                    WHERE ap.id = aa.pet_id
                    AND ap.owner_id = auth.uid()
                )
            )
        )
        AND (owner1_id = auth.uid() OR owner2_id = auth.uid())
    );

-- Allow users to update chat rooms they are part of (for last_message updates, etc.)
DROP POLICY IF EXISTS "Users can update adoption chat rooms they are part of" ON public.chat_rooms;
CREATE POLICY "Users can update adoption chat rooms they are part of"
    ON public.chat_rooms
    FOR UPDATE
    USING (
        auth.uid() = owner1_id OR 
        auth.uid() = owner2_id
    );

-- RLS Policies for chat_messages
-- Allow users to read messages from chat rooms they are part of
DROP POLICY IF EXISTS "Users can read adoption chat messages" ON public.chat_messages;
CREATE POLICY "Users can read adoption chat messages"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms cr
            WHERE cr.id = chat_messages.chat_room_id
            AND (
                cr.owner1_id = auth.uid() OR 
                cr.owner2_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.adoption_applications aa
                    INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
                    WHERE aa.id = cr.adoption_application_id
                    AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
                )
            )
        )
    );

-- Allow users to insert messages in chat rooms they are part of
DROP POLICY IF EXISTS "Users can send adoption chat messages" ON public.chat_messages;
CREATE POLICY "Users can send adoption chat messages"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.chat_rooms cr
            WHERE cr.id = chat_messages.chat_room_id
            AND (
                cr.owner1_id = auth.uid() OR 
                cr.owner2_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.adoption_applications aa
                    INNER JOIN public.adoption_pets ap ON ap.id = aa.pet_id
                    WHERE aa.id = cr.adoption_application_id
                    AND (aa.applicant_id = auth.uid() OR ap.owner_id = auth.uid())
                )
            )
        )
    );

-- Allow users to update their own messages (for read receipts, etc.)
DROP POLICY IF EXISTS "Users can update their own adoption chat messages" ON public.chat_messages;
CREATE POLICY "Users can update their own adoption chat messages"
    ON public.chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid());

