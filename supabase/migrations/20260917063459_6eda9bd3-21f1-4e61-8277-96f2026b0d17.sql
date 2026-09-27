CREATE TABLE public.status_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (status_id, viewer_id)
);

GRANT SELECT, INSERT ON public.status_views TO authenticated;
GRANT ALL ON public.status_views TO service_role;

ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own status views"
ON public.status_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Users can read their own status views"
ON public.status_views FOR SELECT TO authenticated
USING (viewer_id = auth.uid());

CREATE POLICY "Status owners can see viewers"
ON public.status_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.statuses s
  WHERE s.id = status_views.status_id AND s.user_id = auth.uid()
));

CREATE INDEX idx_status_views_viewer ON public.status_views (viewer_id);
CREATE INDEX idx_status_views_status ON public.status_views (status_id);