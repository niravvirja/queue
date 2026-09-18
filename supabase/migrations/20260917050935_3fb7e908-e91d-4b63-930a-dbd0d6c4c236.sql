ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages (conversation_id, created_at, id);
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON public.messages (reply_to_id);

CREATE TABLE IF NOT EXISTS public.message_hides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.message_hides TO authenticated;
GRANT ALL ON public.message_hides TO service_role;
ALTER TABLE public.message_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own hides" ON public.message_hides;
CREATE POLICY "read own hides" ON public.message_hides FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "create own hides" ON public.message_hides;
CREATE POLICY "create own hides" ON public.message_hides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "delete own hides" ON public.message_hides;
CREATE POLICY "delete own hides" ON public.message_hides FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.message_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.message_pins TO authenticated;
GRANT ALL ON public.message_pins TO service_role;
ALTER TABLE public.message_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own pins" ON public.message_pins;
CREATE POLICY "read own pins" ON public.message_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "create own pins" ON public.message_pins;
CREATE POLICY "create own pins" ON public.message_pins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "delete own pins" ON public.message_pins;
CREATE POLICY "delete own pins" ON public.message_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS message_pins_user_conv_idx ON public.message_pins (user_id, conversation_id, created_at);
CREATE INDEX IF NOT EXISTS message_hides_user_conv_idx ON public.message_hides (user_id, conversation_id);

DROP POLICY IF EXISTS "sender updates own messages" ON public.messages;
CREATE POLICY "sender updates own messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.conversation_id <> OLD.conversation_id
     OR NEW.sender_id <> OLD.sender_id
     OR NEW.created_at <> OLD.created_at
     OR NEW.kind <> OLD.kind
     OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id THEN
    RAISE EXCEPTION 'Only message content may be edited';
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'A deleted message cannot be restored';
  END IF;

  IF OLD.deleted_at IS NOT NULL
     AND (NEW.ciphertext <> OLD.ciphertext OR NEW.iv <> OLD.iv) THEN
    RAISE EXCEPTION 'A deleted message cannot be edited';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_messages_guard_update ON public.messages;
CREATE TRIGGER t_messages_guard_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_pins;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_hides;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;